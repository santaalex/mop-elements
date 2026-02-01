import { BaseStrategy } from './BaseStrategy.js';
import { LayoutConfig } from '../../LayoutConfig.js';
import { DragCore } from '../../packages/mop-drag-sdk/DragCore.js';

export class NodeDragStrategy extends BaseStrategy {
    constructor(manager) {
        super(manager);
        this.dragContext = null;
        this.core = new DragCore(LayoutConfig);
    }

    get name() {
        return 'node-drag';
    }

    canHandle(event, target) {
        // Only handle MOP-NODE and when Space is NOT pressed
        const isSpace = this.manager.editorView.viewport?.state?.isSpacePressed;
        const nodeEl = target.closest('mop-node');
        return nodeEl && !isSpace;
    }

    activate(event) {
        super.activate(event);
        const nodeEl = event.target.closest('mop-node');
        const editor = this.manager.editorView;
        const viewport = editor.viewport;

        const nodeId = nodeEl.getAttribute('id');
        const nodeData = editor.graphData.nodes.find(n => n.id === nodeId);

        if (!nodeData) {
            console.error('[NodeDrag] Node data not found:', nodeId);
            return;
        }

        const mouseWorldPos = viewport.toWorld(event.clientX, event.clientY);

        // Calculate Parent Offset (Lane)
        let parentX = 0;
        let parentY = 0;

        if (nodeData.laneId) {
            const parentLane = editor.graphData.lanes.find(l => l.id === nodeData.laneId);
            if (parentLane) {
                // SDK Call: Get Lane Top
                const laneTop = this.core.getLaneTop(editor.graphData.lanes, parentLane.id);
                parentX = parentLane.x || 100;
                parentY = laneTop;
            }
        }

        // FIX: Use DOM Visual Position as Truth to prevent "Jump" on start
        // Data might be slightly out of sync or rounded.
        const startRect = this.getElementWorldRect(nodeEl);
        const nodeWorldX = startRect.x;
        const nodeWorldY = startRect.y;

        // Step 1: Mouse Down (Activate)
        console.log('[Step 1] MouseDown: Capturing Node. Visual(DOM):', { x: nodeWorldX, y: nodeWorldY });

        this.dragContext = {
            nodeId,
            nodeEl,
            nodeData,
            startWorldX: nodeWorldX,
            startWorldY: nodeWorldY,
            parentX,
            parentY,
            mouseStartX: mouseWorldPos.x, // World Mouse
            mouseStartY: mouseWorldPos.y,
            screenStartX: event.clientX,
            screenStartY: event.clientY,
            // Offset between Mouse and Node TopLeft
            offsetX: mouseWorldPos.x - nodeWorldX,
            offsetY: mouseWorldPos.y - nodeWorldY
        };

        nodeEl.style.transition = 'none';
        nodeEl.style.zIndex = '1000';
        nodeEl.classList.add('dragging-active');

        console.log('[NodeDrag] Context Ready. Offset:', this.dragContext.offsetX, this.dragContext.offsetY);
    }

    onMove(event) {
        if (!this.dragContext) return;
        const ctx = this.dragContext;
        const viewport = this.manager.editorView.viewport;

        // Step 2: Capture Mouse Movement
        const currentWorldPos = viewport.toWorld(event.clientX, event.clientY);

        // Step 3: Calculate New World Position (NOT Data yet)
        const updatedWorldX = currentWorldPos.x - ctx.offsetX;
        const updatedWorldY = currentWorldPos.y - ctx.offsetY;

        // Step 4: Visual Update (Direct DOM Manipulation - "The Push")
        // Note: We log only occasionally to avoid crashing console, or if user asked for "Every Step", we log.
        // Given user request, we log.
        console.log('[Step 2/3/4] MouseMove -> VisualUpdate:', Math.round(updatedWorldX), Math.round(updatedWorldY));

        ctx.nodeEl.style.left = updatedWorldX + 'px';
        ctx.nodeEl.style.top = updatedWorldY + 'px';
    }

