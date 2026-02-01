import { BaseStrategy } from 'https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/interactions/strategies/BaseStrategy.js';

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
     * @param {string|Object} payload - NodeId string OR { type: 'edge', id, t } object
     */
    activate(payload) {
        if (!payload) return;

        const isEdge = typeof payload === 'object' && payload.type === 'edge';
        const targetId = isEdge ? payload.id : payload;

        console.log(`[EditingStrategy] Activating for ${isEdge ? 'Edge' : 'Node'}:`, targetId);
        this.activeNodeId = targetId;
        this.activeType = isEdge ? 'edge' : 'node';
        this.activeT = isEdge ? payload.t : null;

        const editor = this.manager.editorView;

        // 1. Find the Element
        const query = isEdge ? `mop-edge[id="${targetId}"]` : `mop-node[id="${targetId}"]`;
        const el = editor.container.querySelector(query);
        if (!el) {
            console.warn('[EditingStrategy] Target element not found:', query);
            return;
        }

        // 2. Determine Coordinates
        let x, y, width, height, color, fontSize, textAlign;

        if (isEdge) {
            // Edge logic: Get center from component's path logic
            const center = el.getPathPoint(this.activeT);
            x = center.x;
            y = center.y;
            width = 120; // Default editing width for labels
            height = 24;
            color = '#334155';
            fontSize = '12px';
            textAlign = 'center';
        } else {
            // Node logic: Existing computed style sync
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
        input.style.left = isEdge ? (x - width / 2) + 'px' : x + 'px';
        input.style.top = isEdge ? (y - height / 2) + 'px' : y + 'px';
        input.style.width = width + 'px';
        input.style.height = height + 'px';

        input.style.fontFamily = "'Inter', sans-serif";
        input.style.fontSize = fontSize;
        input.style.textAlign = textAlign;
        input.style.color = color;
        input.style.padding = '4px';

        input.style.background = 'white';
        input.style.border = '2px solid #3b82f6';
        input.style.borderRadius = isEdge ? '12px' : '4px';
        input.style.zIndex = '3000';
        input.style.resize = 'none';
        input.style.overflow = 'hidden';
        input.style.outline = 'none';
        input.style.boxSizing = 'border-box';

        const layer = document.getElementById('mop-gizmo-layer') || this.manager.container;
        if (layer) layer.appendChild(input);

        input.focus();
        input.select();

        input.onblur = () => this.commit();
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.commit(); }
            if (e.key === 'Escape') this.cancel();
            e.stopPropagation();
        };
    }

    getLabel(id, type) {
        const editor = this.manager.editorView;
        if (type === 'edge') {
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

        if (this.activeType === 'edge') {
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
