
import { MetricCard } from './components/MetricCard.js';
import { MetricForm } from './components/MetricForm.js';
import { createMetric } from './packages/mop-metric-sdk/MetricCore.js';

/**
 * RightSidebar Component / 右侧边栏组件
 * 
 * Implements a sliding drawer pattern for managing Activity KPIs.
 * 实现用于管理活动 KPI 的侧滑抽屉模式。
 * 
 * Architecture:
 * - Singleton-ish usage (one sidebar per page) / 单例模式 (每页一个侧边栏)
 * - Manages its own visibility state (isOpen) / 自行管理可见性状态
 * - Decoupled from Canvas logic (receives nodeId, fetches data) / 与画布逻辑解耦 (接收 nodeId, 获取数据)
 */
export class RightSidebar {
    constructor() {
        this.isOpen = false;
        this.activeNodeId = null;
        this.container = null;
        this.overlay = null;
        this.panel = null;

        // Temporary Mock Data Storage (Will be replaced by ProjectService later)
        // 临时模拟数据存储 (稍后将被 ProjectService 替换)
        this.mockData = new Map();

        // Debounce timer for label input (High-Star Best Practice: Excalidraw pattern)
        // Label 输入防抖计时器 (高星最佳实践: Excalidraw 模式)
        this.labelInputDebounce = null;

        this.init();
    }

    init() {
        console.log('[RightSidebar] Initializing DOM...');
        // 1. Create Invisible Click Area (High-Star Best Practice: Figma Pattern)
        // 创建不可见点击区域 (高星最佳实践：Figma 模式)
        this.overlay = document.createElement('div');
        // CRITICAL FIX: Only cover area LEFT of sidebar to avoid blocking Gizmo layer
        // 关键修复：仅覆盖侧边栏左侧区域，避免阻挡 Gizmo 层
        this.overlay.className = 'fixed top-0 left-0 bottom-0 z-[var(--z-drawer)] hidden';
        this.overlay.style.right = '384px'; // w-96 = 384px, leave space for panel
        this.overlay.style.background = 'transparent';
        this.overlay.style.pointerEvents = 'auto'; // Capture clicks when visible

        // Single click: close sidebar
        this.overlay.addEventListener('click', (e) => {
            this.close();
        });

        // Double click: pass through to underlying node (High-Star Best Practice)
        // 双击：穿透到底层节点（高星最佳实践）
        this.overlay.addEventListener('dblclick', (e) => {
            console.log('[RightSidebar] DblClick detected, passing through to underlying element...');

            // Temporarily disable overlay to allow HitTest to find the node
            this.overlay.style.pointerEvents = 'none';

            // Get the element underneath at the same coordinates
            const underlyingElement = document.elementFromPoint(e.clientX, e.clientY);

            // Re-enable overlay immediately
            this.overlay.style.pointerEvents = 'auto';

            if (underlyingElement) {
                // Dispatch a new dblclick event to the underlying element
                const newEvent = new MouseEvent('dblclick', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: e.clientX,
                    clientY: e.clientY
                });
                underlyingElement.dispatchEvent(newEvent);
            }
        });

        document.body.appendChild(this.overlay);

        // 2. Create Panel / 创建面板
        this.panel = document.createElement('div');
        this.panel.className = 'fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-[var(--z-drawer)] transform transition-transform duration-300 translate-x-full border-l border-slate-200 flex flex-col';
        this.panel.innerHTML = `
            <!-- Header: Node Label Editing -->
            <div class="border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                <div class="flex items-center justify-between mb-3">
                    <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">节点名称 / Node Label</label>
                    <button id="rs-close-btn" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <input 
                    id="rs-node-label" 
                    type="text" 
                    class="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    placeholder="Activity Name">
                
                <!-- KPI Section Title -->
                <div class="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200">
                    <span class="text-sm font-semibold text-slate-700">📊 关键指标 / KPIs</span>
                    <span id="rs-kpi-count" class="text-xs text-slate-400 font-normal">(0)</span>
                </div>
            </div>

            <!-- Content Area (Scrollable) -->
            <div id="rs-content" class="flex-1 overflow-y-auto p-6 space-y-4">
                <!-- Metrics will be injected here / 指标将注入此处 -->
            </div>

            <!-- Footer (Actions) -->
            <div class="p-6 border-t border-slate-100 bg-slate-50">
                <button id="rs-add-btn" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Add KPI / 添加指标
                </button>
            </div>
        `;
        document.body.appendChild(this.panel);

