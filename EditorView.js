import { ProjectService } from './ProjectService.js';
// CDN IMPORT: Gizmo SDK
// LOCAL IMPORT: Gizmo SDK (Patched via importmap)
import { GizmoRenderer } from 'mop-gizmo-sdk';
import { CanvasRenderer } from './CanvasRenderer.js';
import { InteractionManager } from './interactions/InteractionManager.js';
import { ViewportEngine } from 'mop-viewport';
import { LayoutConfig } from './LayoutConfig.js';
import { RoleSOPMatrixEditor } from '@mop/matrix-sdk/';
import { EditorController } from './interactions/EditorController.js';
import { MockMingdaoService } from './MockMingdaoService.js';
import { Modal } from 'mop-modal'; // ✅ CDN 导入到 CDN

// EXPOSE FOR SDK: Ensure Drag strategies use the same geometry as the renderer
window.LayoutConfig = LayoutConfig;


/**
 * MoP Editor Controller (The Orchestrator)
 */
export class EditorView {
    constructor() {
        // Phase 2 Step 1: Initialize Controller
        this.controller = new EditorController(this);

        this.renderer = null;
        this.viewport = null;
        this.dragState = null;
        this.selection = new Set(); // Selection State (Set of Node IDs)
        this.projectService = new ProjectService();
        this.mockService = new MockMingdaoService(); // <--- Mock Service for Data Middle Platform
        this.simulationInterval = null; // Timer for data loop
        this.renderer = null;
        this.gizmoRenderer = null; // Interface Painter
        this.roleSOPMatrixEditor = null; // <--- L3 Matrix Editor Instance
        this.viewMode = 'canvas'; // 'canvas' | 'matrix'
    }

    // Phase 2 Step 2: SSOT Getters/Setters
    get projectId() { return this.controller.model.projectId; }
    set projectId(val) { this.controller.model.projectId = val; }
    get projectData() { return this.controller.model.projectData; }
    set projectData(val) { this.controller.model.projectData = val; }
    get graphData() { return this.controller.model.graphData; }
    set graphData(val) { this.controller.model.graphData = val; }

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
                    <!-- Tools (Canvas Only) -->
                    <div id="canvas-tools" class="flex flex-col items-center w-full">
                        <button id="tool-pointer" class="w-10 h-10 rounded bg-slate-100 flex items-center justify-center mb-2 text-indigo-600 shadow-inner" title="选择/移动">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                        </button>

                        <!-- ═══════════════ Group 1: 泳道 (Swimlane) ═══════════════ -->
                        <div class="w-8 h-px bg-slate-200 my-2"></div>
                        <div id="l2-tools" class="flex flex-col items-center w-full">
                            <button id="btn-add-lane" class="w-10 h-10 rounded hover:bg-cyan-50 flex items-center justify-center mb-2 text-cyan-600 transition-colors border border-transparent hover:border-cyan-200" title="添加泳道">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                        </div>

                        <!-- ═══════════════ Group 2: 动作节点 (Action Nodes) ═══════════════ -->
                        <div class="w-8 h-px bg-slate-200 my-2"></div>
                        <!-- Process Node: Indigo color, hierarchy/sub-process icon -->
                        <button id="btn-add-process" class="w-10 h-10 rounded hover:bg-indigo-50 flex items-center justify-center mb-2 text-indigo-600 transition-colors border border-transparent hover:border-indigo-200" title="添加子流程 (可下钻)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="8" height="6" rx="1" stroke-width="1.5"/>
                                <rect x="13" y="15" width="8" height="6" rx="1" stroke-width="1.5"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 9v3a2 2 0 002 2h4M17 12v3"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 11l-2 2 2 2"/>
                            </svg>
                        </button>
                        <!-- Activity Node: Emerald color, task/checklist icon -->
                        <button id="btn-add-activity" class="w-10 h-10 rounded hover:bg-emerald-50 flex items-center justify-center mb-2 text-emerald-600 transition-colors border border-transparent hover:border-emerald-200" title="添加活动 (配置 SOP)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="4" y="4" width="16" height="16" rx="2" stroke-width="1.5"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"/>
                            </svg>
                        </button>

