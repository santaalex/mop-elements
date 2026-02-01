import { ProjectService } from './ProjectService.js';
// CDN IMPORT: Gizmo SDK
import { GizmoRenderer } from 'https://cdn.jsdelivr.net/gh/santaalex/mop-elements@main/packages/mop-gizmo-sdk/GizmoRenderer.js';
import { CanvasRenderer } from './CanvasRenderer.js';
import { InteractionManager } from './interactions/InteractionManager.js';
// ViewportEngine is on CDN, but for consistency we can use the local file or CDN.
// Since we didn't add it to importmap in index.html, we might need a direct import or add to map.
// Let's assume we add it to the map or use the relative path (which is also local).
// Wait, for "Production" feel, let's use the local import which map might redirect if we configure it,
// but for now local import ./ViewportEngine.js is fine (it was pushed to repo too).
import { ViewportEngine } from 'mop-viewport';

/**
 * MoP Editor Controller (The Orchestrator)
 * 
 * Responsibilities:
 * 1. Data Cycle: Loads Project -> Updates Graph Data -> Saves to API.
 * 2. Component Assembly: Initializes Viewport, Renderer, and InteractionManager.
 * 3. Command Handling: Toolbar actions (Add Node, Add Lane).
 * 
 * Architecture Note:
 * This class DOES NOT handle low-level events (mousedown/move). 
 * Those are delegated to `interactions/InteractionManager.js`.
 * This class DOES NOT draw DOM. That is delegated to `CanvasRenderer.js`.
 */
export class EditorView {
    constructor() {
        this.projectId = null;
        this.projectData = null;
        this.graphData = { lanes: [], nodes: [] }; // The SSOT
        this.renderer = null;
        this.viewport = null;
        this.dragState = null;
        this.selection = new Set(); // Selection State (Set of Node IDs)
        this.projectService = new ProjectService();
        this.renderer = null;
        this.gizmoRenderer = null; // Interface Painter
    }

    async mount(container, params) {
        console.log('[EditorView] Mounting...', params);
        this.projectId = params.id;
        this.container = container;
        container.innerHTML = this.template();

        // Setup Layers
        // Store scene reference for coordinate calculation
        this.scene = container.querySelector('#mop-scene');
        const viewportRoot = container.querySelector('#mop-viewport-root'); // Grab Root

        // Create Gizmo Layer (Overlay)
        const gizmoLayer = document.createElement('div');
        gizmoLayer.id = 'mop-gizmo-layer';
        gizmoLayer.style.position = 'absolute';
        gizmoLayer.style.top = '0';
        gizmoLayer.style.left = '0';
        gizmoLayer.style.width = '100%';
        gizmoLayer.style.height = '100%';
        gizmoLayer.style.pointerEvents = 'none'; // Pass through clicks to nodes
        gizmoLayer.style.zIndex = '2000'; // Above nodes

        // BUG FIX: Attach to Viewport Root, NOT Scene. 
        // Scene gets cleared by CanvasRenderer, Root does not.
        viewportRoot.appendChild(gizmoLayer);

        // 1. Init Viewport
        // We need to wait for DOM to be ready
        requestAnimationFrame(async () => {
            this.initViewport();
            await this.loadProject();
            this.setupToolbar();

            // DIAGNOSTICS REMOVED: System Stabilized
        });
    }