        // 3. Bind Events / 绑定事件
        this.panel.querySelector('#rs-close-btn').addEventListener('click', () => this.close());
        this.panel.querySelector('#rs-add-btn').addEventListener('click', () => this.showAddForm());
        console.log('[RightSidebar] DOM elements attached.');
    }

    /**
     * Open the sidebar for a specific node
     * 打开特定节点的侧边栏
     * @param {string} nodeId 
     */
    open(nodeId) {
        console.log(`[RightSidebar] Opening for nodeId: ${nodeId}`);
        this.activeNodeId = nodeId;
        this.isOpen = true;

        // Show invisible click area
        this.overlay.classList.remove('hidden');

        // Slide in panel (no overlay fade needed)
        setTimeout(() => {
            this.panel.classList.remove('translate-x-full');
            console.log('[RightSidebar] Panel slid in.');
        }, 10);

        // ✅ NEW: Load and bind label input (Excalidraw Auto-save Pattern)
        // 新增：加载并绑定 Label 输入 (Excalidraw 自动保存模式)
        const labelInput = this.panel.querySelector('#rs-node-label');
        if (labelInput) {
            const node = this.getNodeData(nodeId);
            labelInput.value = node?.label || 'Untitled Activity';

            // Remove old listeners to prevent duplicates
            labelInput.replaceWith(labelInput.cloneNode(true));
            const freshInput = this.panel.querySelector('#rs-node-label');

            // Auto-save with 500ms debounce (Ant Design Form pattern)
            freshInput.addEventListener('input', (e) => {
                clearTimeout(this.labelInputDebounce);
                this.labelInputDebounce = setTimeout(() => {
                    this.updateNodeLabel(nodeId, e.target.value.trim());
                }, 500);
            });
        }

        this.renderList();
    }

    /**
     * Close the sidebar
     * 关闭侧边栏
     */
    close() {
        console.log('[RightSidebar] Closing...');
        this.isOpen = false;
        this.activeNodeId = null;

        // Slide out panel
        this.panel.classList.add('translate-x-full');

        // Hide click area after animation
        setTimeout(() => {
            if (!this.isOpen) {
                this.overlay.classList.add('hidden');
            }
        }, 300); // Match panel transition duration
    }

    /**
     * Get node data from editor instance
     * 从编辑器实例获取节点数据
     * @param {string} nodeId 
     * @returns {Object|null}
     */
    getNodeData(nodeId) {
        const editor = window.editorInstance || (window.router && window.router.currentView);
        if (editor && editor.graphData && editor.graphData.nodes) {
            return editor.graphData.nodes.find(n => n.id === nodeId);
        }
        console.warn('[RightSidebar] Editor instance not found for getNodeData');
        return null;
    }

    /**
     * Update node label with auto-save (High-Star Best Practice: Excalidraw)
     * 更新节点标签并自动保存 (高星最佳实践: Excalidraw)
     * @param {string} nodeId 
     * @param {string} newLabel 
     */
    updateNodeLabel(nodeId, newLabel) {
        if (!newLabel) {
            console.warn('[RightSidebar] Empty label rejected');
            return;
        }

        const editor = window.editorInstance || (window.router && window.router.currentView);
        if (!editor || !editor.graphData) {
            console.error('[RightSidebar] Editor instance not found for updateNodeLabel');
            return;
        }

        const node = editor.graphData.nodes.find(n => n.id === nodeId);
        if (node) {
            const oldLabel = node.label;
            console.log(`[RightSidebar] Updating label: "${oldLabel}" → "${newLabel}"`);
            node.label = newLabel;

            // ✅ Sync to Canvas DOM (Real-time update)
            const nodeEl = document.querySelector(`mop-node[id="${nodeId}"]`);
            if (nodeEl) {
                nodeEl.setAttribute('label', newLabel);
                console.log(`[RightSidebar] Canvas node label updated`);
            }

            // ✅ Persist to backend (Debounced auto-save)
            if (editor.save) {
                editor.save().then(() => {
                    console.log('✅ [RightSidebar] Label saved to backend');
                }).catch(err => {
                    console.error('❌ [RightSidebar] Label save failed:', err);
                });
            } else {
                console.warn('[RightSidebar] editor.save() not available');
            }
        }
    }

    /**
     * Render the list of metrics for the active node
     * 渲染当前节点的指标列表
     */
    renderList() {
        const container = this.panel.querySelector('#rs-content');
        container.innerHTML = ''; // Clear previous

        const metrics = this.getMetricsForNode(this.activeNodeId);

        // ✅ Update KPI count badge
        const countEl = this.panel.querySelector('#rs-kpi-count');
        if (countEl) {
            countEl.textContent = `(${metrics.length})`;
        }

        if (metrics.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10 text-slate-400">
                    <div class="text-4xl mb-3 opacity-20">📉</div>
                    <p class="text-sm">No KPIs defined yet.<br>暂无 KPI 指标。</p>
                </div>
            `;
            return;
        }

        metrics.forEach(metric => {
            // Create wrapper for rendering HTML string to DOM
            const wrapper = document.createElement('div');
            wrapper.innerHTML = MetricCard({ metric });

            // Add click listener to Edit button if present
            const editBtn = wrapper.querySelector('.btn-edit-metric');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showEditForm(metric);
                });
            }

            container.appendChild(wrapper.firstElementChild);
        });
    }

    showAddForm() {
        const container = this.panel.querySelector('#rs-content');
        container.innerHTML = ''; // Clear list

        const form = new MetricForm({
            onSubmit: (newMetric) => {
                this.saveMetric(newMetric);
                this.renderList(); // Go back to list
            },
            onCancel: () => {
                this.renderList(); // Go back to list
            }
        });

        container.appendChild(form.render());
    }

    showEditForm(metric) {
        const container = this.panel.querySelector('#rs-content');
        container.innerHTML = '';

        const form = new MetricForm({
            initialMetric: metric,
            onSubmit: (updatedMetric) => {
                this.saveMetric(updatedMetric); // In a real app, this might merge or update
                this.renderList();
            },
            onCancel: () => {
                this.renderList();
            }
        });

        container.appendChild(form.render());
    }

    // --- Data Management (Bridging with EditorView State) ---
    // --- 数据管理 (与编辑器状态联通) ---

    getMetricsForNode(nodeId) {
        // High-Star Best Practice: Try to find data in the global orchestrator (EditorView)
        // 最佳实践：从全局控制器中获取实时状态
        const editor = window.editorInstance || (window.router && window.router.currentView);

        console.log('🔍 [DEBUG] getMetricsForNode - nodeId:', nodeId);
        console.log('🔍 [DEBUG] getMetricsForNode - editor:', editor);

        if (editor && editor.graphData && editor.graphData.nodes) {
            const node = editor.graphData.nodes.find(n => n.id === nodeId);
            console.log('🔍 [DEBUG] getMetricsForNode - found node:', node);

            if (node && node.properties && node.properties.kpis) {
                console.log('✅ [DEBUG] getMetricsForNode - returning KPIs:', node.properties.kpis);
                return node.properties.kpis;
            }
        }

        console.warn('⚠️ [DEBUG] getMetricsForNode - fallback to mockData');
        // Fallback to internal mockData during transition
        if (!this.mockData.has(nodeId)) {
            return [];
        }
        return this.mockData.get(nodeId);
    }

    saveMetric(metric) {
        if (!this.activeNodeId) return;

        // 1. Update Global State (EditorView)
        // Try multiple ways to get editor instance
        const editor = window.editorInstance || (window.router && window.router.currentView);
        let updatedLocally = false;

        console.log('🔍 [DEBUG] saveMetric - editor:', editor);
        console.log('🔍 [DEBUG] saveMetric - editor.graphData:', editor?.graphData);
        console.log('🔍 [DEBUG] saveMetric - nodes count:', editor?.graphData?.nodes?.length);

        if (editor && editor.graphData && editor.graphData.nodes) {
            const node = editor.graphData.nodes.find(n => n.id === this.activeNodeId);
            console.log('🔍 [DEBUG] saveMetric - found node:', node);

            if (node) {
                if (!node.properties) node.properties = {};
                if (!node.properties.kpis) node.properties.kpis = [];

                const index = node.properties.kpis.findIndex(m => m.id === metric.id);
                if (index >= 0) {
                    node.properties.kpis[index] = metric;
                } else {
                    node.properties.kpis.push(metric);
                }
                updatedLocally = true;
                console.log(`✅ [RightSidebar] Updated Editor State for node ${this.activeNodeId}`, metric);
                console.log(`✅ [RightSidebar] Node now has ${node.properties.kpis.length} KPIs`);

                // ✅ CRITICAL FIX: Persist to Mingdao Cloud
                if (editor.save) {
                    editor.save().then(() => {
                        console.log('✅ [RightSidebar] KPI saved to backend');
                    }).catch(err => {
                        console.error('❌ [RightSidebar] Save failed:', err);
                    });
                } else {
                    console.error('❌ [RightSidebar] editor.save() not found!');
                }
            } else {
                console.error('❌ [RightSidebar] Node not found:', this.activeNodeId);
            }
        } else {
            console.error('❌ [RightSidebar] Editor or graphData not available');
        }

        // 2. Fallback to Mock Data (if not in EditorView context)
        if (!updatedLocally) {
            console.warn('⚠️ [RightSidebar] Falling back to mockData');
            let list = this.mockData.get(this.activeNodeId) || [];
            const index = list.findIndex(m => m.id === metric.id);
            if (index >= 0) list[index] = metric;
            else list.push(metric);
            this.mockData.set(this.activeNodeId, list);
            console.log(`Saved metric locally for node ${this.activeNodeId}`, metric);
        }
    }
}

// Export a singleton instance or the class
// 导出单例实例或类
// For now, we attach it to window for easy debugging access by EditorView
window.RightSidebar = RightSidebar;

/**
 * High-Star Best Practice: Global Hook Registration
 * 最佳实践：全局钩子注册，实现解耦集成
 */
window.openSidebar = (nodeId) => {
    if (window.sidebarInstance) {
        window.sidebarInstance.open(nodeId);
    } else {
        console.warn('[RightSidebar] Global instance not found.');
    }
};
