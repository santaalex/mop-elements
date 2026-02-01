/**
 * 🧪 Test Case: Verify CDN Integration Stability
 * Paste this entire script into your browser console while Goldmine is running.
 */
(async () => {
    console.clear();
    console.log('%c🔍 Starting SDK Stability Check...', 'color: #1890ff; font-weight: bold; font-size: 14px;');

    try {
        // 1. Access the Editor Instance (Assumes 'router' (global) -> routes.editor or found in DOM)
        // We'll inspect the InteractionManager attached to the View
        const app = document.getElementById('app');
        // Hack: in your Router logic, you expose it, or we find it via internal prop if available
        // But better: We just check if the CLASSES match the CDN source.

        console.log('📦 importing modules from CDN for strict equality check...');
        const { NodeDragStrategy } = await import('https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/packages/mop-drag-sdk/NodeDragStrategy.js');
        const { SelectionStrategy } = await import('https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/packages/mop-gizmo-sdk/strategies/SelectionStrategy.js');
        const { GizmoRenderer } = await import('https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/packages/mop-gizmo-sdk/GizmoRenderer.js');

        const editorRoute = window.router?.routes?.editor; // Assuming router is global or we can access it

        if (editorRoute) {
            const manager = editorRoute.interactionManager;
            if (!manager) {
                console.warn('⚠️ Editor loaded but InteractionManager not found in expected path. (Is Editor active?)');
            } else {
                // Verify Strategy Instances
                const isDragOk = manager.strategies.drag instanceof NodeDragStrategy;
                const isSelectOk = manager.strategies.selection instanceof SelectionStrategy;

                console.log(`🧩 Drag Strategy Type Check: ${isDragOk ? '✅ PASS' : '❌ FAIL'}`);
                console.log(`🧩 Selection Strategy Type Check: ${isSelectOk ? '✅ PASS' : '❌ FAIL'}`);

                if (isDragOk && isSelectOk) {
                    console.log('%c🎉 SYSTEM STABLE. using Remote SDK Code.', 'color: green; font-weight: bold;');
                }
            }
        } else {
            console.log('ℹ️ Router not detected in global scope. Cannot check live instances. But CDN load was OK.');
            console.log('✅ CDN Links are Valid (200 OK)');
        }

    } catch (e) {
        console.error('❌ Critical Error during Verification:', e);
    }
})();