    template() {
        return `
            <div class="editor-layout h-screen w-screen flex overflow-hidden bg-slate-50">
                <!-- 1. Toolbar (Left) -->
                <div class="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 z-20 shadow-sm">
                    <div class="mb-6 font-bold text-indigo-600 text-xl">M</div>
                    
                    <!-- Tools -->
                    <button id="tool-pointer" class="w-10 h-10 rounded bg-slate-100 flex items-center justify-center mb-2 text-indigo-600 shadow-inner" title="Pointer">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                    </button>
                    <button id="btn-add-lane" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-slate-500 transition-colors" title="Add Lane">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <button id="btn-add-node" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-slate-500 transition-colors" title="Add Process Node">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                    
                    <div class="flex-grow"></div>

                    <!-- Botton Tools (User corrected: Save is here) -->
                    <button id="btn-save" class="w-10 h-10 rounded bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center mb-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95" title="Save Project (L1/L2)">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    </button>
                    <button id="btn-back" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors" title="Back to Dashboard">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                </div>

                <!-- 2. Canvas Area -->
                <div id="mop-viewport" class="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing bg-slate-100">
                    <!-- mop-viewport-root is the ONLY element with .mop-canvas-content -->
                    <!-- This layer handles the CSS transform (scale/pan) -->
                    <div id="mop-viewport-root" class="mop-canvas-content absolute top-0 left-0 bg-white shadow-2xl" 
                         style="width: 5000px; height: 5000px; transform-origin: 0 0;">
                        
                        <!-- Layer 1: Persistent Background Grid (Sibling to Scene) -->
                        <div id="mop-grid" class="absolute inset-0 z-0 pointer-events-none" 
                             style="background-image: linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px); background-size: 20px 20px;">
                        </div>

                        <!-- Layer 2: Scene (Padding Container) -->
                        <div id="mop-scene" class="absolute inset-0 z-10 p-24 pointer-events-none child-events-auto">
                            <!-- Inner Layer A: Graph Content (Cleared by Renderer) -->
                            <div id="mop-graph-layer" class="absolute inset-0"></div>
                            
                            <!-- Inner Layer B: Gizmo Layer (Injected dynamically) -->
                        </div>
                    </div>

                    <!-- HUD / Overlays (Static, outside the transform) -->
                    <div class="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md shadow-sm border border-slate-200 text-xs font-mono text-slate-500 pointer-events-none selection:none z-20">
                        <span id="project-title">Loading...</span> | Scale: <span id="viewport-scale">100%</span>
                    </div>
                </div>
            </div>
        `;
    }

    initViewport() {
        // Initialize Viewport Engine (Zoom/Pan)
        this.viewport = new ViewportEngine('mop-viewport', 'mop-viewport-root');

        // Initialize Atomic Interaction Manager
        this.interactionManager = new InteractionManager(this);

        // LEGACY INTERACTIONS DISABLED - MIGRATED TO ATOMIC STRATEGIES
        // this.setupInteractions();
        // Hook up HUD updates
        const scaleLabel = document.getElementById('viewport-scale');
        this.viewport.on('change', (state) => {
            scaleLabel.innerText = Math.round(state.scale * 100) + '%';
        });

        // Initialize Renderer targeting the Scene layer
        // Initialize Renderer targeting the Graph Layer (NOT the Scene container itself)
        const graphLayer = document.getElementById('mop-graph-layer');
        this.renderer = new CanvasRenderer(graphLayer);

        // Initialize Gizmo Renderer (Overlay Painter)
        const gizmoLayer = document.getElementById('mop-gizmo-layer');
        if (gizmoLayer) {
            import('./GizmoRenderer.js').then(({ GizmoRenderer }) => {
                console.log('[EditorView] GizmoRenderer Loaded & Initialized');
                this.gizmoRenderer = new GizmoRenderer(gizmoLayer, this);
            }).catch(err => console.error('[EditorView] Failed to load GizmoRenderer:', err));
        } else {
            console.error('[EditorView] #mop-gizmo-layer NOT FOUND in DOM');
        }
    }

    async loadProject() {
        const titleEl = document.getElementById('project-title');

        try {
            // Optimization: If we can't change ProjectService (Locked), we have to fetch list.
            const projects = await this.projectService.getProjects();
            this.projectData = projects.find(p => String(p.id) === String(this.projectId));

            if (!this.projectData) {
                alert('Project not found!');
                window.location.hash = '#/dashboard';
                return;
            }

            titleEl.innerText = this.projectData.name;

            // Load Canvas Data into SSOT
            this.graphData = { lanes: [], nodes: [] };
            if (this.projectData.canvasData) {
                try {
                    this.graphData = JSON.parse(this.projectData.canvasData);
                    // Ensure structure
                    this.graphData.lanes = this.graphData.lanes || [];
                    this.graphData.nodes = this.graphData.nodes || [];
                } catch (e) {
                    console.error('Invalid JSON canvas data', e);
                }
            }

            this.renderer.render(this.graphData);

            // Auto-fit (Simple center for now)
            this.viewport.centerOn(1000, 500); // Approximate center of standard canvas

        } catch (err) {
            console.error('Refused to load project:', err);
            titleEl.innerText = 'Error Loading Project';
        }
    }

