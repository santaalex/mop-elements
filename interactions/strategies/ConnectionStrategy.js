// LOCAL IMPORT: Base class from current folder
import { BaseStrategy } from './BaseStrategy.js';

export class ConnectionStrategy extends BaseStrategy {
    constructor(manager) {
        super(manager);
        this.svgLayer = null;
        this.ghostPath = null;
        this.sourceNodeId = null;
        this.sourcePortDir = null; // 'top', 'right', 'bottom', 'left'
        this.startPos = { x: 0, y: 0 };
        this.currentTargetPort = null; // { nodeId, portDir, pos }
    }

    get name() {
        return 'connection';
    }

    canHandle(event, target) {
        // Port-First Interaction
        // SHADOW DOM FIX: Use composedPath() to pierce the shadow boundary.
        const path = event.composedPath();
        const trueTarget = path[0];
        // Check if the actual clicked element is a port
        return trueTarget && trueTarget.classList && trueTarget.classList.contains('port');
    }

    activate(event) {
        // We must re-discover the target using composedPath because event.target is the Host
        const path = event.composedPath();
        const portEl = path[0]; // The .port element

        // Find the host node (mop-node)
        const nodeEl = portEl.closest('mop-node') || path.find(el => el.tagName === 'MOP-NODE');

        if (!nodeEl || !portEl.dataset) return;

        this.sourceNodeId = nodeEl.getAttribute('id');
        this.sourcePortDir = portEl.dataset.port; // 'top', 'right'...

        console.log(`[ConnectionStrategy] Started from ${this.sourceNodeId} @ ${this.sourcePortDir}`);

        // 1. Calculate Start Position (Graph Coordinates)
        // Pass the PORT element, not the HOST element
        this.startPos = this.getRelativePos(portEl);

        // 2. Create Temp Layer
        this.createDragLayer();

        // 3. Global Wake Up (Show all ports)
        document.body.classList.add('mop-connecting-mode');
        // Note: You need to add global CSS: .mop-connecting-mode mop-node .port { opacity: 0.5; }
    }

    /**
     * Main Drag Loop
     */
    onMove(event) {
        if (!this.ghostPath) return;

        // 1. Get Mouse Position (Graph Coordinates)
        const mousePos = this.getGraphPoint(event);

        // 2. Magnetic Snapping & Validation
        // Scan for potential targets near mouse
        const snapResult = this.findSnapTarget(mousePos);

        let endPos = mousePos;
        let endDir = this.getOppositeDir(this.sourcePortDir); // Default opposite
        let isValid = true;
        let isSnapped = false;

        if (snapResult) {
            // Snapped!
            endPos = snapResult.pos;
            endDir = snapResult.portDir;
            isSnapped = true;

            // Validate Logic
            isValid = this.validateConnection(this.sourceNodeId, snapResult.nodeId);
        }

        this.currentTargetPort = isSnapped ? snapResult : null;

        // 3. Visual Feedback (Red/Green)
        if (isSnapped) {
            this.ghostPath.setAttribute('stroke', isValid ? '#10b981' : '#ef4444'); // Green / Red
            this.ghostPath.setAttribute('stroke-width', '4');
        } else {
            this.ghostPath.setAttribute('stroke', '#6366f1'); // Default Blue
            this.ghostPath.setAttribute('stroke-width', '2');
            this.ghostPath.setAttribute('stroke-dasharray', '5,5');
        }

        // Remove dash if snapped and valid
        if (isSnapped && isValid) {
            this.ghostPath.removeAttribute('stroke-dasharray');
        }

        // 4. Calculate Manhattan Path
        // We reuse EditorView's logic for WYSIWYG
        if (this.manager.editorView.calcManhattanPath) {
            const pathData = this.manager.editorView.calcManhattanPath(
                this.startPos,
                endPos,
                this.sourcePortDir,
                endDir
            );

            // Convert "x,y x,y" format to SVG Path "M x y L x y..."
            // calcManhattanPath returns "x,y x,y x,y" (Polyline points string)
            // But we are using <path>, so let's convert or use <polyline>
            // Actually, let's use <polyline> for simplicity as calcManhattanPath returns "x,y x,y"
            this.ghostPath.setAttribute('points', pathData);
        }
    }

