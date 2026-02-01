// MIGRATED TO SDK
export { SelectionStrategy } from 'https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/packages/mop-gizmo-sdk/strategies/SelectionStrategy.js';
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
    // We don't need to capture element, just the point
}

onMove(event) {
    // If moved significantly, cancel click
    const dist = Math.hypot(event.clientX - this.startPos.x, event.clientY - this.startPos.y);
    if (dist > 5) {
        this.isClickCandidate = false;
    }

    // Future: Box Selection (Rubber Band) logic goes here!
}

onEnd(event) {
    if (this.isClickCandidate) {
        // It was a click on empty space!
        this.handleClick(null, event.shiftKey);
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
            selection.clear();
            selection.add(nodeId);
        }
    } else {
        // Clicked Empty Space (Deselect All)
        if (!isMultiSelect) {
            selection.clear();
        }
    }

    console.log('[SelectionStrategy] Updated Selection:', [...selection]);

    // Trigger Gizmo Render
    if (editor.gizmoRenderer) {
        console.log('[SelectionStrategy] Calling GizmoRenderer.render...');
        editor.gizmoRenderer.render(selection);
    } else {
        console.error('[SelectionStrategy] editor.gizmoRenderer is MISSING/NULL');
    }
}
}
