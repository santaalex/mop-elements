/**
 * MetricCard.js
 * 
 * 展示组件：显示 KPI/PI 卡片信息
 * Display Component: Shows KPI/PI card information
 * 
 * @returns {string} HTML string
 */
import { MetricTrafficLight } from './MetricTrafficLight.js';
import { formatMetricValue, calcMetricStatus, MetricDirection } from '../packages/mop-metric-sdk/MetricCore.js';

/**
 * @param {Object} props
 * @param {Object} props.metric - The metric object / 指标对象
 * @param {boolean} [props.showActions] - Whether to show edit/delete actions / 是否显示操作按钮
 * @returns {string} HTML string
 */
export function MetricCard({ metric, showActions = true }) {
    const status = calcMetricStatus(metric);
    const valueStr = formatMetricValue(metric.currentValue, metric.unit);
    const targetStr = formatMetricValue(metric.targetValue, metric.unit);

    const directionIcon = metric.direction === MetricDirection.HigherBetter ? '↑'
        : metric.direction === MetricDirection.LowerBetter ? '↓'
            : '=';

    // Tailwind classes
    // p-4 bg-white rounded-lg border shadow-sm hover:border-purple-300 transition-colors

    return `
        <div class="metric-card bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between gap-3 group hover:border-purple-300 transition-colors" data-id="${metric.id}">
            <!-- Left: Status & Info -->
            <div class="flex items-center gap-3">
                <div class="flex-shrink-0 pt-1">
                    ${MetricTrafficLight({ status, size: 12 })}
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-slate-700 leading-tight">${metric.name}</h4>
                    <div class="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span class="bg-slate-100 px-1.5 rounded text-slate-600 font-mono">${valueStr}</span>
                        <span class="text-slate-400">Target: ${targetStr} (${directionIcon})</span>
                    </div>
                </div>
            </div>

            <!-- Right: Actions (Hidden by default, shown on hover) -->
            ${showActions ? `
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="p-1.5 text-slate-400 hover:text-purple-600 rounded hover:bg-purple-50 btn-edit-metric" title="Edit / 编辑">
                    <svg class="w-4 h-4" fill="none" class="w-6 h-6" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
            </div>
            ` : ''}
        </div>
    `;
}