                        <!-- ═══════════════ Group 3: 开始/结束 (Start/End) ═══════════════ -->
                        <div class="w-8 h-px bg-slate-200 my-2"></div>
                        <button id="btn-add-start" class="w-10 h-10 rounded hover:bg-green-50 flex items-center justify-center mb-2 text-green-600 transition-colors border border-transparent hover:border-green-200" title="开始">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke-width="1.5"></circle></svg>
                        </button>
                        <button id="btn-add-end" class="w-10 h-10 rounded hover:bg-rose-50 flex items-center justify-center mb-2 text-rose-600 transition-colors border border-transparent hover:border-rose-200" title="结束">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke-width="3"></circle></svg>
                        </button>

                        <!-- ═══════════════ Group 4: 网关 (Gateways) ═══════════════ -->
                        <div class="w-8 h-px bg-slate-200 my-2"></div>
                        <button id="btn-add-xor" class="w-10 h-10 rounded hover:bg-amber-50 flex items-center justify-center mb-2 text-amber-600 transition-colors border border-transparent hover:border-amber-200" title="排他网关 (XOR)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 2l10 10-10 10L2 12z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 8l8 8m0-8l-8 8"></path></svg>
                        </button>
                        <button id="btn-add-and" class="w-10 h-10 rounded hover:bg-amber-50 flex items-center justify-center mb-2 text-amber-600 transition-colors border border-transparent hover:border-amber-200" title="并行网关 (AND)">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 2l10 10-10 10L2 12z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v10M7 12h10"></path></svg>
                        </button>
                        <button id="btn-add-or" class="w-10 h-10 rounded hover:bg-amber-50 flex items-center justify-center mb-2 text-amber-600 transition-colors border border-transparent hover:border-amber-200" title="相容网关 (OR)">
                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 2l10 10-10 10L2 12z"></path><circle cx="12" cy="12" r="5" stroke-width="1.5"></circle></svg>
                        </button>

                        <!-- ═══════════════ Group 5: 动作下钻 (Drill Down) ═══════════════ -->
                        <div class="w-8 h-px bg-slate-200 my-2"></div>
                        <button id="btn-drill-down" class="w-10 h-10 rounded hover:bg-violet-50 flex items-center justify-center mb-2 text-violet-600 transition-colors border border-transparent hover:border-violet-200" title="进入详细视图 (下钻)">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </button>
                    </div>

                    
                    <div class="flex-grow"></div>

                    <!-- Layout Tools -->
                    <button id="btn-save" class="w-10 h-10 rounded bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center mb-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95" title="保存项目">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    </button>
                    <button id="btn-back" class="w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors" title="返回仪表盘">
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
                            <span id="breadcrumb-content" class="flex items-center">加载中...</span>
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
                        <span id="project-title">加载中...</span> | 缩放: <span id="viewport-scale">100%</span>
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

        // --- DEV: Mode Toggle UI & Mock Data UI ---
        const toggleBtn = document.createElement('div');
        toggleBtn.innerHTML = `
            <div style="position: absolute; top: 10px; right: 10px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                <!-- Mode Toggle -->
                <div style="background: white; padding: 5px 10px; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: flex; gap: 8px; align-items: center; font-family: monospace;">
                    <span id="mode-display" style="font-weight: bold; color: #00aaaa;">预览模式</span>
                    <button id="mode-switch" style="cursor: pointer; padding: 4px 8px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px;">切换编辑模式</button>
                </div>
                
                <!-- Data Simulator -->
                <button id="btn-simulate-data" style="
                    cursor: pointer; 
                    padding: 6px 12px; 
                    background: #10b981; 
                    color: white; 
                    border: none; 
                    border-radius: 6px; 
                    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.2);
                    font-family: monospace;
                    font-weight: bold;
                    transition: all 0.2s;
                    display: flex; align-items: center; gap: 6px;
                ">
                    <svg style="width:16px;height:16px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    连接数据中台
                </button>
                <div id="simulation-status" style="font-size: 10px; color: #64748b; font-family: monospace; display: none;">
                    DATA LINK ACTIVE • 1.0Hz
                </div>
            </div>
        `;
        this.container.appendChild(toggleBtn);

