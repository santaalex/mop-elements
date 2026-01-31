import { ViewportEngine } from './ViewportEngine.js';
// Cloud Atoms (Correctly imported as MoPLane/MoPNode)
import { MoPLane } from 'https://cdn.jsdelivr.net/gh/santaalex/mop-elements/LaneComponent.js';
import { MoPNode } from 'https://cdn.jsdelivr.net/gh/santaalex/mop-elements/NodeComponent.js';

export class EditorView {
    constructor() {
        this.engine = null;
    }

    async render(params) {
        const projectId = params.projectId || 'demo';

        return `
            <div class="test-stage-container w-full h-screen bg-slate-50 relative overflow-hidden flex flex-col">
                <!-- Toolbar / Header -->
                <div class="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 z-10 shrink-0 shadow-sm">
                    <div class="flex items-center gap-4">
                        <button id="btnBack" class="text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            返回
                        </button>
                        <div class="h-4 w-px bg-slate-300"></div>
                        <h1 class="text-slate-800 font-medium text-sm">项目 ID: <span class="text-blue-600 font-mono font-bold">#${projectId}</span></h1>
                    </div>
                    
                    <div class="flex items-center gap-3">
                         <div id="connection-status" class="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-200">
                            <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span class="text-xs font-semibold">Cloud Connected</span>
                        </div>
                    </div>
                </div>

                <!-- Canvas Container -->
                <div id="viewport" class="flex-1 w-full relative bg-[#f8fafc] overflow-hidden cursor-grab active:cursor-grabbing">
                    <!-- Grid Layer -->
                    <div id="grid-layer" class="absolute inset-0 pointer-events-none opacity-40" 
                         style="background-image: radial-gradient(#cbd5e1 1.5px, transparent 1.5px); background-size: 24px 24px;">
                    </div>

                    <!-- Content Layer (The World) -->
                    <div id="world-layer" class="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform">
                        <!-- Atoms will be injected here -->
                    </div>
                </div>
                
                <!-- Helper for dev -->
                <div class="absolute bottom-4 right-4 text-xs text-slate-400 pointer-events-none select-none">
                     Goldmine V3 Engine (Light)
                </div>
            </div>
        `;
    }

    afterRender(params) {
        console.log('[Editor] Initializing ViewportEngine...');

        // 1. Initialize Engine
        this.engine = new ViewportEngine('viewport', 'world-layer');

        // 2. Bind Back Button
        document.getElementById('btnBack').onclick = () => {
            window.location.hash = '#/dashboard';
        };

        // 3. Load Project Data
        this.loadProjectData(params.projectId);
    }

    async loadProjectData(projectId) {
        console.log(`[Editor] Loading Cloud Atoms for project ${projectId}...`);
        const world = document.getElementById('world-layer');

        // --- Demo Data: Procurement Process ---

        // Helper to create Lane
        const createLane = (id, title, x, y, w, h) => {
            const lane = new MoPLane();
            lane.id = id;
            lane.setAttribute('name', title); // Correct attribute: name, not title
            lane.setAttribute('width', w + 'px'); // Correct: needs 'px'
            lane.setAttribute('height', h + 'px'); // Correct: needs 'px'
            // Absolute positioning in World
            lane.style.position = 'absolute';
            lane.style.left = x + 'px';
            lane.style.top = y + 'px';
            return lane;
        };

        // Helper to create Node
        const createNode = (id, label, x, y, status) => {
            const node = new MoPNode();
            node.id = id;
            node.setAttribute('label', label);
            // Node positioning is implicitly handled by style top/left if the component supports it,
            // or we force it here. Based on NodeComponent.js, it likely styles itself.
            // Let's enforce absolute position here to be safe.
            node.style.position = 'absolute';
            node.style.left = x + 'px';
            node.style.top = y + 'px';

            // Assume Node has a status attribute or setter
            if (status) node.setAttribute('status', status);
            return node;
        };

        // 1. Lanes (泳道)
        const lane1 = createLane('lane-1', '采购部', 100, 100, 800, 250);
        const lane2 = createLane('lane-2', '财务部', 100, 350, 800, 250);

        world.appendChild(lane1);
        world.appendChild(lane2);

        // 2. Nodes (节点)
        // Node A: 提交申请 (In Lane 1)
        const nodeA = createNode('node-1', '提交采购申请', 200, 180, 'success');

        // Node B: 部门审批 (In Lane 1)
        const nodeB = createNode('node-2', '部门经理审批', 500, 180, 'processing');

        // Node C: 财务付款 (In Lane 2)
        const nodeC = createNode('node-3', '财务打款', 500, 450, 'pending');

        world.appendChild(nodeA);
        world.appendChild(nodeB);
        world.appendChild(nodeC);

        // Center view
        setTimeout(() => this.engine.centerOn(400, 300), 100);
    }
}
