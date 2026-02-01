import { BaseStrategy } from '../../BaseStrategy.js';
import { HitTest } from '../../mop-interaction-sdk/HitTest.js';

export class SelectionStrategy extends BaseStrategy {
    constructor(manager) {
        super(manager);
        this.isClickCandidate = false;
        this.startPos = { x: 0, y: 0 };
    }

    get name() {
        return 'selection';
    }

    canHandle(event, target) {
        // We act as the Fallback Strategy.
        // If Drag/Connect didn't claim it (e.g. Empty Space), we take it.
        return true;
    }

    activate(event) {
        this.isClickCandidate = true;
        this.startPos = { x: event.clientX, y: event.clientY };
    }

    onMove(event) {
        // If moved significantly, cancel click
        const dist = Math.hypot(event.clientX - this.startPos.x, event.clientY - this.startPos.y);
        if (dist > 5) {
            this.isClickCandidate = false;
        }
    }

    onEnd(event) {
        if (this.isClickCandidate) {
            // It was a click!
            // High-Star Best Practice: Trust the Semantic Event
            // InteractionManager has already performed Omni-HitTest and attached semanticType/Id to the event if found.

            let clickedId = null;
            let bestTargetType = null;

            // 1. Try Metadata driven (propagated by InteractionManager)
            if (event.semanticId) {
                clickedId = event.semanticId;
                bestTargetType = event.semanticType;
            } else {
                // 2. Fallback (Direct Check - e.g. for empty space)
                // If no semanticId, it means HitTest hit nothing semantic (Canvas/Empty).
                // But let's double check if we didn't receive metadata for some reason (rare).
                const result = HitTest.analyze(event.clientX, event.clientY, event.composedPath());
                if (result.bestTarget) {
                    clickedId = result.bestTarget.id;
                    bestTargetType = result.bestTarget.type;
                }
            }

            // Only Select Nodes or Edges (Lane selection is typically for Editing, not MultiSelection)
            if (bestTargetType === 'lane') {
                clickedId = null; // Treat Lane click as 'Deselect All' for now, unless we shift-click?
                // Actually, Lane selection might be valid for properties. Let's allow it if needed, 
                // but usually clicking lane background means 'deselect nodes'.
                // For now, let's keep it null to act as empty space.
            }

            this.handleClick(clickedId, event.shiftKey);
        }
        this.isClickCandidate = false;
    }

    /**
     * Handle Click (Called by InteractionManager or DragStrategy on "Click")
     * @param {string|null} nodeId - ID of clicked node, or null if clicked empty space
     * @param {boolean} isMultiSelect - e.g. Shift key pressed
     */
    handleClick(nodeId, isMultiSelect) {
        const editor = this.manager.editorView;
        const selection = editor.selection;

        if (nodeId) {
            // Clicked a Node
            if (isMultiSelect) {
                // Toggle
                if (selection.has(nodeId)) {
                    selection.delete(nodeId);
                } else {
                    selection.add(nodeId);
                }
            } else {
                // Single Select (Replace)
                // Optimization: If already selected and only 1 item, skip re-render to avoid interfering with DblClick
                if (selection.size === 1 && selection.has(nodeId)) {
                    console.log('[SelectionStrategy] Selection Unchanged - Skipping Render (Preserving DblClick Flow)');
                    return;
                }
                selection.clear();
                selection.add(nodeId);
            }
        } else {
            // Clicked Empty Space (Deselect All)
            if (!isMultiSelect) {
                if (selection.size === 0) return; // Optimization: Already empty
                selection.clear();
            }
        }

        console.log('[SelectionStrategy] Updated Selection:', [...selection]);

        // Trigger Gizmo Render
        if (editor.gizmoRenderer) {
            editor.gizmoRenderer.render(selection);
        }

        // Trigger DOM Visuals (for Edges)
        editor.updateSelectionVisuals();
    }
}
