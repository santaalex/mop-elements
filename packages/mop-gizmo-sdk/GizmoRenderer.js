/**
 * GizmoRenderer (The Interface Painter)
 * SDK Mode
 */
export class GizmoRenderer {
    /**
     * @param {HTMLElement} gizmoLayer - The #mop-gizmo-layer div
     * @param {Object} options - Configuration and callbacks
     *      - editor: Reference to the editor instance (for node queries)
     *      - onDelete: (nodeId) => void
     */
    constructor(gizmoLayer, options = {}) {
        this.layer = gizmoLayer;
        this.options = options;
        this.editor = options.editor; // Still need this for dom lookups
        this.activeGizmos = new Map(); // id -> HTMLElement
    }

    /**
     * Main Render Loop for Gizmos
     * @param {Set<string>} selectedIds 
     */
    render(selectedIds) {
        // 1. Identify what needs to be removed
        for (const [id, el] of this.activeGizmos) {
            if (!selectedIds.has(id)) {
                el.remove();
                this.activeGizmos.delete(id);
            }
        }

        // 2. Identify what needs to be added/updated
        for (const nodeId of selectedIds) {
            this.updateGizmoBox(nodeId);
        }
    }

    updateGizmoBox(nodeId) {
        // Find target DOM element (Node OR Edge)
        let el = this.editor.container.querySelector(`mop-node[id="${nodeId}"]`);
        if (!el) {
            el = this.editor.container.querySelector(`mop-edge[id="${nodeId}"]`);
        }

        if (!el) {
            // console.warn(`[GizmoRenderer] Element not found for ID: ${nodeId}`);
            return;
        }

        let gizmoEl = this.activeGizmos.get(nodeId);

        // Create if new
        if (!gizmoEl) {
            gizmoEl = document.createElement('div');
            gizmoEl.className = 'mop-gizmo-selection';

            // Base Styles
            gizmoEl.style.position = 'absolute';
            gizmoEl.style.border = '2px solid #1890ff'; // Standard Blue
            gizmoEl.style.pointerEvents = 'none'; // Pass through clicks
            gizmoEl.style.boxSizing = 'border-box';
            gizmoEl.style.zIndex = '2001';

            this.layer.appendChild(gizmoEl);
            this.activeGizmos.set(nodeId, gizmoEl);
        }

        // Geometry Logic
        if (el.tagName.toLowerCase() === 'mop-edge' && typeof el.getBounds === 'function') {
            // Precise Edge Bounds (Graph Coords) - Unscaled because layer is inside transformed viewport
            const bounds = el.getBounds();

            gizmoEl.style.left = bounds.x + 'px';
            gizmoEl.style.top = bounds.y + 'px';
            gizmoEl.style.width = bounds.width + 'px';
            gizmoEl.style.height = bounds.height + 'px';
            gizmoEl.style.transform = 'none';
        } else {
            // NODE GEOMETRY (Using style-based logic from MoP Node)
            // Nodes in this engine use style.left/top for their graph position
            const width = el.offsetWidth || parseInt(el.style.width) || 160;
            const height = el.offsetHeight || parseInt(el.style.height) || 60;

            gizmoEl.style.left = el.style.left;
            gizmoEl.style.top = el.style.top;
            gizmoEl.style.width = width + 'px';
            gizmoEl.style.height = height + 'px';
            gizmoEl.style.transform = el.style.transform;
        }

        // --- Universal Delete Button ---
        if (!gizmoEl.querySelector('button')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute -top-3 -right-3 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm text-slate-400 hover:text-red-500 hover:border-red-500 cursor-pointer pointer-events-auto transition-colors z-50';
            deleteBtn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                // Check what we are deleting for better prompt
                const type = el.tagName.toLowerCase() === 'mop-edge' ? 'Edge' : 'Node';
                if (confirm(`Delete this ${type}?`)) {
                    if (this.options.onDelete) this.options.onDelete(nodeId);
                    else if (this.editor.deleteNode) this.editor.deleteNode(nodeId);
                }
            };
            gizmoEl.appendChild(deleteBtn);
        }
    }
}