    onEnd(event) {
        // Commit or Cancel
        if (this.currentTargetPort) {
            const { nodeId, portDir } = this.currentTargetPort;

            // Final Validation
            if (this.validateConnection(this.sourceNodeId, nodeId)) {
                this.createConnection(this.sourceNodeId, nodeId, this.sourcePortDir, portDir);
            }
        }

        this.cleanup();
    }

    handleClick(nodeId) {
        // This is called by NodeDragStrategy when a click is detected instead of a drag.
        // For now, we can use this to trigger selection or just log it.
        console.log(`[ConnectionStrategy] handleClick called for node: ${nodeId}`);
        // If we want a click to open a connection UI or something, we do it here.
    }

    cleanup() {
        if (this.svgLayer) {
            this.svgLayer.remove();
            this.svgLayer = null;
            this.ghostPath = null;
        }
        document.body.classList.remove('mop-connecting-mode');
        this.sourceNodeId = null;
        this.currentTargetPort = null;
        this.manager.deactivateStrategy();
    }

    // --- Helpers ---
    createDragLayer() {
        // Create full-screen SVG overlay inside viewport root (Transformed Space)
        const ns = "http://www.w3.org/2000/svg";
        const layer = document.createElementNS(ns, 'svg');
        layer.style.position = 'absolute';
        layer.style.top = '0';
        layer.style.left = '0';
        layer.style.width = '100%';
        layer.style.height = '100%';
        layer.style.overflow = 'visible';
        layer.style.pointerEvents = 'none'; // Passthrough
        layer.style.zIndex = '9999';

        const polyline = document.createElementNS(ns, 'polyline');
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', '#6366f1');
        polyline.setAttribute('stroke-width', '2');
        polyline.setAttribute('stroke-dasharray', '5,5');
        polyline.setAttribute('pointer-events', 'none');

        layer.appendChild(polyline);

        // OFFSET FIX: Append to the transformed root so logic coords align 1:1
        const viewportRoot = document.getElementById('mop-viewport-root');
        if (viewportRoot) viewportRoot.appendChild(layer);
        else this.manager.container.appendChild(layer);

        this.svgLayer = layer;
        this.ghostPath = polyline;
    }

    createConnection(sourceId, targetId, sourceDir, targetDir) {
        const editor = this.manager.editorView;

        // Construct Data
        // IMPORTANT: We need points for persistence.
        // We recalculate one last time to be sure.
        const sourceEl = editor.container.querySelector(`mop-node[id="${sourceId}"]`);
        const targetEl = editor.container.querySelector(`mop-node[id="${targetId}"]`);

        // Note: For now we commit the topological connection.
        // The points will be calculated by CanvasRenderer usually, 
        // BUT our CanvasRenderer expects 'points' in data to draw.
        // So we must save the initial path.

        const start = this.getRelativePos(sourceEl.shadowRoot.querySelector(`.port-${this.getShortDir(sourceDir)}`));
        const end = this.getRelativePos(targetEl.shadowRoot.querySelector(`.port-${this.getShortDir(targetDir)}`));

        const pointsStr = editor.calcManhattanPath(start, end, sourceDir, targetDir);

        const newEdge = {
            id: 'edge-' + Date.now(),
            sourceId,
            targetId,
            sourceDir, // 'top', 'right' etc
            targetDir,
            points: pointsStr,
            animated: true
        };

        // Update Model
        editor.graphData.edges = editor.graphData.edges || [];
        editor.graphData.edges.push(newEdge);

        // Render
        editor.renderer.render(editor.graphData);
        console.log('[ConnectionStrategy] Edge Created:', newEdge);
    }

