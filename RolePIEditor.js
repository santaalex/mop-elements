/**
 * RolePIEditor.js
 * Manages "Role Performance Framework" (Responsibilities)
 * "岗位职责编辑器"
 * 
 * Structure:
 * 1. Tasks (Doing what?)
 * 2. Process PIs (Did it right?)
 * 3. Quality PIs (Good result?)
 */

import { MetricFormDrawer } from './components/MetricFormDrawer.js';

export class RolePIEditor {
    constructor(matrixView) {
        this.matrixView = matrixView;
        this.ctx = null; // { activityId, roleId, roleName, nodeName }
        this.data = null; // { tasks: [], processPIs: [], qualityPIs: [] }
        this.overlay = null;
    }

    open(context, currentData) {
        this.ctx = context;
        // Deep copy, ensure arrays exist
        this.data = {
            tasks: currentData?.tasks ? [...currentData.tasks] : [],
            processPIs: currentData?.processPIs ? [...currentData.processPIs] : [], // Legacy or New
            qualityPIs: currentData?.qualityPIs ? [...currentData.qualityPIs] : []
        };
        // Migration: If legacy 'content.tasks' was undefined but 'content' was array (old version)
        // ... handled by MatrixView data adapter usually, but safe check here.

        this.render();
    }

    render() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'fixed inset-0 bg-black/60 z-[110] flex items-center justify-center backdrop-blur-sm';

        const container = document.createElement('div');
        container.className = 'bg-white rounded-xl shadow-2xl w-[800px] h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200';

