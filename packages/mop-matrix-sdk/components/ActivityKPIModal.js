/**
 * ActivityKPIModal.js
 * Manages "Activity Performance Indicators" (Results)
 * "大家共同的考卷"
 */
export class ActivityKPIModal {
    constructor(matrixView) {
        this.matrixView = matrixView;
        this.nodeId = null;
        this.nodeLabel = '';
        this.kpis = [];
        this.overlay = null;
    }

    open(nodeId, nodeLabel, currentKpis = []) {
        this.nodeId = nodeId;
        this.nodeLabel = nodeLabel;
        // Deep copy to avoid mutating state directly before save
        this.kpis = JSON.parse(JSON.stringify(currentKpis));
        this.render();
    }

    render() {
        // 1. Create Overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm';

        // 2. Create Modal Container
        const container = document.createElement('div');
        container.className = 'bg-white rounded-lg shadow-2xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200';

        // 3. Header
        container.innerHTML = `
            <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span class="w-1 h-6 bg-purple-600 rounded-full"></span>
                        ${this.nodeLabel} - KPI 管理
                    </h3>
                    <p class="text-xs text-slate-500 mt-0.5">衡量此流程节点产出的关键结果指标 (Key Performance Indicators)</p>
                </div>
                <button id="modal-close" class="text-slate-400 hover:text-slate-600 transition-colors">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div class="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                <!-- KPI List -->
                <div id="kpi-list" class="space-y-3"></div>

                <!-- Empty State -->
                <div id="kpi-empty" class="hidden text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg mt-2">
                    <div class="mb-2">📊</div>
                    暂无 KPI 指标，请点击下方按钮添加
                </div>

                <!-- Add Button -->
                <button id="btn-add-kpi" class="mt-4 w-full py-2 border-2 border-dashed border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all font-medium flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                    添加关键指标
                </button>
            </div>

            <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
                <button id="modal-cancel" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">取消</button>
                <button id="modal-save" class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg shadow-purple-500/30 transition-all font-medium">保存指标</button>
            </div>
        `;

        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);

        // 4. Bind Events
        this.bindEvents(container);
        this.renderList(container);
    }

    renderList(container) {
        const listEl = container.querySelector('#kpi-list');
        const emptyEl = container.querySelector('#kpi-empty');
        listEl.innerHTML = '';

        if (this.kpis.length === 0) {
            emptyEl.classList.remove('hidden');
        } else {
            emptyEl.classList.add('hidden');
            this.kpis.forEach((kpi, index) => {
                const item = document.createElement('div');
                item.className = 'bg-white p-4 rounded-lg border border-slate-200 shadow-sm group hover:border-purple-300 transition-colors flex gap-4 items-start';
                item.innerHTML = `
                    <div class="flex-1 grid grid-cols-12 gap-3">
                        <div class="col-span-5">
                            <label class="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">指标名称</label>
                            <input type="text" value="${kpi.name}" class="kpi-name w-full text-sm border-b border-slate-200 focus:border-purple-500 outline-none py-1 bg-transparent font-medium text-slate-700 placeholder-slate-300" placeholder="如: 合同评审时长">
                        </div>
                        <div class="col-span-3">
                            <label class="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">目标值</label>
                            <input type="text" value="${kpi.target}" class="kpi-target w-full text-sm border-b border-slate-200 focus:border-purple-500 outline-none py-1 bg-transparent font-medium text-purple-600 placeholder-slate-300" placeholder="< 48h">
                        </div>
                        <div class="col-span-4">
                            <label class="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">类型</label>
                            <select class="kpi-type w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-purple-500 text-slate-600">
                                <option value="efficiency" ${kpi.type === 'efficiency' ? 'selected' : ''}>Efficiency (效率)</option>
                                <option value="quality" ${kpi.type === 'quality' ? 'selected' : ''}>Quality (质量)</option>
                                <option value="cost" ${kpi.type === 'cost' ? 'selected' : ''}>Cost (成本)</option>
                            </select>
                        </div>
                    </div>
                    <button class="text-slate-300 hover:text-red-500 transition-colors pt-4 btn-delete-kpi">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                `;

                // Bind Live Inputs
                item.querySelector('.kpi-name').oninput = (e) => this.kpis[index].name = e.target.value;
                item.querySelector('.kpi-target').oninput = (e) => this.kpis[index].target = e.target.value;
                item.querySelector('.kpi-type').onchange = (e) => this.kpis[index].type = e.target.value;
                item.querySelector('.btn-delete-kpi').onclick = () => {
                    this.kpis.splice(index, 1);
                    this.renderList(container);
                };

                listEl.appendChild(item);
            });
        }
    }

    bindEvents(container) {
        // Add KPI
        container.querySelector('#btn-add-kpi').onclick = () => {
            this.kpis.push({ id: 'kpi-' + Date.now(), name: '', target: '', type: 'efficiency' });
            this.renderList(container);
        };

        // Save
        container.querySelector('#modal-save').onclick = () => {
            // Validate
            const validKpis = this.kpis.filter(k => k.name.trim() !== '');
            // Call Parent Callback
            if (this.matrixView.saveKpis) {
                this.matrixView.saveKpis(this.nodeId, validKpis);
            }
            this.close();
        };

        // Close/Cancel
        container.querySelector('#modal-close').onclick = () => this.close();
        container.querySelector('#modal-cancel').onclick = () => this.close();
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}