    onEnd(event) {
        if (!this.dragContext) return;
        const ctx = this.dragContext;
        const editor = this.manager.editorView;
        const viewport = editor.viewport;

        // Step 5: Mouse Up (Commit)
        console.log('[Step 5] MouseUp: Drag Ended.');

        // Calculate drag distance to distinguish Click vs Drag
        const dist = Math.hypot(event.clientX - ctx.screenStartX, event.clientY - ctx.screenStartY);

        if (dist >= 15) {
            // Drag Logic
            const finalWorldX = parseFloat(ctx.nodeEl.style.left);
            const finalWorldY = parseFloat(ctx.nodeEl.style.top);

            console.log('[Step 5-A] Committing Data. Final World:', finalWorldX, finalWorldY);

            // SDK Call: Detect Lane
            const newLaneId = this.core.detectLane(editor.graphData.lanes, finalWorldX, finalWorldY);

            if (newLaneId !== ctx.nodeData.laneId) {
                // Changing Lane
                console.log('[Step 5-B] Changing Lane:', ctx.nodeData.laneId, '->', newLaneId);

                // SDK Call: Calculate Relative
                const relativePos = this.core.toRelative(finalWorldX, finalWorldY, newLaneId, editor.graphData.lanes);

                ctx.nodeData.x = relativePos.x;
                ctx.nodeData.y = relativePos.y;
                ctx.nodeData.laneId = newLaneId;
            } else {
                // Same Lane
                console.log('[Step 5-B] Same Lane. Calculating Relative Pos.');

                // SDK Call: Calculate Relative (to existing lane)
                const relativePos = this.core.toRelative(finalWorldX, finalWorldY, ctx.nodeData.laneId, editor.graphData.lanes);

                ctx.nodeData.x = relativePos.x;
                ctx.nodeData.y = relativePos.y;
            }

            console.log('[Step 5-C] Data Saved:', { x: ctx.nodeData.x, y: ctx.nodeData.y });

            // Trigger Re-render (The "Painter")
            this.manager.editorView.renderer.render(this.manager.editorView.graphData);
        } else {
            console.log('[NodeDrag] Drag too short, treated as Click. Reverting visual.');
            editor.renderer.render(editor.graphData);

            // Forward to Connection Strategy if it exists
            // Ideally InteractionManager should handle this delegation, but for now direct call works.
            // Or we just return and let the user implement ConnectionStrategy separately.
            // For Phase 2, we just ensure Drag works. Connection will be Phase 3.
            // BUT, if we swallow the event here, Connection won't work if it relies on a separate Click listener?
            // InteractionManager captured mousedown. So no other click listener will fire.
            // WE MUST CALL CONNECTION LOGIC HERE.

            if (this.manager.strategies.connect) {
                this.manager.strategies.connect.handleClick(ctx.nodeId);
            }
        }

        // Cleanup
        ctx.nodeEl.classList.remove('dragging-active');
        ctx.nodeEl.style.zIndex = '';
        this.dragContext = null;
    }

    // --- Helper Methods ---

    // Note: Local layout helpers have been removed.
    // We now rely entirely on this.core (DragCore) for critical calculations.

    /**
     * Helper to get precise World Coordinates of an element
     * from EditorView (duplicated for independence/atomicity)
     */
    getElementWorldRect(el) {
        const sceneEl = document.getElementById('mop-scene');
        if (!sceneEl) return { x: 0, y: 0, w: 0, h: 0 };

        const rect = el.getBoundingClientRect();
        const sceneRect = sceneEl.getBoundingClientRect();

        // We need the scale from viewport to normalize
        const viewport = this.manager.editorView.viewport;
        const scale = viewport ? viewport.state.scale : 1;

        // Visual Position relative to Scene Container (0,0), normalized by scale
        return {
            x: (rect.left - sceneRect.left) / scale,
            y: (rect.top - sceneRect.top) / scale,
            w: rect.width / scale,
            h: rect.height / scale
        };
    }
}
