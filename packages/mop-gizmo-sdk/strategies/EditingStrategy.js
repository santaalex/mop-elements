import { BaseStrategy } from '../../BaseStrategy.js';

export class EditingStrategy extends BaseStrategy {
    constructor(manager) {
        super(manager);
        this.activeInput = null; // The textarea element
        this.activeNodeId = null;
    }

    get name() {
        return 'editing';
    }

    /**
     * Activate Editing Mode
     * @param {string|Object} payload - NodeId string OR { type: 'edge', id, t } OR { type: 'lane', id }
     */
    activate(payload) {
        if (!payload) return;

        const isEdge = typeof payload === 'object' && payload.type === 'edge';
        const isLane = typeof payload === 'object' && payload.type === 'lane';
        const targetId = (isEdge || isLane) ? payload.id : payload;

        console.log(`[EditingStrategy] Activating for ${isLane ? 'Lane' : (isEdge ? 'Edge' : 'Node')}:`, targetId);
        this.activeNodeId = targetId;
        this.activeType = isLane ? 'lane' : (isEdge ? 'edge' : 'node');
        this.activeT = isEdge ? payload.t : null;

        const editor = this.manager.editorView;

        // 1. Find the Element
        let query;
        if (isLane) query = `mop-lane[id="${targetId}"]`;
        else if (isEdge) query = `mop-edge[id="${targetId}"]`;
        else query = `mop-node[id="${targetId}"]`;

        const el = editor.container.querySelector(query);
        if (!el) {
            console.warn('[EditingStrategy] Target element not found:', query);
            return;
        }

        // 2. Determine Coordinates and Styles
        let x, y, width, height, color, fontSize, textAlign, writingMode = 'horizontal-tb', letterSpacing = 'normal';

        if (isLane) {
            const headerRect = el.getHeaderRect();
            // BUFFER FIX: Use the actual transform layer (viewport root) as the reference, not the outer container
            // This accounts for Pan (Translate) and global offset (Toolbar)
            const viewportRoot = document.getElementById('mop-viewport-root');
            const sceneRect = viewportRoot.getBoundingClientRect();
            const scale = editor.viewport.state.scale;

            // Coordinate transform: Screen to Scene
            x = (headerRect.left - sceneRect.left) / scale;
            y = (headerRect.top - sceneRect.top) / scale;
            width = headerRect.width / scale;
            height = headerRect.height / scale;

            color = el.getAttribute('color') || '#6366f1';
            fontSize = '14px';
            textAlign = 'center';
            writingMode = 'vertical-rl';
            letterSpacing = '4px';
        } else if (isEdge) {
            const center = el.getPathPoint(this.activeT);
            x = center.x;
            y = center.y;
            width = 120;
            height = 24;
            color = '#334155';
            fontSize = '12px';
            textAlign = 'center';
        } else {
            const computed = window.getComputedStyle(el);
            x = parseFloat(el.style.left);
            y = parseFloat(el.style.top);
            width = parseFloat(el.style.width);
            height = parseFloat(el.style.height);
            color = computed.color;
            fontSize = computed.fontSize;
            textAlign = computed.textAlign;
        }

        // 3. Create Phantom Textarea
        const input = document.createElement('textarea');
        this.activeInput = input;
        input.value = this.getLabel(targetId, this.activeType);

        // 4. Style Sync
        input.style.position = 'absolute';
        input.style.left = (isEdge || isLane) ? (x) + 'px' : x + 'px';
        if (isEdge) input.style.left = (x - width / 2) + 'px'; // Edge is centered

        input.style.top = isEdge ? (y - height / 2) + 'px' : y + 'px';
        input.style.width = width + 'px';
        input.style.height = height + 'px';

        input.style.fontFamily = "'Inter', sans-serif";
        input.style.fontSize = fontSize;
        input.style.textAlign = textAlign;
        input.style.color = color;
        input.style.padding = '4px';
        input.style.writingMode = writingMode;
        if (writingMode === 'vertical-rl') {
            input.style.textOrientation = 'upright';
            input.style.letterSpacing = letterSpacing;
            input.style.fontWeight = '700';
            input.style.paddingTop = '10px';
        }

        input.style.background = 'white';
        input.style.border = '2px solid #3b82f6';
        input.style.borderRadius = isEdge ? '12px' : '4px';
        input.style.zIndex = '3000';
        input.style.resize = 'none';
        input.style.overflow = 'hidden';
        input.style.outline = 'none';
        input.style.boxSizing = 'border-box';
        input.style.pointerEvents = 'auto'; // Critically important inside gizmoLayer

        const layer = document.getElementById('mop-gizmo-layer') || this.manager.container;
        if (layer) layer.appendChild(input);

        // Safety: Delay focus/blur binding to avoid immediate blur from pending events
        setTimeout(() => {
            input.focus();
            input.select();

            input.onblur = () => {
                console.log('[EditingStrategy] Input Blurred - Committing');
                this.commit();
            };

            input.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    console.log('[EditingStrategy] Enter Pressed');
                    this.commit();
                }
                if (e.key === 'Escape') {
                    console.log('[EditingStrategy] Escape Pressed');
                    this.cancel();
                }
                e.stopPropagation();
            };
        }, 10);
    }

    getLabel(id, type) {
        const editor = this.manager.editorView;
        if (type === 'lane') {
            const lane = editor.graphData.lanes.find(l => l.id === id);
            return lane ? (lane.name || '') : '';
        } else if (type === 'edge') {
            const edge = editor.graphData.edges.find(e => e.id === id);
            return edge ? (edge.label || '') : '';
        } else {
            const node = editor.graphData.nodes.find(n => n.id === id);
            return node ? (node.label || 'New Node') : '';
        }
    }

    commit() {
        if (!this.activeInput || !this.activeNodeId) return;
        const newValue = this.activeInput.value;
        const editor = this.manager.editorView;

        if (this.activeType === 'lane') {
            editor.updateLane(this.activeNodeId, { name: newValue });
        } else if (this.activeType === 'edge') {
            editor.updateEdge(this.activeNodeId, { label: newValue, labelT: this.activeT });
        } else {
            editor.updateNode(this.activeNodeId, { label: newValue });
        }

        this.cleanup();
    }

    cancel() {
        this.cleanup();
    }

    cleanup() {
        const input = this.activeInput;
        this.activeInput = null;
        this.activeNodeId = null;
        this.activeType = null;
        this.activeT = null;

        if (input) {
            input.onblur = null;
            input.onkeydown = null;
            if (input.parentNode) input.remove();
        }
        this.manager.deactivateStrategy();
    }
}