        // Initialize Toolbar Visibility based on default mode
        const toolbar = document.querySelector('.toolbar');
        if (toolbar) toolbar.style.display = 'none'; // Default VIEW = Hidden

        toggleBtn.querySelector('#mode-switch').addEventListener('click', () => {
            const current = this.interactionManager.mode;
            const next = current === 'VIEW' ? 'EDIT' : 'VIEW';
            this.interactionManager.deactivateStrategy();
            this.interactionManager.setMode(next);

            const display = toggleBtn.querySelector('#mode-display');
            const btn = toggleBtn.querySelector('#mode-switch');

            display.textContent = `${next === 'VIEW' ? '预览' : '编辑'}模式`;
            display.style.color = next === 'VIEW' ? '#00aaaa' : '#aa00aa';
            btn.textContent = next === 'VIEW' ? '切换编辑模式' : '切换预览模式';

            // Toggle Toolbar Visibility
            if (toolbar) {
                toolbar.style.display = next === 'VIEW' ? 'none' : 'flex';
            }
        });

        // --- Data Simulation Logic ---
        const simBtn = toggleBtn.querySelector('#btn-simulate-data');
        const simStatus = toggleBtn.querySelector('#simulation-status');

        simBtn.addEventListener('click', () => {
            if (this.simulationInterval) {
                // Stop
                clearInterval(this.simulationInterval);
                this.simulationInterval = null;
                simBtn.innerHTML = `
                    <svg style="width:16px;height:16px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    连接数据中台
                `;
                simBtn.style.background = '#10b981'; // Green
                simStatus.style.display = 'none';
                console.log('[EditorView] Simulation Stopped');

                // Clear KPIs (Optional - keep last state for visual persistence)
            } else {
                // Start
                console.log('[EditorView] Starting Data Simulation...');
                simBtn.innerHTML = `
                    <svg style="width:16px;height:16px" fill="none" class="animate-spin" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    断开连接
                `;
                simBtn.style.background = '#ef4444'; // Red
                simStatus.style.display = 'block';

                // Initial Fetch
                this.fetchAndRenderKPIs();

                // Loop
                this.simulationInterval = setInterval(() => {
                    this.fetchAndRenderKPIs();
                }, 2000); // Update every 2 seconds
            }
        });

        // --- Unified Interaction System: Business Logic Wiring ---
        // Phase 2: View Mode Listeners
        this.interactionManager.on('node:click', (p) => this.handleNodeClick(p));
        this.interactionManager.on('node:select', (p) => this.handleNodeSelect(p)); // [Phase 1 UX]
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

