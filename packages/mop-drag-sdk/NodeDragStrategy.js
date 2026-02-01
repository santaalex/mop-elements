import { BaseStrategy } from 'https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/interactions/strategies/BaseStrategy.js';
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
        // Assumption: LayoutConfig is injected or global.
        const config = window.LayoutConfig || { LANE_START_X: 100, LANE_START_Y: 100, LANE_GAP: 20, LANE_DEFAULT_HEIGHT: 150 };
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
        const nodeEl = event.target.closest('mop-node');
        const editor = this.manager.editorView;
        const nodeId = nodeEl.getAttribute('id');
        const nodeData = editor.graphData.nodes.find(n => n.id === nodeId);

        if (!nodeData) return;

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
            initialCssTop: startTop
        };

        // UI Feedback
        nodeEl.style.transition = 'none'; // Disable transition for instant follow
        nodeEl.style.zIndex = '1000';     // Bring to front
        nodeEl.classList.add('dragging-active');

        // Capture for Edge Reactivity
        this.manager.currentDraggedNodeId = nodeId;
    }

    onMove(event) {
        if (!this.dragContext) return;
        const ctx = this.dragContext;
        const viewport = this.manager.editorView.viewport;
        const scale = viewport.state.scale;

        // 1. Calculate Delta (How much moved in SCREEN pixels)
        const dx = event.clientX - ctx.screenStartX;
        const dy = event.clientY - ctx.screenStartY;

        // 2. Convert to GRAPH pixels
        const graphDx = dx / scale;
        const graphDy = dy / scale;

        // 3. Apply to Initial Position
        const newLeft = ctx.initialCssLeft + graphDx;
        const newTop = ctx.initialCssTop + graphDy;

        // 4. Update DOM
        ctx.nodeEl.style.left = newLeft + 'px';
        ctx.nodeEl.style.top = newTop + 'px';

        // Note: InteractionManager.js handles calling editorView.updateConnectedEdges()
        // effectively creating the reactivity loop.
    }

    onEnd(event) {
        if (!this.dragContext) return;
        const ctx = this.dragContext;
        const editor = this.manager.editorView;

        console.log('[NodeDrag] Ended.');

        // Check Drag Distance (Threshold to distinguish Click vs Drag)
        const dist = Math.hypot(event.clientX - ctx.screenStartX, event.clientY - ctx.screenStartY);

        if (dist >= 5) {
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
            // Even if lane didn't change, X/Y relative to lane might have.
            const relativePos = this.core.toRelative(finalWorldX, finalWorldY, ctx.nodeData.laneId || 'default', editor.graphData.lanes);
            ctx.nodeData.x = relativePos.x;
            ctx.nodeData.y = relativePos.y;

            console.log('[NodeDrag] Data Saved:', { x: ctx.nodeData.x, y: ctx.nodeData.y });

            // C. Sync Graph
            // Optional: Full Render to align everything (Snap to grid if needed)
            // But since our DOM update was precise, this visual change should be minimal.
            // this.manager.editorView.renderer.render(this.manager.editorView.graphData); 
            // ^ Commented out to prevent "flicker". We trust our DOM update.

        } else {
            // --- Click Logic (Revert) ---
            console.log('[NodeDrag] Drag too short, reverting.');
            // Revert DOM to original data
            // Or just trigger render
            editor.renderer.render(editor.graphData);

            // If dragging failed, treat as Click (e.g. for Selection)
            // Note: SelectionStrategy usually handles this via precedence, 
            // but if NodeDrag consumed the event, we yield back?
            // Actually BaseStrategy handles precedence. Selection usually fires on MouseUp if no drag.
        }

        // Cleanup
        ctx.nodeEl.classList.remove('dragging-active');
        ctx.nodeEl.style.zIndex = '';
        this.manager.currentDraggedNodeId = null;
        this.dragContext = null;
    }

    getElementWorldRect(el) {
        // Not used in "Delta" approach but kept for compatibility
        return el.getBoundingClientRect();
    }
}