    setupToolbar() {
        // Back Button
        document.getElementById('btn-back').onclick = () => {
            window.location.hash = '#/dashboard';
        };

        // Add Lane (Virtual Flex Logic)
        document.getElementById('btn-add-lane').onclick = () => {
            // Find max order to put it at the end
            const maxOrder = this.graphData.lanes.reduce((max, l) => Math.max(max, Number(l.order) || 0), -1);

            const newLane = {
                id: 'lane-' + Date.now(),
                name: 'New Swimlane',
                x: 100,
                order: maxOrder + 1,
                w: 1200,
                h: 220,
                color: '#6366f1'
            };

            this.graphData.lanes.push(newLane);
            this.renderer.render(this.graphData);

            console.log(`[Editor] Added Lane ${newLane.id} with Order ${newLane.order}`);
        };

        // Add Node
        document.getElementById('btn-add-node').onclick = () => {
            const newNode = {
                id: 'node-' + Date.now(),
                type: 'process',
                label: 'New Process',
                x: 200,
                y: 200,
                status: 'normal'
            };
            this.graphData.nodes.push(newNode);
            this.renderer.render(this.graphData);
            console.log('[Editor] Added Node:', newNode.id);
        };

        // Save Button (SSOT Mode)
        document.getElementById('btn-save').onclick = async () => {
            const btn = document.getElementById('btn-save');
            const originalIcon = btn.innerHTML;
            btn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';

            try {
                // Serialize SSOT to string
                const jsonString = JSON.stringify(this.graphData);
                const success = await this.projectService.saveCanvas(this.projectId, jsonString);

                if (success) {
                    btn.classList.add('bg-green-600', 'shadow-green-500/50');
                    setTimeout(() => btn.classList.remove('bg-green-600', 'shadow-green-500/50'), 1500);
                } else {
                    alert('Save Failed');
                }
            } catch (e) {
                console.error(e);
                alert('Save Error: ' + e.message);
            } finally {
                btn.innerHTML = originalIcon;
            }
        };
    }

    /**
     * 计算曼哈顿折线路径 (Industrial Orthogonal Routing)
     */
    calcManhattanPath(p1, p2, orientation1 = 'right', orientation2 = 'left') {
        const stub = 20; // 20px straight line out

        // 1. Calculate Anchors with Stubs
        let start = { ...p1 };
        let end = { ...p2 };

        // 2. Generate path points
        // Simplified Manhattan: [Start, StartStub, EndStub, End]
        const points = [];
        points.push(`${p1.x},${p1.y}`);

        let sAnchor = { x: p1.x, y: p1.y };
        if (orientation1 === 'right') sAnchor.x += stub;
        else if (orientation1 === 'left') sAnchor.x -= stub;
        else if (orientation1 === 'bottom') sAnchor.y += stub;
        else if (orientation1 === 'top') sAnchor.y -= stub;
        points.push(`${sAnchor.x},${sAnchor.y}`);

        let eAnchor = { x: p2.x, y: p2.y };
        if (orientation2 === 'right') eAnchor.x += stub;
        else if (orientation2 === 'left') eAnchor.x -= stub;
        else if (orientation2 === 'bottom') eAnchor.y += stub;
        else if (orientation2 === 'top') eAnchor.y -= stub;

        // Middle point for Z-shape
        const midX = (sAnchor.x + eAnchor.x) / 2;
        points.push(`${midX},${sAnchor.y}`);
        points.push(`${midX},${eAnchor.y}`);

        points.push(`${eAnchor.x},${eAnchor.y}`);
        points.push(`${p2.x},${p2.y}`);

        return points.join(' ');
    }

    /**
     * Professional Interaction Engine
     * Handles coordinate transformations, visual layer dragging, and transactional SSOT updates.
     */
    // --- Legacy Interactions Removed (Migrated to InteractionManager) ---
    // See interactions/InteractionManager.js and strategies/*.js

