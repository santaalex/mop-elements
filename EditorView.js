import { ProjectService } from './ProjectService.js';
// CDN IMPORT: Gizmo SDK
// LOCAL IMPORT: Gizmo SDK (Patched via importmap)
import { GizmoRenderer } from 'mop-gizmo-sdk';
import { CanvasRenderer } from './CanvasRenderer.js';
import { InteractionManager } from './interactions/InteractionManager.js';
import { ViewportEngine } from 'mop-viewport';
import { LayoutConfig } from './LayoutConfig.js';
import { MatrixView } from './packages/mop-matrix-sdk/index.js'; // ✅ SDK Import

// EXPOSE FOR SDK: Ensure Drag strategies use the same geometry as the renderer
window.LayoutConfig = LayoutConfig;


/**
 * MoP Editor Controller (The Orchestrator)
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
        this.matrixView = null; // <--- Matrix Instance
        this.viewMode = 'canvas'; // 'canvas' | 'matrix'
    }

    async mount(container, params) {
        console.log('[EditorView] Mounting...', params);
        this.projectId = params.id;
        this.container = container;
        container.innerHTML = this.template();

        // ✅ Expose globally for RightSidebar and other components
        window.editorInstance = this;
        console.log('✅ [EditorView] Exposed as window.editorInstance');

        // Setup Layers
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
        gizmoLayer.style.zIndex = 'var(--z-popup)'; // Above nodes / 节点上方

        viewportRoot.appendChild(gizmoLayer);

        // 1. Init Viewport
        requestAnimationFrame(async () => {
            this.initViewport();
            await this.loadProject(); // Loads data
            this.setupToolbar();
        });
    }

    template() {
        return `
            <style>
                .child-events-auto > * { pointer-events: auto !important; }
                /* Recursively ensure the graph layer and its children (lanes/nodes) are interactive */
                #mop-graph-layer * { pointer-events: auto !important; }
            </style>
            <div class="editor-layout h-screen w-screen flex overflow-hidden bg-slate-50">
                <!-- 1. Toolbar (Left) -->
                <div class="toolbar w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 z-[var(--z-shell)] shadow-sm transition-all duration-300">
                    <div class="mb-6 font-bold text-indigo-600 text-xl">M</div>
                    
                    <!-- View Switcher -->
                    <button id="btn-view-canvas" class="w-10 h-10 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1 shadow-inner" title="Canvas View">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                    </button>
                    <button id="btn-view-matrix" class="w-10 h-10 rounded hover:bg-slate-100 text-slate-400 flex items-center justify-center mb-6 transition-colors" title="Matrix View (L3)">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7-8v8m14-8v8M3 6l9-4 9 4M4 10h16v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8z" /></svg>
                    </button>

                    <!-- Divider -->
                    <div class="w-8 h-px bg-slate-200 mb-4"></div>

                    <!-- Tools (Canvas Only) -->
                    <div id="canvas-tools" class="flex flex-col items-center w-full">
                        <button id="tool-pointer" class="w-10 h-10 rounded bg-slate-100 flex items-center justify-center mb-2 text-indigo-600 shadow-inner" title="Pointer">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                        </button>
                        <!-- L2 Tools (Hidden by default in L1) -->
                        <div id="l2-tools" class="flex flex-col items-center w-full" style="display: none;">
                            <button id="btn-add-lane" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-slate-500 transition-colors" title="Add Swimlane">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                        </div>
                        <!-- Common Tools -->
                        <button id="btn-add-node" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-slate-500 transition-colors" title="Add Process Node (Activity)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </button>

                        <!-- BPMN Tools (Start/End) -->
                        <button id="btn-add-start" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-slate-500 transition-colors" title="Start Event">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke-width="1.5"></circle></svg>
                        </button>
                        <button id="btn-add-end" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-slate-500 transition-colors" title="End Event">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke-width="3"></circle></svg>
                        </button>

                        <!-- BPMN Gateways -->
                        <button id="btn-add-xor" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-slate-500 transition-colors" title="XOR Gateway (Exclusive)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 2l10 10-10 10L2 12z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 8l8 8m0-8l-8 8"></path></svg>
                        </button>
                        <button id="btn-add-and" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-slate-500 transition-colors" title="AND Gateway (Parallel)">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 2l10 10-10 10L2 12z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v10M7 12h10"></path></svg>
                        </button>
                        <button id="btn-add-or" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-slate-500 transition-colors" title="OR Gateway (Inclusive)">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 2l10 10-10 10L2 12z"></path><circle cx="12" cy="12" r="5" stroke-width="1.5"></circle></svg>
                        </button>
                         <!-- Drill Down Button (Explicit) -->
                        <button id="btn-drill-down" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-indigo-600 transition-colors" title="Open Detail View (Drill Down)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </button>
                    </div>

                    
                    <div class="flex-grow"></div>

                    <!-- Layout Tools -->
                    <button id="btn-save" class="w-10 h-10 rounded bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center mb-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95" title="Save Project (L1/L2)">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    </button>
                    <button id="btn-back" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors" title="Back to Dashboard">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                </div>

                <!-- 2. Canvas Area -->
                <div id="mop-viewport" class="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing bg-slate-100">
                    
                    <!-- BREADCRUMB BAR (Top Overlay) -->
                    <div id="breadcrumb-bar" class="absolute top-0 left-0 w-full h-12 bg-white/80 backdrop-blur border-b border-slate-200 z-30 flex items-center px-4 shadow-sm">
                        <!-- Content Injected Dynamically -->
                        <div class="flex items-center text-sm text-slate-600">
                            <span class="hover:text-indigo-600 cursor-pointer font-medium" onclick="window.location.hash='#/dashboard'">首页</span>
                            <span class="mx-2 text-slate-400">/</span>
                            <span id="breadcrumb-content" class="flex items-center">Loading...</span>
                        </div>
                    </div>
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

        // --- DEV: Mode Toggle UI ---
        const toggleBtn = document.createElement('div');
        toggleBtn.innerHTML = `
            <div style="position: absolute; top: 10px; right: 10px; z-index: 9999; background: white; padding: 5px 10px; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: flex; gap: 8px; align-items: center; font-family: monospace;">
                <span id="mode-display" style="font-weight: bold; color: #00aaaa;">VIEW MODE</span>
                <button id="mode-switch" style="cursor: pointer; padding: 4px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px;">Switch to EDIT</button>
            </div>
        `;
        this.container.appendChild(toggleBtn);

        // Initialize Toolbar Visibility based on default mode
        const toolbar = document.querySelector('.toolbar');
        if (toolbar) toolbar.style.display = 'none'; // Default VIEW = Hidden

        toggleBtn.querySelector('#mode-switch').addEventListener('click', () => {
            const current = this.interactionManager.mode;
            const next = current === 'VIEW' ? 'EDIT' : 'VIEW';
            this.interactionManager.setMode(next);

            const display = toggleBtn.querySelector('#mode-display');
            const btn = toggleBtn.querySelector('#mode-switch');

            display.textContent = `${next} MODE`;
            display.style.color = next === 'VIEW' ? '#00aaaa' : '#aa00aa';
            btn.textContent = next === 'VIEW' ? 'Switch to EDIT' : 'Switch to VIEW';

            // Toggle Toolbar Visibility
            if (toolbar) {
                toolbar.style.display = next === 'VIEW' ? 'none' : 'flex';
            }
        });

        // --- Unified Interaction System: Business Logic Wiring ---
        // Phase 2: View Mode Listeners
        this.interactionManager.on('node:click', (p) => this.handleNodeClick(p));
        this.interactionManager.on('node:dblclick', (p) => this.handleNodeDblClick(p));

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
            import('mop-gizmo-sdk').then(({ GizmoRenderer }) => {
                console.log('[EditorView] GizmoRenderer Loaded & Initialized');
                this.gizmoRenderer = new GizmoRenderer(gizmoLayer, { editor: this });
            }).catch(err => console.error('[EditorView] Failed to load GizmoRenderer:', err));
        } else {
            console.error('[EditorView] #mop-gizmo-layer NOT FOUND in DOM');
        }

        // ✅ Initialize MatrixView (L3 Matrix Editor Support)
        this.matrixView = new MatrixView(this);
        console.log('[EditorView] MatrixView initialized');
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

            // ✅ Load Matrix Data into MatrixView
            if (this.projectData.matrixData) {
                try {
                    const matrixData = JSON.parse(this.projectData.matrixData);
                    this.matrixView.data = matrixData;
                    console.log('✅ [EditorView] Matrix data loaded:', {
                        roles: Object.keys(matrixData.roles || {}).length,
                        assignments: matrixData.assignments?.length || 0
                    });
                } catch (e) {
                    console.error('❌ Invalid JSON matrix data', e);
                    this.matrixView.data = { roles: {}, assignments: [] };
                }
            } else {
                console.log('🟡 [EditorView] No matrix data, initializing empty');
                this.matrixView.data = { roles: {}, assignments: [] };
            }

            this.renderer.render(this.graphData);

            // Update UI Context (Breadcrumbs & Toolbar)
            this.updateUIContext();

            // Auto-fit (Simple center for now)
            this.viewport.centerOn(1000, 500); // Approximate center of standard canvas

            // --- EXPOSE DRILL DOWN LOGIC ---
            window.drillDown = async (nodeId) => {
                const node = this.graphData.nodes.find(n => n.id === nodeId);
                if (!node) return;

                console.log('[EditorView] DrillDown Triggered for:', node.label);

                // 1. Check if L2 Project already exists
                let targetId = node.linkedProjectId;

                // BUG FIX: Handle object corruption or object wrapping
                if (typeof targetId === 'object' && targetId !== null) {
                    console.warn('[EditorView] Detected Object-type ID, attempting to extract string...', targetId);
                    // Attempt to salvag: rowId, id, or value
                    targetId = targetId.rowId || targetId.id || targetId.value || null;
                    if (!targetId) {
                        console.error('[EditorView] Failed to extract ID from object. Resetting.');
                        targetId = null; // Treat as not linked if corrupted
                    }
                }

                // Specific check for string "[object Object]" which indicates past corruption
                if (targetId === '[object Object]') {
                    targetId = null;
                }

                if (targetId) {
                    // Navigate only (User Request #2)
                    window.location.hash = `#/editor/${targetId}`;
                } else {
                    // 2. Auto-Create L2 Project
                    if (confirm(`是否为节点 "${node.label}" 创建详细流程图 (L2)?`)) {
                        try {
                            const newName = `${node.label} (详细)`;
                            const newProj = await this.projectService.createProject(
                                newName,
                                'System',
                                this.projectId
                            );

                            console.log('[EditorView] Create Project Result:', newProj);

                            // Robust ID Extraction (Handle Mingdao V3 potentially returning Object)
                            let newId = null;
                            if (newProj && newProj.success) {
                                const rawId = newProj.rowId || newProj.id;
                                if (typeof rawId === 'object') {
                                    newId = rawId.rowId || rawId.id || JSON.stringify(rawId); // Fallback
                                    // If rawId is just { success: true, rowId: "..." } nested?? No.
                                    // Assuming rawId is the corrupt object, let's treat it carefully.
                                    // Log it
                                    console.warn('API returned Object ID:', rawId);
                                } else {
                                    newId = rawId;
                                }
                            }

                            if (newId) {
                                // 3. Link L1 Node to New L2 Project
                                this.updateNode(nodeId, { linkedProjectId: newId });
                                await this.projectService.saveCanvas(this.projectId, JSON.stringify(this.graphData));

                                // 4. Navigate
                                window.location.hash = `#/editor/${newId}`;
                            } else {
                                alert('创建子项目失败: ' + (newProj.message || 'API返回格式异常'));
                            }
                        } catch (e) {
                            console.error('DrillDown Error:', e);
                            alert('创建失败: ' + e.message);
                        }
                    }
                }
            };

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

        // Add Node (Process/Activity)
        document.getElementById('btn-add-node').onclick = () => {
            const newNode = {
                id: 'node-' + Date.now(),
                type: 'activity',
                label: '活动Activity',
                x: 250,
                y: 200,
                status: 'normal'
            };
            this.graphData.nodes.push(newNode);
            this.renderer.render(this.graphData);
        };

        // Add Start Event
        document.getElementById('btn-add-start').onclick = () => {
            const newNode = { id: 'node-' + Date.now(), type: 'start', label: '开始', x: 100, y: 200 };
            this.graphData.nodes.push(newNode);
            this.renderer.render(this.graphData);
        };
        // Add End Event
        document.getElementById('btn-add-end').onclick = () => {
            const newNode = { id: 'node-' + Date.now(), type: 'end', label: '结束', x: 500, y: 200 };
            this.graphData.nodes.push(newNode);
            this.renderer.render(this.graphData);
        };
        // Add XOR Gateway
        document.getElementById('btn-add-xor').onclick = () => {
            const newNode = { id: 'node-' + Date.now(), type: 'xor', label: '网关', x: 350, y: 200 };
            this.graphData.nodes.push(newNode);
            this.renderer.render(this.graphData);
        };
        // Add AND Gateway
        document.getElementById('btn-add-and').onclick = () => {
            const newNode = { id: 'node-' + Date.now(), type: 'and', label: '并行', x: 400, y: 200 };
            this.graphData.nodes.push(newNode);
            this.renderer.render(this.graphData);
        };
        // Add OR Gateway
        document.getElementById('btn-add-or').onclick = () => {
            const newNode = { id: 'node-' + Date.now(), type: 'or', label: '相容', x: 450, y: 200 };
            this.graphData.nodes.push(newNode);
            this.renderer.render(this.graphData);
        };

        // --- NEW: View Switching ---
        const btnViewCanvas = document.getElementById('btn-view-canvas');
        if (btnViewCanvas) btnViewCanvas.onclick = () => this.toggleView('canvas');

        const btnViewMatrix = document.getElementById('btn-view-matrix');
        if (btnViewMatrix) btnViewMatrix.onclick = () => this.toggleView('matrix');

        // Drill Down Button
        const btnDrill = document.getElementById('btn-drill-down');
        if (btnDrill) {
            btnDrill.onclick = () => {
                if (this.selection.size !== 1) {
                    alert('请先选择一个节点');
                    return;
                }
                const nodeId = [...this.selection][0];
                if (window.drillDown) window.drillDown(nodeId);
            };
        }

        // Save Button (SSOT Mode)
        const btnSave = document.getElementById('btn-save');
        if (btnSave) {
            btnSave.onclick = async () => {
                await this.save();
            };
        }
    }

    /**
     * Save Project Data to Mingdao V3
     */
    async save() {
        console.log('[EditorView] Saving Project...');
        const btn = document.getElementById('btn-save');
        let originalIcon = '';

        if (btn) {
            originalIcon = btn.innerHTML;
            btn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
        }

        try {
            // Serialize SSOT to string
            const canvasJsonString = JSON.stringify(this.graphData);

            // Handle Matrix Data (Mix of Object or String)
            let matrixJsonString = this.projectData.matrixData;
            // Ensure matrixData is stringified if it's an object
            if (typeof matrixJsonString === 'object') {
                matrixJsonString = JSON.stringify(matrixJsonString);
            }

            // Prepare Update Payload
            const updates = [
                { id: this.projectService.ENV_CONFIG.FIELDS.CANVAS_DATA, value: canvasJsonString },
                { id: this.projectService.ENV_CONFIG.FIELDS.MATRIX_DATA, value: matrixJsonString }
            ];

            // Use updateRow logic here (manual reconstruction as ProjectService.saveCanvas is limited)
            const success = await this.projectService.updateRow(
                this.projectService.ENV_CONFIG.WORKSHEET_ID,
                this.projectId,
                updates
            );

            if (success) {
                console.log('[EditorView] Save Success');
                if (btn) {
                    btn.classList.add('bg-green-600', 'shadow-green-500/50');
                    setTimeout(() => btn.classList.remove('bg-green-600', 'shadow-green-500/50'), 1500);
                }
            } else {
                alert('Save Failed');
            }
        } catch (e) {
            console.error(e);
            alert('Save Error: ' + e.message);
        } finally {
            if (btn) btn.innerHTML = originalIcon || '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>';
        }
    }

    /**
     * Switch between Canvas and Matrix views
     */
    toggleView(mode) {
        this.viewMode = mode;
        const viewport = this.container.querySelector('#mop-viewport');
        // We need a specific container for Matrix
        let mContainer = document.getElementById('mop-matrix-container');

        // Reset Styles
        const btnCanvas = document.getElementById('btn-view-canvas');
        const btnMatrix = document.getElementById('btn-view-matrix');

        if (btnCanvas) btnCanvas.className = `w-10 h-10 rounded flex items-center justify-center mb-1 shadow-inner transition-colors ${mode === 'canvas' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`;
        if (btnMatrix) btnMatrix.className = `w-10 h-10 rounded flex items-center justify-center mb-6 transition-colors ${mode === 'matrix' ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'hover:bg-slate-100 text-slate-400'}`;

        if (mode === 'matrix') {
            // Hide Canvas
            if (viewport) viewport.style.display = 'none';

            // Allow MatrixView to mount itself
            if (!mContainer) {
                mContainer = document.createElement('div');
                mContainer.id = 'mop-matrix-container';
                mContainer.className = 'flex-1 overflow-hidden bg-slate-50';
                const layout = this.container.querySelector('.editor-layout');
                if (layout) layout.appendChild(mContainer);
            }
            if (mContainer) mContainer.style.display = 'block';

            if (!this.matrixView) {
                this.matrixView = new MatrixView(this);
            }
            this.matrixView.mount(mContainer);

            // Hide Canvas-specific tools
            const tools = document.getElementById('canvas-tools');
            if (tools) tools.style.display = 'none';

        } else {
            // Show Canvas
            if (viewport) viewport.style.display = 'block';
            // Hide Matrix
            if (mContainer) mContainer.style.display = 'none';

            // Show Canvas tools
            const tools = document.getElementById('canvas-tools');
            if (tools) tools.style.display = 'flex';

            // Re-render canvas to ensure size is correct
            if (this.viewport) this.viewport.update();
        }
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
    deleteNode(id) {
        if (!id) return;

        console.log('[EditorView] Deleting Element:', id);

        // 1. Try deleting as Edge first (Optimization)
        const edgeIndex = (this.graphData.edges || []).findIndex(e => e.id === id);
        if (edgeIndex !== -1) {
            this.graphData.edges.splice(edgeIndex, 1);
            console.log('[EditorView] Deleted Edge:', id);
        } else {
            // 2. Fallback: Delete as Node (and cascade)
            const initialNodeCount = this.graphData.nodes.length;
            this.graphData.nodes = this.graphData.nodes.filter(n => n.id !== id);

            if (this.graphData.nodes.length < initialNodeCount) {
                // It was a node, cascade delete edges
                this.graphData.edges = (this.graphData.edges || []).filter(e => e.sourceId !== id && e.targetId !== id);
                console.log('[EditorView] Deleted Node and connected edges:', id);
            }
        }

        // 3. Clear Selection (Safety)
        this.selection.delete(id);

        // 4. Update Visuals
        this.renderer.render(this.graphData);
        if (this.gizmoRenderer) {
            this.gizmoRenderer.render(this.selection);
        }
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
     * Update an edge's data and re-render.
     * @param {string} edgeId 
     * @param {Object} partialData - e.g. { label: "Success", labelT: 0.8 }
     */
    updateEdge(edgeId, partialData) {
        const edge = this.graphData.edges.find(e => e.id === edgeId);
        if (!edge) return;

        console.log('[EditorView] Updating Edge:', edgeId, partialData);

        // 1. Merge Data
        Object.assign(edge, partialData);

        // 2. Re-render
        this.renderer.render(this.graphData);
    }

    /**
     * 高星最佳实践：数据驱动的泳道更新逻辑 (Reactive Lane Update)
     */
    updateLane(laneId, partialData) {
        if (!this.graphData.lanes) return;
        const lane = this.graphData.lanes.find(l => l.id === laneId);
        if (!lane) return;

        console.log('[EditorView] Updating Lane:', laneId, partialData);

        // 1. Merge Data
        Object.assign(lane, partialData);

        // 2. Re-render
        this.renderer.render(this.graphData);
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

    /**
     * Phase 2: Business Logic Handlers
     */
    handleNodeClick({ id, nativeEvent }) {
        console.log(`[EditorView] Business Trigger: Node Clicked ID=${id}`);

        const isL2 = this.graphData && this.graphData.lanes && this.graphData.lanes.length > 0;

        if (isL2) {
            console.log(`[EditorView] Action: Open Sidebar for Node ${id}`);
            if (window.openSidebar) window.openSidebar(id);
        } else {
            console.log(`[EditorView] Action: Drill Down to L2 for Node ${id}`);
            if (window.drillDown) window.drillDown(id);
        }
    }

    handleNodeDblClick({ id, nativeEvent }) {
        console.log(`[EditorView] Business Trigger: Node Double-Clicked ID=${id}`);

        // ✅ Get node type
        const node = this.graphData.nodes.find(n => n.id === id);

        if (node && node.type === 'activity') {
            console.log(`[EditorView] Opening L3 Matrix for Activity ${id}`);
            // Open L3 Multi-Role SOP Matrix
            if (this.matrixView && this.matrixView.roleSOPMatrixEditor) {
                this.matrixView.roleSOPMatrixEditor.open({ activityId: id });
            } else {
                console.error('[EditorView] MatrixView not initialized!');
            }
        } else {
            console.log(`[EditorView] Action: Open L3 Modal for Node ${id}`);
            if (window.openL3Modal) window.openL3Modal(id);
        }
    }

    /**
     * Updates visual attributes (selected="true") on DOM elements based on logical selection.
     * This supplements the GizmoRenderer which only draws overlays.
     */
    updateSelectionVisuals() {
        // 1. Clear all selected states first (simpler than tracking diffs)
        const allSelected = this.container.querySelectorAll('[selected="true"]');
        allSelected.forEach(el => el.setAttribute('selected', 'false'));

        // 2. Apply new selection
        this.selection.forEach(id => {
            // Try explicit selectors for performance
            const node = this.container.querySelector(`mop-node[id="${id}"]`);
            if (node) {
                node.setAttribute('selected', 'true');
            } else {
                const edge = this.container.querySelector(`mop-edge[id="${id}"]`);
                if (edge) edge.setAttribute('selected', 'true');
            }
        });
    }

    /**
     * Save Project (graphData + matrixData to Mingdao Cloud)
     * Called by MatrixEditor, RightSidebar, or Save button
     */
    async save() {
        if (!this.projectId || !this.projectData) {
            console.warn('[EditorView] Cannot save: missing projectId or projectData');
            return false;
        }

        try {
            // 1. Sync matrixData from MatrixView
            if (this.matrixView && this.matrixView.data) {
                this.projectData.matrixData = this.matrixView.data;
            }

            // 2. Call ProjectService
            const result = await this.projectService.saveProject(
                this.projectId,
                this.graphData,
                this.projectData.matrixData || { roles: {}, assignments: [] }
            );

            if (result.success) {
                console.log('✅ [EditorView] Project saved successfully');
                return true;
            } else {
                console.error('❌ [EditorView] Save failed:', result);
                alert('保存失败，请重试');
                return false;
            }
        } catch (error) {
            console.error('[EditorView] Save error:', error);
            alert('保存失败: ' + error.message);
            return false;
        }
    }

    /**
     * Updates the UI based on Project Context (L1 vs L2)
     */
    updateUIContext() {
        if (!this.projectData) return;
        const isL2 = !!this.projectData.parent; // Check if we have a parent

        // 1. Update Breadcrumbs (Header)
        const breadcrumbEl = document.getElementById('breadcrumb-content');
        if (breadcrumbEl) {
            let html = '';
            if (isL2) {
                // Show Parent Link
                html += `
                    <span class="hover:text-indigo-600 cursor-pointer text-indigo-500" 
                          onclick="window.location.hash='#/editor/${this.projectData.parent.id}'">
                          ${this.projectData.parent.name}
                    </span>
                    <span class="mx-2 text-slate-400">/</span>
                `;
            }
            // Show Current Project
            html += `<span class="font-bold text-slate-800">${this.projectData.name}</span>`;
            breadcrumbEl.innerHTML = html;
        }

        // 2. Update Toolbar (Left)
        const l2Tools = document.getElementById('l2-tools');
        if (l2Tools) {
            // Only show Swimlane tools if we are in L2 (have a parent)
            l2Tools.style.display = isL2 ? 'flex' : 'none';
        }
    }
}