    findSnapTarget(mouseGraphPos) {
        const SNAP_RADIUS = 20;

        // Get all visible ports
        // Heavy query? Optimized by just querying mop-node then shadowRoot ports
        // Actually, we can just look at nodes in graphData and calc their port positions mathematically
        // But for WYSIWYG, let's query DOM.

        const nodes = Array.from(this.manager.container.querySelectorAll('mop-node'));

        for (const node of nodes) {
            const nodeId = node.getAttribute('id');
            // Skip source node? Usually yes, unless we allow self-loop (which we validates later)
            if (nodeId === this.sourceNodeId) continue;

            // Get Anchors
            // Optimzation: node.getAnchors() returns Relative coords (0,0 is node top-left)
            // We need Graph Coords.
            const rect = this.getElementWorldRect(node); // x,y,w,h in graph space

            const checks = [
                { dir: 'top', x: rect.x + rect.w / 2, y: rect.y },
                { dir: 'right', x: rect.x + rect.w, y: rect.y + rect.h / 2 },
                { dir: 'bottom', x: rect.x + rect.w / 2, y: rect.y + rect.h },
                { dir: 'left', x: rect.x, y: rect.y + rect.h / 2 }
            ];

            for (const check of checks) {
                const dx = Math.abs(check.x - mouseGraphPos.x);
                const dy = Math.abs(check.y - mouseGraphPos.y);
                if (dx < SNAP_RADIUS && dy < SNAP_RADIUS) {
                    return {
                        nodeId: nodeId,
                        portDir: check.dir,
                        pos: { x: check.x, y: check.y }
                    };
                }
            }
        }
        return null;
    }

    validateConnection(sourceId, targetId) {
        if (sourceId === targetId) return false; // No Self Loops

        // No Duplicates
        const edges = this.manager.editorView.graphData.edges || [];
        const exists = edges.some(e =>
            (e.sourceId === sourceId && e.targetId === targetId) ||
            (e.sourceId === targetId && e.targetId === sourceId) // Bidirectional check? Usually directed.
        );

        if (exists) return false;

        return true;
    }

    // --- Math Utils ---

    getGraphPoint(event) {
        // OFFSET FIX: Use Viewport Root for consistency
        const viewportRoot = document.getElementById('mop-viewport-root') || this.manager.container;
        const rect = viewportRoot.getBoundingClientRect(); // Scene Rect (transformed)
        const scale = this.manager.editorView.viewport.state.scale;
        return {
            x: (event.clientX - rect.left) / scale,
            y: (event.clientY - rect.top) / scale
        };
    }

    getRelativePos(el) {
        // Calculate center of element in Graph Space
        const rect = el.getBoundingClientRect(); // Screen space
        const viewportRoot = document.getElementById('mop-viewport-root') || this.manager.container;
        const containerRect = viewportRoot.getBoundingClientRect(); // Scene space
        const scale = this.manager.editorView.viewport.state.scale;

        return {
            x: (rect.left - containerRect.left + rect.width / 2) / scale,
            y: (rect.top - containerRect.top + rect.height / 2) / scale
        };
    }

    getElementWorldRect(el) {
        const scale = this.manager.editorView.viewport.state.scale;
        const rect = el.getBoundingClientRect();
        // OFFSET FIX: Use Viewport Root for consistency with Mouse Logic
        const viewportRoot = document.getElementById('mop-viewport-root') || this.manager.container;
        const containerRect = viewportRoot.getBoundingClientRect();

        const result = {
            x: (rect.left - containerRect.left) / scale,
            y: (rect.top - containerRect.top) / scale,
            w: rect.width / scale,
            h: rect.height / scale
        };

        // DEBUG: Log first node check to help user
        // console.log(`[ConnectionStrategy] Node Check: ${el.id} @ ${result.x}, ${result.y}`);
        return result;
    }

    getOppositeDir(dir) {
        const map = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
        return map[dir] || 'left';
    }

    getShortDir(dir) {
        const map = { top: 'n', bottom: 's', left: 'w', right: 'e' };
        return map[dir] || 'n';
    }
}
