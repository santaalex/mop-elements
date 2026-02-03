/**
 * MetricForm.js
 * 
 * 编辑器组件：创建或修改指标
 * Editor Component: Create or edit metrics
 */
import { createMetric, MetricDirection } from '@mop/metric-sdk';

export class MetricForm {
    /**
     * @param {Object} options
     * @param {Object} [options.initialMetric] - Metric to edit (null for new) / 初始指标 (null表示新建)
     * @param {Function} options.onSubmit - Callback(metric) / 提交回调
     * @param {Function} options.onCancel - Callback() / 取消回调
     */
    constructor({ initialMetric = null, onSubmit, onCancel }) {
        // Factory creates defaults if initialMetric is null
        // 工厂函数处理默认值
        this.metric = initialMetric ? { ...initialMetric } : createMetric();
        this.onSubmit = onSubmit;
        this.onCancel = onCancel;
        this.container = null;
    }

    render() {
        this.container = document.createElement('div');
        this.container.className = 'bg-white p-6 rounded-lg shadow-lg border border-slate-100 w-full max-w-md';

        const isNew = !this.metric.name || this.metric.name === 'New Metric';
        const title = isNew ? 'Add Metric / 添加指标' : 'Edit Metric / 编辑指标';

        this.container.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold text-slate-800">${title}</h3>
                <button type="button" class="btn-cancel text-slate-400 hover:text-slate-600">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <form class="space-y-4">
                <!-- Name -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Name / 名称</label>
                    <input type="text" name="name" value="${this.metric.name}" class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-purple-500 outline-none" placeholder="e.g. Efficiency">
                </div>

                <!-- Direction -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Direction / 评价方向</label>
                    <select name="direction" class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-purple-500 outline-none">
                        <option value="${MetricDirection.HigherBetter}" ${this.metric.direction === MetricDirection.HigherBetter ? 'selected' : ''}>Higher is Better (指标越高越好)</option>
                        <option value="${MetricDirection.LowerBetter}" ${this.metric.direction === MetricDirection.LowerBetter ? 'selected' : ''}>Lower is Better (指标越低越好)</option>
                    </select>
                </div>

                <!-- Grid for Values -->
                <div class="grid grid-cols-2 gap-4">
                    <!-- Target -->
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Target / 目标值</label>
                        <input type="number" name="targetValue" value="${this.metric.targetValue}" class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-purple-500 outline-none">
                    </div>
                    <!-- Unit -->
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Unit / 单位</label>
                        <input type="text" name="unit" value="${this.metric.unit}" class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-purple-500 outline-none" placeholder="%, h, $">
                    </div>
                </div>

                <!-- Warning Threshold -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Warning / 警戒线</label>
                    <div class="flex items-center gap-2">
                         <input type="number" name="warningThreshold" value="${this.metric.warningThreshold ?? ''}" class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-purple-500 outline-none" placeholder="Optional">
                         <span class="text-xs text-slate-400">?</span>
                    </div>
                    <p class="text-xs text-slate-400 mt-1">Leave empty to use Target as warning line. / 留空则默认目标值即为警戒线。</p>
                </div>

                <!-- Current Value (moved after warning) -->
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Current Value / 当前值</label>
                    <input type="number" name="currentValue" value="${this.metric.currentValue ?? ''}" class="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-purple-500 outline-none" placeholder="输入实际值">
                    <p class="text-xs text-slate-400 mt-1">Leave empty if not measured yet / 尚未测量可留空</p>
                </div>

                <!-- Buttons -->
                <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button type="button" class="btn-cancel px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm transition-colors">Cancel / 取消</button>
                    <button type="submit" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow text-sm font-medium transition-colors">Save / 保存</button>
                </div>
            </form>
        `;

        this.bindEvents();
        return this.container;
    }

    bindEvents() {
        if (!this.container) return;

        const form = this.container.querySelector('form');

        // Input Binding
        form.querySelectorAll('input, select').forEach(input => {
            input.oninput = (e) => {
                const field = e.target.name;
                let val = e.target.value;
                if (e.target.type === 'number') val = parseFloat(val) || 0;
                this.metric[field] = val;
            };
        });

        // Submit
        form.onsubmit = (e) => {
            e.preventDefault();
            if (this.onSubmit) this.onSubmit(this.metric);
        };

        // Cancel
        this.container.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.onclick = () => {
                if (this.onCancel) this.onCancel();
            };
        });
    }
}