        // ✅ Initialize L3 Matrix Editor (Direct Injection)
        this.roleSOPMatrixEditor = new RoleSOPMatrixEditor(this);
        console.log('[EditorView] RoleSOPMatrixEditor initialized');
    }

    async loadProject() {
        const titleEl = document.getElementById('project-title');

        try {
            // Phase 2 Step 3: Delegate to Controller
            await this.controller.loadProject(this.projectId);

            // View Layer: UI Updates
            if (this.projectData) {
                titleEl.innerText = this.projectData.name;
            }

            // ❌ MatrixView data sync removed (MatrixView deleted)
            // RoleSOPMatrixEditor manages its own data directly

            this.renderer.render(this.graphData);

            // Update UI Context (Breadcrumbs & Toolbar)
            this.updateUIContext();

            // Reset View to Top-Left (High Star Practice)
            this.viewport.resetToOrigin(80, 1.0); // 80px padding for "Breathable" layout

            // --- EXPOSE DRILL DOWN LOGIC ---
            /**
             * Phase 2 Step 4: Drill-down handler with Mode Check
             */
            this.setupDrillDownHandler();
        } catch (err) {
            console.error('[EditorView] Load Error:', err);
            const titleEl = document.getElementById('project-title');
            if (titleEl) titleEl.innerText = 'Error Loading Project';
        }
    }

    /**
     * Phase 2 Step 4: Drill-down handler with Mode Check
     */
    setupDrillDownHandler() {
        console.log('[EditorView] Initializing DrillDown Handler');
        window.drillDown = async (nodeId) => {
            console.log('[EditorView] DrillDown clicked:', nodeId);

            // 0. Fetch Node (Crucial Fix for ReferenceError)
            const node = this.controller.getNode(nodeId);
            if (!node) {
                console.error('[EditorView] Node not found:', nodeId);
                return;
            }

            // 1. Check for existing Child Project (Navigation Priority)
            let targetId = node.linkedProjectId;
            // Clean up potentially corrupted IDs
            if (typeof targetId === 'object' && targetId !== null) {
                targetId = targetId.rowId || targetId.id || targetId.value || null;
            }
            if (targetId === '[object Object]') targetId = null;

            if (targetId) {
                // Scenario A: Child Project Exists -> Navigate Immediately
                console.log(`[EditorView] Navigating to existing child project: ${targetId}`);
                window.location.hash = `#/editor/${targetId}`;
                return; // ✅ Exit early, skip mode checks
            }

            // 2. No Child Project -> Check Mode for Creation Flow
            // Step 4.2: Mode Check Foundation
            let currentMode = 'VIEW'; // Default safe mode
            if (this.interactionManager && this.interactionManager.modeStateMachine) {
                currentMode = this.interactionManager.modeStateMachine.currentState;
            }
            console.log('[EditorView] Current Mode:', currentMode);

            // ✅ Best Practice (Figma): Single Warning + User Preference
            if (currentMode === 'VIEW') {
                // Check user preference
                const hideWarning = localStorage.getItem('hideEmptyProcessWarning');
                if (hideWarning === 'true') {
                    console.log('[DrillDown] User chose to hide warning, skipping');
                    return;
                }

                // Show warning with unified Modal API
                Modal.warning({
                    title: '该流程暂无子流程',
                    content: `节点 "${node.label}" 尚未关联子流程。\n请切换到编辑模式以创建子流程。`,
                    checkbox: {
                        label: '不再显示此提示',
                        key: 'hideEmptyProcessWarning'
                    }
                });
                return;
            }

            // EDIT Mode: Create Child Project
            if (currentMode === 'EDIT') {
                Modal.confirm({
                    title: '创建详细流程图',
                    content: `是否为节点 "${node.label}" 创建详细流程图 (L2)?`,
                    okText: '创建',
                    cancelText: '取消',
                    onOk: async () => {
                        try {
                            const newName = `${node.label} (详细)`;
                            const newId = await this.controller.createChildProject(newName, this.projectId);

                            // Update Model (SSOT)
                            this.controller.updateNode(nodeId, { linkedProjectId: newId });

                            // Save Changes
                            await this.save();

                            // Navigate
                            window.location.hash = `#/editor/${newId}`;
                            console.log('✅ [EditorView] Drill-Down Created & Navigated:', newId);
                        } catch (e) {
                            console.error('DrillDown Error:', e);
                            Modal.error({
                                title: '创建失败',
                                content: '创建子流程失败: ' + e.message
                            });
                        }
                    }
                });
            }
        };
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
                name: '新泳道',
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

        // Add Process Node (子流程 - 可下钻到 L2)
        document.getElementById('btn-add-process').onclick = () => {
            const newNode = {
                id: 'node-' + Date.now(),
                type: 'process',
                label: '新建子流程',
                x: 250,
                y: 200,
                status: 'normal'
            };
            this.graphData.nodes.push(newNode);
            this.renderer.render(this.graphData);
            console.log('[Editor] Added Process Node:', newNode.id);
        };

        // Add Activity Node (活动 - 配置 SOP)
        document.getElementById('btn-add-activity').onclick = () => {
            const newNode = {
                id: 'node-' + Date.now(),
                type: 'activity',
                label: '新建活动',
                x: 300,
                y: 200,
                status: 'normal'
            };
            this.graphData.nodes.push(newNode);
            this.renderer.render(this.graphData);
            console.log('[Editor] Added Activity Node:', newNode.id);
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

        // [Phase 1 UX] Properties Panel Toggle (Left Toolbar)
        // Manual trigger for Side Panel in EDIT mode
        const btnProps = document.createElement('button');
        btnProps.id = 'btn-toggle-props';
        btnProps.className = 'w-10 h-10 rounded hover:bg-slate-100 flex items-center justify-center mb-2 text-slate-500 transition-colors border border-transparent hover:border-slate-300';
        btnProps.title = '属性面板 (选节点后开启)';
        btnProps.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>`;

        // Insert before Save button (or at specific position)
        if (btnSave && btnSave.parentNode) {
            btnSave.parentNode.insertBefore(btnProps, btnSave);
        }

        btnProps.onclick = () => {
            // 1. Get Selected Node
            if (this.selection.size !== 1) {
                // Toast or Alert
                console.warn('[EditorView] No node selected for properties');
                // Optional: Toggle sidebar closed if nothing selected?
                return;
            }
            const nodeId = [...this.selection][0];
            console.log(`[EditorView] Manual Property Toggle: ${nodeId}`);
            if (window.openSidebar) window.openSidebar(nodeId);
        };
    }

    /**
     * Save Project Data to Mingdao V3
     */
    /**
     * Switch between Canvas andMatrix views
     */
    toggleView(mode) {
        this.viewMode = mode;
        const viewport = this.container.querySelector('#mop-viewport');
        // We need a specific container for Matrix
        let mContainer = document.getElementById('mop-matrix-container');

        // Reset Styles


        if (mode === 'matrix') {
            // Hide Canvas
            if (viewport) viewport.style.display = 'none';

            // ❌ Old MatrixView mount logic removed
            if (!mContainer) {
                mContainer = document.createElement('div');
                mContainer.id = 'mop-matrix-container';
                mContainer.className = 'flex-1 overflow-hidden bg-slate-50';
                const layout = this.container.querySelector('.editor-layout');
                if (layout) layout.appendChild(mContainer);
            }

            // ❌ MatrixView.mount() removed - L3 Matrix uses overlay pattern now

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

        // 4. Auto-Save
        this.debounceSave();
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

        // Auto-Save
        this.debounceSave();
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

        // Auto-Save
        this.debounceSave();
    }

    /**
     * Auto-Save with Debounce (High-Star Practice)
     * Prevent API flooding during high-frequency interactions.
     */
    debounceSave() {
        // 1. Clear existing timer
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }

        console.log('[EditorView] Change detected. Auto-save in 2s...');

        // Optional: Visual Feedback here (e.g., make Save button yellow)
        const btn = document.getElementById('btn-save');
        if (btn) {
            // Subtle indication that a save is pending could go here
        }

        // 2. Set new timer (2000ms)
        this._saveTimer = setTimeout(async () => {
            await this.save();
            this._saveTimer = null;
        }, 2000);
    }

    /**
     * Data Loop: Fetch from Platform -> Update UI
     */
    async fetchAndRenderKPIs() {
        if (!this.graphData || !this.graphData.nodes) return;

        // 1. Get Node IDs/Codes
        const nodeCodes = this.graphData.nodes.map(n => n.id);

        // 2. Call Mock Service
        try {
            const data = await this.mockService.getRealTimeKPIs(nodeCodes);
            console.log('[EditorView] Received Data Middle Platform packet:', data.length);

            // 3. Selective Update (No Re-render)
            this.renderer.updateNodeKPIs(data);
        } catch (e) {
            console.error('[EditorView] Data Middle Platform Error:', e);
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

    /**
     * [Phase 1 UX] Edit Mode Selection Handler
     * Just logs the selection. Visuals are handled by GizmoRenderer/Strategies.
     */
    handleNodeSelect({ id, nativeEvent }) {
        console.log(`[EditorView] Node Selected (Edit Mode): ${id}`);
        // No Sidebar Open!
    }

    handleNodeDblClick({ id, nativeEvent }) {
        console.log(`[EditorView] Business Trigger: Node Double-Clicked ID=${id}`);

        // ✅ Get node type
        const node = this.graphData.nodes.find(n => n.id === id);
        if (!node) return;

        console.log(`[EditorView] Node Type: ${node.type}`);

        // Strategy V2: Switch on Node Type
        if (node.type === 'process') {
            // Scene 1: Sub-Process Node -> Drill Down
            console.log('[EditorView] Process Node -> Delegating to DrillDown');
            if (window.drillDown) {
                window.drillDown(id);
            }
        }
        else if (node.type === 'activity') {
            // Scene 2: Activity Node -> Open L3 Matrix (SOP)
            console.log(`[EditorView] Activity Node -> Opening L3 Matrix`);

            // Get current mode from InteractionManager
            const currentMode = this.interactionManager.mode;
            const isReadOnly = (currentMode === 'VIEW');

            console.log(`[EditorView] Current mode: ${currentMode}, readOnly: ${isReadOnly}`);

            if (this.roleSOPMatrixEditor) {
                this.roleSOPMatrixEditor.open(
                    { activityId: id },
                    { readOnly: isReadOnly }
                );
            } else {
                console.error('[EditorView] RoleSOPMatrixEditor not initialized!');
            }
        }
        else {
            // Scene 3: Other Nodes (Start/End/Gateway) -> Default Property Modal (if any)
            console.log(`[EditorView] Action: Open Default Property Modal for Node ${id}`);
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
    /**
     * Phase 2 Step 5: Save Project with UI Feedback
     * Delegates to EditorController for logic, handles UI animation here.
     */
    async save() {
        console.log('[EditorView] Saving Project...');
        const btn = document.getElementById('btn-save');
        let originalIcon = '';

        // 1. UI: Start Loading Logic
        if (btn) {
            originalIcon = btn.innerHTML; // Save original icon (save disk)
            // Spinner Icon
            btn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
        }

        try {
            // 2. Sync View State to Controller Model
            // ❌ MatrixView→Model sync removed (RoleSOPMatrixEditor saves directly)

            // 3. Delegate Save to Controller
            // Controller handles serialization and API calls
            await this.controller.save();

            // 4. UI: Success Logic
            console.log('✅ [EditorView] Save Success');
            if (btn) {
                btn.classList.add('bg-green-600', 'shadow-green-500/50');
                // Checkmark Icon
                btn.innerHTML = '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';

                // Reset after 1.5s
                setTimeout(() => {
                    btn.classList.remove('bg-green-600', 'shadow-green-500/50');
                    // Retrieve original icon (which might have been lost if we didn't store it well? No, we have origIcon)
                    // But in case the button was refreshed, we provide fallback.
                    // Actually, let's just put back the Save Disk icon hardcoded to be safe or original.
                    btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>';
                }, 1500);
            }

            return true;
        } catch (error) {
            console.error('[EditorView] Save error:', error);
            alert('保存失败: ' + error.message);
            // UI: Error Reset
            if (btn) btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>';
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
        // FIX: Swimlane tools now always visible (no L1/L2 distinction)
        // const l2Tools = document.getElementById('l2-tools');
        // if (l2Tools) {
        //     l2Tools.style.display = isL2 ? 'flex' : 'none';
        // }
    }
}
