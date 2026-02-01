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
     * @param {string} nodeId 
     */
    activate(nodeId) {
        if (!nodeId) return;

        console.log('[EditingStrategy] Activating for:', nodeId);
        this.activeNodeId = nodeId;
        const editor = this.manager.editorView;

        // 1. Find the Node Element
        const nodeEl = editor.container.querySelector(`mop-node[id="${nodeId}"]`);
        if (!nodeEl) {
            console.warn('[EditingStrategy] Node element not found');
            return;
        }

        // 3. Create Phantom Textarea
        const input = document.createElement('textarea');
        this.activeInput = input;

        // 4. Style Sync (The "Invisible" Magic)
        const computed = window.getComputedStyle(nodeEl);

        input.value = this.getNodeLabel(nodeId); // Get current text

        input.style.position = 'absolute';
        input.style.left = nodeEl.style.left;
        input.style.top = nodeEl.style.top;
        input.style.width = nodeEl.style.width;
        input.style.height = nodeEl.style.height;

        // Copy Typography
        input.style.fontFamily = computed.fontFamily;
        input.style.fontSize = computed.fontSize;
        input.style.lineHeight = computed.lineHeight;
        input.style.fontWeight = computed.fontWeight;
        input.style.textAlign = computed.textAlign;
        input.style.color = computed.color;
        input.style.padding = computed.padding;

        // Visuals
        input.style.background = 'white'; // Opaque to hide underlying text
        input.style.border = '2px solid #1890ff'; // Focus state
        input.style.zIndex = '3000'; // Above everything (even Gizmos)
        input.style.resize = 'none';
        input.style.overflow = 'hidden';
        input.style.outline = 'none';
        input.style.boxSizing = 'border-box';

        // 5. Append to Gizmo Layer
        const layer = document.getElementById('mop-gizmo-layer') || this.manager.container;
        if (layer) layer.appendChild(input);

        // 6. Focus & Select
        input.focus();
        input.select();

        // 7. Bind Events
        input.onblur = () => this.commit();
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { // Shift+Enter for newline
                e.preventDefault();
                this.commit();
            }
            if (e.key === 'Escape') {
                this.cancel();
            }
            e.stopPropagation(); // Standard practice: Don't trigger other shortcuts
        };
    }

    /**
     * Helper to get text from data model
     */
    getNodeLabel(nodeId) {
        const node = this.manager.editorView.graphData.nodes.find(n => n.id === nodeId);
        return node ? (node.label || 'New Node') : '';
    }

    commit() {
        if (!this.activeInput || !this.activeNodeId) return;

        const newValue = this.activeInput.value;
        console.log('[EditingStrategy] Committing:', newValue);

        // Update Data - Expects editorView.updateNode(id, data)
        if (this.manager.editorView.updateNode) {
            this.manager.editorView.updateNode(this.activeNodeId, { label: newValue });
        } else {
            console.error('[EditingStrategy] EditorView missing updateNode method');
        }

        this.cleanup();
    }

    cancel() {
        console.log('[EditingStrategy] Cancelled');
        this.cleanup();
    }

    cleanup() {
        const input = this.activeInput;
        // Nullify first to prevent re-entrant calls from blur events
        this.activeInput = null;
        this.activeNodeId = null;

        if (input) {
            // Unbind listeners first
            input.onblur = null;
            input.onkeydown = null;

            // Safe removal
            if (input.parentNode) {
                input.remove();
            }
        }

        this.manager.deactivateStrategy();
    }
}
