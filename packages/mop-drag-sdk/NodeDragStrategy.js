import { BaseStrategy } from 'https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/interactions/strategies/BaseStrategy.js';
// SDK Internal Import
import { DragCore } from './DragCore.js';

export class NodeDragStrategy extends BaseStrategy {
    constructor(manager) {
        super(manager);
        this.dragContext = null;
        // Assumption: LayoutConfig is injected or global. 
        // For SDK, we might need to pass it in constructor or assume window.LayoutConfig
        // Fallback to default or window object
        const config = window.LayoutConfig || { LANE_START_X: 100, LANE_START_Y: 100, LANE_GAP: 20, LANE_DEFAULT_HEIGHT: 150 };
        this.core = new DragCore(config);
    }

    get name() { return 'node-drag'; }

    canHandle(event, target) {
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

        if (!nodeData) return;

        const mouseWorldPos = viewport.toWorld(event.clientX, event.clientY);
        const startRect = this.getElementWorldRect(nodeEl);
        
        console.log('[Step 1] MouseDown: Capturing Node. Visual(DOM):', { x: startRect.x, y: startRect.y });

        this.dragContext = {
            nodeId, nodeEl, nodeData,
            screenStartX: event.clientX, screenStartY: event.clientY,
            offsetX: mouseWorldPos.x - startRect.x,
            offsetY: mouseWorldPos.y - startRect.y
        };

        nodeEl.style.transition = 'none';
        nodeEl.style.zIndex = '1000';
        nodeEl.classList.add('dragging-active');
    }

    onMove(event) {
        if (!this.dragContext) return;
        const ctx = this.dragContext;
        const viewport = this.manager.editorView.viewport;
        const currentWorldPos = viewport.toWorld(event.clientX, event.clientY);

        const updatedWorldX = currentWorldPos.x - ctx.offsetX;
        const updatedWorldY = currentWorldPos.y - ctx.offsetY;

        ctx.nodeEl.style.left = updatedWorldX + 'px';
        ctx.nodeEl.style.top = updatedWorldY + 'px';
    }

    onEnd(event) {
        if (!this.dragContext) return;
        const ctx = this.dragContext;
        const editor = this.manager.editorView;

        console.log('[Step 5] MouseUp: Drag Ended.');
        const dist = Math.hypot(event.clientX - ctx.screenStartX, event.clientY - ctx.screenStartY);

        if (dist >= 15) {
            // Drag Logic
            const finalWorldX = parseFloat(ctx.nodeEl.style.left);
            const finalWorldY = parseFloat(ctx.nodeEl.style.top);
            
            const newLaneId = this.core.detectLane(editor.graphData.lanes, finalWorldX, finalWorldY);
            const parentLane = editor.graphData.lanes.find(l => l.id === (newLaneId || ctx.nodeData.laneId));
            
            if (newLaneId && newLaneId !== ctx.nodeData.laneId) {
                console.log('[Step 5-B] Changing Lane:', ctx.nodeData.laneId, '->', newLaneId);
                 ctx.nodeData.laneId = newLaneId;
            }
            
            // Calculate Relative
            const relativePos = this.core.toRelative(finalWorldX, finalWorldY, ctx.nodeData.laneId, editor.graphData.lanes);
            ctx.nodeData.x = relativePos.x;
            ctx.nodeData.y = relativePos.y;

            console.log('[Step 5-C] Data Saved:', { x: ctx.nodeData.x, y: ctx.nodeData.y });
            this.manager.editorView.renderer.render(this.manager.editorView.graphData);
        } else {
            // Click Logic
            console.log('[NodeDrag] Drag too short, reverting.');
            editor.renderer.render(editor.graphData); // Revert visual
            if (this.manager.strategies.connect) {
                this.manager.strategies.connect.handleClick(ctx.nodeId);
            }
        }

        ctx.nodeEl.classList.remove('dragging-active');
        ctx.nodeEl.style.zIndex = '';
        this.dragContext = null;
    }

    getElementWorldRect(el) {
        const sceneEl = document.getElementById('mop-scene');
        if (!sceneEl) return { x: 0, y: 0, w: 0, h: 0 };
        const rect = el.getBoundingClientRect();
        const sceneRect = sceneEl.getBoundingClientRect();
        const viewport = this.manager.editorView.viewport;
        const scale = viewport ? viewport.state.scale : 1;
        return {
            x: (rect.left - sceneRect.left) / scale,
            y: (rect.top - sceneRect.top) / scale,
            w: rect.width / scale,
            h: rect.height / scale
        };
    }
}
