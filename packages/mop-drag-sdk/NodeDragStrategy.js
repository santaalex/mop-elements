import { BaseStrategy } from '../BaseStrategy.js';
// SDK Internal Import
import { DragCore } from './DragCore.js';

/**
 * NodeDragStrategy (Optimized Delta/Direct-DOM Version)
 * 
 * FIXES:
 * 1. "Jump" on start: Uses Delta (Relative) movement instead of Absolute rect calculation.
 * 2. "Lag": Uses Direct DOM manipulation (style.left/top) bypassing React/Render cycles.
 * 3. Edge Reactivity: Physical movement triggers GetBoundingClientRect correctly.
 */
export class NodeDragStrategy extends BaseStrategy {
    constructor(manager) {
        super(manager);
        this.dragContext = null;
        // CRITICAL FIX: Use the same Single Source of Truth as the renderer
        // Old default lane gap was 20px, new is 6px. This was causing a 14px "jump".
        const config = window.LayoutConfig || {
            LANE_START_X: 100,
            LANE_START_Y: 100,
            LANE_GAP: 6,
            LANE_DEFAULT_HEIGHT: 220
        };
        this.core = new DragCore(config);
    }

    get name() { return 'node-drag'; }

    canHandle(event, target) {
        // Prevent conflict with Panning (Space)
        const isSpace = this.manager.editorView.viewport?.state?.isSpacePressed;

        // Target must be inside mop-node
        const nodeEl = target.closest('mop-node');

        // Ignore if clicking a Port (let ConnectionStrategy handle it)
        const isPort = target.classList.contains('port');

        return nodeEl && !isSpace && !isPort;
    }

    activate(event) {
        super.activate(event);

        // High-Star Best Practice: Robust Target Resolution (Phase 1)
        // 1. Try to use the Semantic Truth from InteractionManager
        let nodeId = event.semanticId;
        let nodeEl = null;

        if (nodeId && event.semanticType === 'node') {
            nodeEl = this.manager.editorView.container.querySelector(`mop-node[id="${nodeId}"]`);
        } else {
            // 2. Fallback: Manager ID (from pre-drag) or Event Target (should rarely happen now)
            nodeId = this.manager.currentDraggedNodeId;
            if (nodeId) {
                nodeEl = this.manager.editorView.container.querySelector(`mop-node[id="${nodeId}"]`);
            } else {
                nodeEl = event.target.closest('mop-node');
                if (nodeEl) nodeId = nodeEl.getAttribute('id');
            }
        }

        const editor = this.manager.editorView;
        const nodeData = editor.graphData.nodes.find(n => n.id === nodeId);

        if (!nodeData) return;

        // --- NEW: Sync Selection so Gizmo appears during drag ---
        if (!event.shiftKey) {
            // Single select: if clicking a node that isn't selected, make it the only selection.
            if (!editor.selection.has(nodeId)) {
                editor.selection.clear();
                editor.selection.add(nodeId);
            }
        } else {
            // Multi-select toggle
            if (!editor.selection.has(nodeId)) {
                editor.selection.add(nodeId);
            }
        }

        // Immediately update Gizmos so they "stick" to the node during drag
        if (editor.gizmoRenderer) {
            editor.gizmoRenderer.render(editor.selection);
        }

        // HIGH-STAR PRACTICE: Use "Delta" calculation.
        // Instead of trying to calculate "Where am I in the world" (Complex, prone to bugs),
        // we just calculate "How much did I move?" (Simple, Robust).

        // 1. Get Initial CSS Position (The Source of Truth for Layout)
        // We use computed style to get exact current pixels.
        const computedStyle = window.getComputedStyle(nodeEl);
        const startLeft = parseFloat(computedStyle.left) || 0;
        const startTop = parseFloat(computedStyle.top) || 0;

        console.log(`[NodeDrag] Start: ID=${nodeId} CSS=(${startLeft}, ${startTop})`);

        this.dragContext = {
            nodeId,
            nodeEl,
            nodeData,

            // Mouse Start (Screen Coordinates)
            screenStartX: event.clientX,
            screenStartY: event.clientY,

            // Node Start (CSS Coordinates)
            initialCssLeft: startLeft,
            initialCssTop: startTop,

            hasMoved: false // BEST PRACTICE: Track if real movement started
        };

        // UI Feedback: DELAYED! Don't add classes yet to keep click detection pure
        // nodeEl.style.transition = 'none'; 
        // nodeEl.style.zIndex = '1000';
    }