        // Header
        container.innerHTML = `
            <div class="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                    <h3 class="text-xl font-bold text-slate-800 flex items-center gap-3">
                        <span class="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
                        岗位职责定义
                        <span class="text-sm font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded ml-2">Role PI Editor</span>
                    </h3>
                    <div class="flex gap-4 mt-2 text-sm text-slate-500">
                        <div class="flex items-center gap-1"><span class="font-bold text-slate-700">活动:</span> ${this.ctx.nodeName}</div>
                        <div class="flex items-center gap-1"><span class="font-bold text-slate-700">角色:</span> ${this.ctx.roleName}</div>
                    </div>
                </div>
                <button id="pi-close" class="text-slate-400 hover:text-slate-600 p-1">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div class="flex-1 overflow-hidden flex bg-slate-50/50">
                <!-- Section 1: Tasks (The 'Action') -->
                <div class="flex-1 border-r border-slate-200 flex flex-col min-w-0">
                    <div class="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center">
                        <h4 class="font-bold text-indigo-900 text-sm">🔨 关键动作 (Key Tasks)</h4>
                        <span class="text-[10px] text-indigo-400 uppercase tracking-wider font-bold">Action</span>
                    </div>
                    <div class="p-4 flex-1 overflow-y-auto" id="list-tasks"></div>
                    <div class="p-4 border-t border-slate-100 bg-white">
                        <button class="w-full py-2 border border-dashed border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50 text-sm font-medium" onclick="this.dispatchEvent(new CustomEvent('add-item', {bubbles:true, detail:'tasks'}))">+ 添加动作</button>
                    </div>
                </div>

                <!-- Section 2: Process PIs (The 'Standard') -->
                <div class="flex-1 border-r border-slate-200 flex flex-col min-w-0">
                    <div class="px-4 py-3 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                        <h4 class="font-bold text-blue-900 text-sm">📏 工艺指标 (Process PI)</h4>
                        <span class="text-[10px] text-blue-400 uppercase tracking-wider font-bold">Standard</span>
                    </div>
                    <div class="bg-blue-50/20 px-4 py-2 text-xs text-blue-600 border-b border-blue-100/50">
                        衡量执行过程是否合规，如：步骤完整性、风险点检查等。
                    </div>
                    <div class="p-4 flex-1 overflow-y-auto" id="list-ppi"></div>
                    <div class="p-4 border-t border-slate-100 bg-white">
                        <button class="w-full py-2 border border-dashed border-blue-300 text-blue-600 rounded hover:bg-blue-50 text-sm font-medium" onclick="this.dispatchEvent(new CustomEvent('add-item', {bubbles:true, detail:'processPIs'}))">+ 添加工艺指标</button>
                    </div>
                </div>

                <!-- Section 3: Quality PIs (The 'Result') -->
                <div class="flex-1 flex flex-col min-w-0">
                    <div class="px-4 py-3 bg-amber-50/50 border-b border-amber-100 flex justify-between items-center">
                        <h4 class="font-bold text-amber-900 text-sm">🏆 质量指标 (Quality PI)</h4>
                        <span class="text-[10px] text-amber-400 uppercase tracking-wider font-bold">Result</span>
                    </div>
                    <div class="bg-amber-50/20 px-4 py-2 text-xs text-amber-600 border-b border-amber-100/50">
                        衡量交付成果质量，如：准确率、一次通过率等。
                    </div>
                    <div class="p-4 flex-1 overflow-y-auto" id="list-qpi"></div>
                    <div class="p-4 border-t border-slate-100 bg-white">
                        <button class="w-full py-2 border border-dashed border-amber-300 text-amber-600 rounded hover:bg-amber-50 text-sm font-medium" onclick="this.dispatchEvent(new CustomEvent('add-item', {bubbles:true, detail:'qualityPIs'}))">+ 添加质量指标</button>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
                <button id="pi-cancel" class="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">放弃更改</button>
                <button id="pi-save" class="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/30 transition-all font-bold">保存职责设定</button>
            </div>
        `;

        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);

        this.bindEvents(container);
        this.renderAllLists(container);
    }

    renderAllLists(container) {
        this.renderList(container.querySelector('#list-tasks'), this.data.tasks, 'tasks', '输入关键动作...');
        this.renderList(container.querySelector('#list-ppi'), this.data.processPIs, 'processPIs', '输入合规/工艺标准...');
        this.renderList(container.querySelector('#list-qpi'), this.data.qualityPIs, 'qualityPIs', '输入质量/结果标准...');
    }

    renderList(el, arr, key, placeholder) {
        el.innerHTML = '';
        arr.forEach((text, idx) => {
            // ✅ Backward Compatibility: Normalize data (string → object)
            const item = typeof text === 'string' ? { name: text, metricDef: null } : text;

            // ✅ Fix: Safely extract name (NEVER use object as fallback)
            let itemName = '';
            if (typeof text === 'string') {
                itemName = text;
            } else if (item && typeof item.name === 'string') {
                itemName = item.name;
            }

            // ✅ Visual Feedback: Show badge if metric is defined
            const hasMetric = item.metricDef !== null && item.metricDef !== undefined;
            const metricBadge = hasMetric
                ? '<span class="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded ml-1" title="Metric Defined">📊</span>'
                : '';

            const itemDiv = document.createElement('div');
            itemDiv.className = 'group flex items-start gap-2 mb-3 animate-in slide-in-from-left-2 duration-200';
            itemDiv.innerHTML = `
                <div class="mt-1.5 w-1.5 h-1.5 rounded-full ${key === 'tasks' ? 'bg-indigo-400' : key === 'processPIs' ? 'bg-blue-400' : 'bg-amber-400'}"></div>
                <textarea class="flex-1 text-sm bg-transparent border-b border-transparent focus:border-slate-300 outline-none resize-none overflow-hidden hover:bg-slate-50 rounded px-1 py-0.5 transition-colors placeholder-slate-300" 
                    rows="1" placeholder="${placeholder}">${itemName}</textarea>
                ${metricBadge}
                
                ${(key === 'processPIs' || key === 'qualityPIs') ? `
                    <button class="metric-btn opacity-0 group-hover:opacity-100 text-purple-500 hover:text-purple-700 p-1 transition-all" 
                            data-idx="${idx}" data-key="${key}" title="Define Metric">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                ` : ''}
                
                <button class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1" data-action="delete">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            `;

            // ✅ Auto-resize textarea (fix height collapse)
            const ta = itemDiv.querySelector('textarea');
            ta.style.minHeight = '32px';  // ✅ Prevent collapse
            ta.style.height = 'auto';

            // ✅ Force reflow to ensure scrollHeight is calculated correctly
            void ta.offsetHeight;

            ta.style.height = Math.max(ta.scrollHeight, 32) + 'px';  // ✅ Ensure minimum height

            ta.oninput = (e) => {
                // Update data
                if (typeof arr[idx] === 'string') {
                    arr[idx] = e.target.value;
                } else {
                    arr[idx].name = e.target.value;
                }
                e.target.style.height = 'auto';
                e.target.style.height = Math.max(e.target.scrollHeight, 32) + 'px';
            };

            // ✅ Define Metric button handler (MUI pattern)
            const metricBtn = itemDiv.querySelector('.metric-btn');
            if (metricBtn) {
                metricBtn.onclick = () => this.openMetricEditor(key, idx);
            }

            // Delete
            itemDiv.querySelector('[data-action="delete"]').onclick = () => {
                arr.splice(idx, 1);
                this.renderAllLists(this.overlay); // Re-render to update indices
            };

            el.appendChild(itemDiv);
        });
    }

    /**
     * Open Metric Editor for Process PI or Quality PI
     * 为工艺指标或质量指标打开 Metric 编辑器
     * 
     * Best Practice: Shadcn/MUI pattern - Composition + Clear callbacks
     * 
     * @param {string} key - 'processPIs' or 'qualityPIs'
     * @param {number} idx - Index in array
     */
    openMetricEditor(key, idx) {
        // Normalize current item (backward compatibility)
        const item = this.data[key][idx];
        const itemObj = typeof item === 'string' ? { name: item, metricDef: null } : item;

        console.log(`[RolePIEditor] Opening Metric Editor for: ${itemObj.name}`);

        const drawer = new MetricFormDrawer({
            initialMetric: itemObj.metricDef,
            title: `Define Metric: ${itemObj.name}`,
            onSave: (metric) => {
                console.log('[RolePIEditor] Metric saved:', metric);

                // ✅ Update data structure (backward compatible)
                this.data[key][idx] = {
                    name: itemObj.name,
                    metricDef: metric
                };

                // ✅ Re-render to show badge
                this.renderAllLists(this.overlay);
            },
            onCancel: () => {
                console.log('[RolePIEditor] Metric edit cancelled');
            }
        });

        drawer.open();
    }

    bindEvents(container) {
        // Delegate Add Events
        container.addEventListener('add-item', (e) => {
            const key = e.detail;
            this.data[key].push('');
            this.renderAllLists(container);
            // Focus last item
            const listMap = { tasks: '#list-tasks', processPIs: '#list-ppi', qualityPIs: '#list-qpi' };
            const list = container.querySelector(listMap[key]);
            const inputs = list.querySelectorAll('textarea');
            if (inputs.length > 0) inputs[inputs.length - 1].focus();
        });

        container.querySelector('#pi-save').onclick = () => {
            // ✅ Filter empty (preserve object structure)
            this.data.tasks = this.data.tasks.filter(t => {
                if (typeof t === 'string') return t.trim();
                return t.name && t.name.trim();
            });
            this.data.processPIs = this.data.processPIs.filter(t => {
                if (typeof t === 'string') return t.trim();
                return t.name && t.name.trim();
            });
            this.data.qualityPIs = this.data.qualityPIs.filter(t => {
                if (typeof t === 'string') return t.trim();
                return t.name && t.name.trim();
            });

            if (this.matrixView.saveCellData) {
                this.matrixView.saveCellData(this.ctx.activityId, this.ctx.roleId, this.data);
            }
            this.close();
        };

        container.querySelector('#pi-close').onclick = () => this.close();
        container.querySelector('#pi-cancel').onclick = () => this.close();
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}
