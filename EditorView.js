import { ProjectService } from './ProjectService.js';
import { CanvasRenderer } from 'mop-renderer';
// ViewportEngine is on CDN, but for consistency we can use the local file or CDN.
// Since we didn't add it to importmap in index.html, we might need a direct import or add to map.
// Let's assume we add it to the map or use the relative path (which is also local).
// Wait, for "Production" feel, let's use the local import which map might redirect if we configure it,
// but for now local import ./ViewportEngine.js is fine (it was pushed to repo too).
import { ViewportEngine } from 'mop-viewport';

export class EditorView {
    constructor() {
        this.projectId = null;
        this.projectData = null;
        this.graphData = { lanes: [], nodes: [] }; // The SSOT
        this.renderer = null;
        this.viewport = null;
        this.dragState = null; // Professional interaction state
        this.projectService = new ProjectService();
    }

    async mount(container, params) {
        console.log('[EditorView] Mounting...', params);
        this.projectId = params.id;
        container.innerHTML = this.template();

        // 1. Init Viewport
        // We need to wait for DOM to be ready
        requestAnimationFrame(async () => {
            this.initViewport();
            await this.loadProject();
            this.setupToolbar();
            this.setupInteractions(); // Pro-level dragging & clicking
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

                        <!-- Layer 2: Scene (Renderer targets this, so it won't clear the grid) -->
                        <div id="mop-scene" class="absolute inset-0 z-10 p-24 pointer-events-none child-events-auto">
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
        // Initialize the engine (Passing the correct ID for the transformed layer)
        this.viewport = new ViewportEngine('mop-viewport', 'mop-viewport-root');

        // Hook up HUD updates
        const scaleLabel = document.getElementById('viewport-scale');
        this.viewport.on('change', (state) => {
            scaleLabel.innerText = Math.round(state.scale * 100) + '%';
        });

        // Initialize Renderer targeting the Scene layer
        const sceneEl = document.getElementById('mop-scene');
        this.renderer = new CanvasRenderer(sceneEl);
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
     * Professional Interaction Engine
     * Handles coordinate transformations, visual layer dragging, and transactional SSOT updates.
     */
    setupInteractions() {
        const sceneEl = document.getElementById('mop-scene');

        // 1. Capture Interaction Start (Switch to mousedown for consistency with Viewport)
        sceneEl.addEventListener('mousedown', (e) => {
            // CRITICAL: If Space is held, DO NOT handle node dragging.
            // Let the event bubble to ViewportEngine.
            if (this.viewport && this.viewport.state.isSpacePressed) {
                return;
            }

            const nodeEl = e.target.closest('mop-node');
            if (!nodeEl) return;

            // Only stop propagation if we are actually dragging a node
            e.stopPropagation();

            const nodeId = nodeEl.getAttribute('id');
            const nodeData = this.graphData.nodes.find(n => n.id === nodeId);
            if (!nodeData) return;

            // Transform Mouse -> World Coordinate
            const mouseWorldPos = this.viewport.toWorld(e.clientX, e.clientY);

            // Critical Fix: Node Data X/Y is relative to Lane, but we drag in World Space.
            // We need to store the world offset.
            let parentX = 0;
            let parentY = 0;

            if (nodeData.laneId) {
                // Find parent lane world position
                const parentLane = this.graphData.lanes.find(l => l.id === nodeData.laneId);
                if (parentLane) {
                    // Note: In our current renderer, lanes start at x=100 and Y is computed
                    const laneTop = this.getLaneTop(parentLane.id);
                    parentX = parentLane.x || 100;
                    parentY = laneTop;
                }
            }

            const nodeWorldX = parentX + nodeData.x;
            const nodeWorldY = parentY + nodeData.y;

            this.dragState = {
                nodeId,
                nodeEl,
                startWorldX: nodeWorldX,
                startWorldY: nodeWorldY,
                parentX,
                parentY,
                mouseStartX: mouseWorldPos.x,
                mouseStartY: mouseWorldPos.y
            };

            nodeEl.style.transition = 'none';
            nodeEl.style.zIndex = '1000';
            nodeEl.classList.add('dragging-active');
        });

        // 2. High-Performance Visual Drag (60FPS)
        window.addEventListener('mousemove', (e) => {
            if (!this.dragState) return;

            const currentWorldPos = this.viewport.toWorld(e.clientX, e.clientY);
            const dx = currentWorldPos.x - this.dragState.mouseStartX;
            const dy = currentWorldPos.y - this.dragState.mouseStartY;

            // Updated World Position
            const updatedWorldX = this.dragState.startWorldX + dx;
            const updatedWorldY = this.dragState.startWorldY + dy;

            // Convert back to Local Relative Position for the DOM element
            const localX = updatedWorldX - this.dragState.parentX;
            const localY = updatedWorldY - this.dragState.parentY;

            this.dragState.nodeEl.style.left = localX + 'px';
            this.dragState.nodeEl.style.top = localY + 'px';
        });

        // 3. Transactional Commit
        window.addEventListener('mouseup', () => {
            if (!this.dragState) return;

            const { nodeId, nodeEl, parentX, parentY } = this.dragState;
            const localX = parseFloat(nodeEl.style.left);
            const localY = parseFloat(nodeEl.style.top);

            const worldX = localX + parentX;
            const worldY = localY + parentY;

            const nodeData = this.graphData.nodes.find(n => n.id === nodeId);
            if (nodeData) {
                // Detect new Lane
                const newLaneId = this.detectLaneAt(worldX, worldY);

                if (newLaneId !== nodeData.laneId) {
                    // Handle cross-lane movement: recalculate local coords for new lane
                    const newLaneWorldY = this.getLaneTop(newLaneId);
                    const newLaneWorldX = 100; // Standard for now

                    nodeData.x = worldX - newLaneWorldX;
                    nodeData.y = worldY - newLaneWorldY;
                    nodeData.laneId = newLaneId;
                } else {
                    nodeData.x = localX;
                    nodeData.y = localY;
                }
            }

            this.renderer.render(this.graphData);
            this.dragState = null;
        });
    }

    /**
     * Helper: Get precise Top Y of a lane in World Space
     */
    getLaneTop(laneId) {
        if (!laneId) return 0;
        let currentY = 100;
        const gap = 6; // 用户要求的 6px
        const sortedLanes = [...this.graphData.lanes].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        for (const lane of sortedLanes) {
            if (lane.id === laneId) return currentY;
            currentY += (parseFloat(lane.h) || 220) + gap;
        }
        return 0;
    }

    /**
     * Logic: Detect Lane based on World Coordinates (Sync with Virtual Flex Logic)
     */
    detectLaneAt(worldX, worldY) {
        let currentY = 100;
        const gap = 10;
        const sortedLanes = [...this.graphData.lanes].sort((a, b) => (a.order || 0) - (b.order || 0));

        for (const lane of sortedLanes) {
            const laneTop = currentY;
            const laneBottom = currentY + (lane.h || 220);

            // Check if Y coordinate falls within Lane vertical bounds
            if (worldY >= laneTop && worldY <= laneBottom) {
                return lane.id;
            }

            currentY = laneBottom + gap;
        }
        return null; // Loose node in World Space
    }
}