    onMove(event) {
        if (!this.dragContext) return;
        const ctx = this.dragContext;
        const viewport = this.manager.editorView.viewport;
        const scale = viewport.state.scale;

        // 1. Calculate Distance
        const dist = Math.hypot(event.clientX - ctx.screenStartX, event.clientY - ctx.screenStartY);

        // 2. Threshold Check: Only start visual movement after 5px
        if (!ctx.hasMoved && dist > 5) {
            ctx.hasMoved = true;
            ctx.nodeEl.style.transition = 'none';
            ctx.nodeEl.style.zIndex = '1000';
            ctx.nodeEl.classList.add('dragging-active');
            this.manager.currentDraggedNodeId = ctx.nodeId; // Start tracking for edges
            console.log('[NodeDrag] Movement threshold met, starting drag.');
        }

        if (ctx.hasMoved) {
            // 3. Calculate Delta
            const dx = event.clientX - ctx.screenStartX;
            const dy = event.clientY - ctx.screenStartY;

            const graphDx = dx / scale;
            const graphDy = dy / scale;

            // 4. Update DOM
            ctx.nodeEl.style.left = (ctx.initialCssLeft + graphDx) + 'px';
            ctx.nodeEl.style.top = (ctx.initialCssTop + graphDy) + 'px';
        }
    }

    onEnd(event) {
        if (!this.dragContext) return;
        const ctx = this.dragContext;
        const editor = this.manager.editorView;

        console.log('[NodeDrag] Ended.');

        // BEST PRACTICE: Only commit if we actually moved
        if (ctx.hasMoved) {
            // --- Drag Commit Logic ---
            const finalWorldX = parseFloat(ctx.nodeEl.style.left);
            const finalWorldY = parseFloat(ctx.nodeEl.style.top);

            // A. Detect Lane Change
            const newLaneId = this.core.detectLane(editor.graphData.lanes, finalWorldX, finalWorldY);
            if (newLaneId && newLaneId !== ctx.nodeData.laneId) {
                console.log('[NodeDrag] Lane Change:', ctx.nodeData.laneId, '->', newLaneId);
                ctx.nodeData.laneId = newLaneId;
            }

            // B. Update Data Model (Relative to Lane)
            const relativePos = this.core.toRelative(finalWorldX, finalWorldY, ctx.nodeData.laneId || 'default', editor.graphData.lanes);
            ctx.nodeData.x = relativePos.x;
            ctx.nodeData.y = relativePos.y;

            console.log('[NodeDrag] Data Saved:', { x: ctx.nodeData.x, y: ctx.nodeData.y });
        } else {
            // --- Click Logic ---
            // DO NOTHING! DO NOT RENDER!
            // This leaves the DOM intact so the browser can recognize the second click of a dblclick.
            console.log('[NodeDrag] Minimal movement, treating as purely intent-to-click.');
        }

        // Cleanup
        if (ctx.hasMoved) {
            ctx.nodeEl.classList.remove('dragging-active');
            ctx.nodeEl.style.zIndex = '';
            ctx.nodeEl.style.removeProperty('transition'); // Restore CSS transition
        }
        this.manager.currentDraggedNodeId = null;
        this.dragContext = null;
    }

    getElementWorldRect(el) {
        // Not used in "Delta" approach but kept for compatibility
        return el.getBoundingClientRect();
    }
}