    /**
     * Delete a node and its connections (Transaction).
     * @param {string} nodeId - ID of the node to delete
     */
    deleteNode(nodeId) {
        if (!nodeId) return;

        console.log('[EditorView] Deleting Node:', nodeId);

        // 1. Remove Node
        this.graphData.nodes = this.graphData.nodes.filter(n => n.id !== nodeId);

        // 2. Remove Connected Edges
        this.graphData.edges = (this.graphData.edges || []).filter(e => e.sourceId !== nodeId && e.targetId !== nodeId);

        // 3. Clear Selection (Safety)
        this.selection.delete(nodeId);

        // 4. Update Visuals
        // Update Graph Layer
        this.renderer.render(this.graphData);
        // Update Gizmo Layer (Remove box)
        if (this.gizmoRenderer) {
            this.gizmoRenderer.render(this.selection);
        }

        console.log('[EditorView] Node Deleted. Remaining Nodes:', this.graphData.nodes.length);
    }

    /**
     * Update a node's data and re-render (Transaction).
     * @param {string} nodeId
     * @param {Object} partialData - e.g. { label: "New Text" }
     */
    updateNode(nodeId, partialData) {
        const node = this.graphData.nodes.find(n => n.id === nodeId);
        if (!node) return;

        console.log('[EditorView] Updating Node:', nodeId, partialData);

        // 1. Merge Data
        Object.assign(node, partialData);

        // 2. Re-render Graph (to update text)
        this.renderer.render(this.graphData);

        // 3. Re-render Gizmos (in case size changed - though currently size is usually fixed or strictly CSS)
        // If text wraps, height might change.
        if (this.gizmoRenderer) {
            this.gizmoRenderer.render(this.selection);
        }
    }

    /**
     * REACTIVE EDGE UPDATE (Best Practice: Partial Update)
     * Recalculates paths for all edges connected to the given node.
     * Called by InteractionManager during drag.
     */
    updateConnectedEdges(nodeId) {
        if (!this.graphData.edges) return;

        // 1. Find relevant edges
        const edges = this.graphData.edges.filter(e => e.sourceId === nodeId || e.targetId === nodeId);

        // 2. Batch DOM read (Optimization)
        // We need source/target elements for each edge
        const portCache = new Map(); // Key: nodeId-dir, Value: {x,y}

        edges.forEach(edge => {
            // Recalculate Path
            const sourceEl = this.container.querySelector(`mop-node[id="${edge.sourceId}"]`);
            const targetEl = this.container.querySelector(`mop-node[id="${edge.targetId}"]`);

            if (!sourceEl || !targetEl) return;

            // TODO: Extract getShortDir/getRelativePos to shared util or helper
            // For now, we inline specific DOM logic for speed
            const getPos = (node, dir) => {
                const map = { top: 'n', bottom: 's', left: 'w', right: 'e' };
                const short = map[dir] || 'n';
                const port = node.shadowRoot.querySelector(`.port-${short}`);
                if (!port) return { x: 0, y: 0 };

                // CRITICAL FIX: Use SCENE as reference layer (Accounts for Pan/Zoom Transform)
                if (!this.scene) this.scene = this.container.querySelector('#mop-scene');

                const rect = port.getBoundingClientRect();
                const sceneRect = this.scene.getBoundingClientRect();
                const scale = this.viewport.state.scale;

                return {
                    x: (rect.left - sceneRect.left + rect.width / 2) / scale,
                    y: (rect.top - sceneRect.top + rect.height / 2) / scale
                };
            };

            let start = getPos(sourceEl, edge.sourceDir);
            let end = getPos(targetEl, edge.targetDir);

            // 3. Update Model
            edge.points = this.calcManhattanPath(start, end, edge.sourceDir, edge.targetDir);

            // 4. Update DOM (Direct, no full render)
            // PERFORMANCE: Direct Attribute Update (High Star Practice)
            // We bypass full graph render and only tell the specific edge component to update.
            // EdgeComponent observes 'points' and will re-render itself locally.
            // This avoids "Layout Thrashing" and "Split Brain" issues.

            const edgeEl = this.container.querySelector(`mop-edge[id="${edge.id}"]`);
            if (edgeEl) {
                // Direct DOM update for high performance without full re-render
                edgeEl.setAttribute('points', edge.points);
            }
        });

        // REMOVED: this.renderer.render(this.graphData);
        // We do NOT want to re-render the whole graph during drag.
        // It conflicts with the Drag SDK (which moves nodes via transform).
    }
}
