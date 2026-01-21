import { useState, useMemo } from 'react';
import { Node } from '@xyflow/react';
import { X, Save, Database, ArrowUpDown, Search, FileText, BarChart3, ExternalLink } from 'lucide-react';
import { NodeKPI, SubActivity, MatrixRoleData } from '../../types/diagram';

interface ProjectDataTableProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: Node[];
    setNodes: (setter: (nodes: Node[]) => Node[]) => void;
}

type Tab = 'kpi' | 'sop';

export default function ProjectDataTable({ isOpen, onClose, nodes, setNodes }: ProjectDataTableProps) {
    const [activeTab, setActiveTab] = useState<Tab>('kpi');
    const [searchTerm, setSearchTerm] = useState('');

    // --- Data Aggregation ---
    // Flatten all KPIs from all nodes
    const flattenKPIs = useMemo(() => {
        const list: any[] = [];
        nodes.forEach(node => {
            if (node.type === 'lane' || !node.data.kpis) return;
            (node.data.kpis as NodeKPI[]).forEach((kpi, index) => {
                list.push({
                    nodeId: node.id,
                    nodeName: node.data.label,
                    kpiIndex: index,
                    ...kpi
                });
            });
        });
        return list;
    }, [nodes]);

    // Flatten all Matrix Tasks from all nodes (New Structure)
    const flattenSOPs = useMemo(() => {
        const list: any[] = [];
        nodes.forEach(node => {
            if (node.type === 'lane' || !node.data.subActivities) return;
            (node.data.subActivities as SubActivity[]).forEach((step: SubActivity, stepIndex: number) => {
                (step.roles || []).forEach((role: MatrixRoleData, roleIndex: number) => {
                    list.push({
                        nodeId: node.id,
                        nodeName: node.data.label,
                        stepId: step.id,
                        stepName: step.name,
                        roleIndex: roleIndex,
                        stepIndex: stepIndex,
                        ...role
                    });
                });
            });
        });
        return list;
    }, [nodes]);

    // --- Handlers ---
    const updateKPI = (nodeId: string, kpiIndex: number, field: keyof NodeKPI, value: string) => {
        setNodes((nds) =>
            nds.map(node => {
                if (node.id !== nodeId) return node;
                const kpis = [...((node.data.kpis as NodeKPI[]) || [])];
                kpis[kpiIndex] = { ...kpis[kpiIndex], [field]: value };
                return { ...node, data: { ...node.data, kpis } };
            })
        );
    };

    const updateMatrix = (nodeId: string, stepIndex: number, roleIndex: number, field: keyof MatrixRoleData | 'stepName', value: string) => {
        setNodes((nds) =>
            nds.map(node => {
                if (node.id !== nodeId) return node;
                const steps = [...((node.data.subActivities as SubActivity[]) || [])];

                if (field === 'stepName') {
                    steps[stepIndex] = { ...steps[stepIndex], name: value };
                } else {
                    const roles = [...steps[stepIndex].roles];
                    roles[roleIndex] = { ...roles[roleIndex], [field]: value };
                    steps[stepIndex] = { ...steps[stepIndex], roles };
                }

                return { ...node, data: { ...node.data, subActivities: steps } };
            })
        );
    };

    // --- Status Logic (Renamed to prevent conflict if exported) ---
    const getKpiStatus = (actual?: string, target?: string, direction: 'higher' | 'lower' = 'higher', warning?: string, critical?: string) => {
        if (!actual || !target) return 'neutral';
        const a = parseFloat(actual);
        const t = parseFloat(target);
        if (isNaN(a) || isNaN(t)) return 'neutral';

        // Resolve thresholds
        let w = warning ? parseFloat(warning) : NaN;
        let c = critical ? parseFloat(critical) : NaN;

        if (direction === 'higher') {
            if (isNaN(w)) w = t * 0.9;
            if (isNaN(c)) c = t * 0.8;

            if (a <= c) return 'red';
            if (a < w) return 'yellow';
            return 'green';
        } else {
            if (isNaN(w)) w = t * 1.1;
            if (isNaN(c)) c = t * 1.2;

            if (a >= c) return 'red';
            if (a > w) return 'yellow';
            return 'green';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'green': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800';
            case 'yellow': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800';
            case 'red': return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 ring-1 ring-rose-200 dark:ring-rose-800';
            default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-x-0 bottom-0 z-[100] h-[60vh] bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex flex-col transition-transform duration-300 animate-in slide-in-from-bottom-10">
            {/* ... Header ... */}
            <div className="h-12 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between px-4 bg-slate-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <Database className="w-4 h-4 text-indigo-500" />
                        全局数据表 (Project Data Table)
                    </div>
                    {/* Tabs */}
                    <div className="flex bg-slate-200 dark:bg-zinc-800 rounded p-1 gap-1">
                        <button
                            onClick={() => setActiveTab('kpi')}
                            className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5
                            ${activeTab === 'kpi' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                            `}
                        >
                            <BarChart3 className="w-3 h-3" />
                            Process KPIs
                        </button>
                        <button
                            onClick={() => setActiveTab('sop')}
                            className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5
                            ${activeTab === 'sop' ? 'bg-white dark:bg-zinc-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                            `}
                        >
                            <FileText className="w-3 h-3" />
                            Matrix Roles
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="搜索..."
                            className="pl-7 pr-2 py-1 text-xs border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-indigo-500 w-40"
                        />
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-500">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-zinc-900 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-32 sticky left-0 bg-slate-50 dark:bg-zinc-900 border-r z-20">
                                所属流程
                            </th>
                            {activeTab === 'kpi' ? (
                                <>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800">指标名称</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-20 text-center">方向</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-24 text-right">目标 (Target)</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-24 text-right bg-indigo-50/20 dark:bg-indigo-900/10">实绩 (Actual)</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-24 text-right text-amber-600">预警线</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-24 text-right text-rose-600">不合格线</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-16 text-center">单位</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-400 border-b dark:border-zinc-800 w-32">Mingdao ID</th>
                                </>
                            ) : (
                                <>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-40">子活动 (Step)</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-32">岗位 (Role)</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800">SOP 内容 (Content)</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800">质量标准 (Standard)</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-32">考核指标 (PI Name)</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-24 text-right">Target</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-24 text-right bg-indigo-50/20 dark:bg-indigo-900/10">Actual</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-500 border-b dark:border-zinc-800 w-16 text-center">Unit</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-slate-400 border-b dark:border-zinc-800 w-32">Mingdao ID</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                        {activeTab === 'kpi' ? (
                            flattenKPIs.filter(r => r.nodeName?.includes(searchTerm) || r.name.includes(searchTerm)).map((row, idx) => {
                                const status = getKpiStatus(row.actual, row.target, row.direction, row.warning, row.critical);
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 group">
                                        <td className="py-2 px-4 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900/50 border-r border-slate-100 dark:border-zinc-800 z-10">
                                            {row.nodeName}
                                        </td>
                                        <td className="py-2 px-4">
                                            <input
                                                className="w-full bg-transparent border-none p-0 text-xs focus:ring-0"
                                                value={row.name}
                                                onChange={(e) => updateKPI(row.nodeId, row.kpiIndex, 'name', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-4 text-center">
                                            <button
                                                onClick={() => updateKPI(row.nodeId, row.kpiIndex, 'direction', row.direction === 'lower' ? 'higher' : 'lower')}
                                                className={`text-[10px] px-1.5 py-0.5 rounded border ${row.direction === 'lower' ? 'border-orange-200 text-orange-600 bg-orange-50' : 'border-blue-200 text-blue-600 bg-blue-50'}`}
                                            >
                                                {row.direction === 'lower' ? '📉 越低' : '📈 越高'}
                                            </button>
                                        </td>
                                        <td className="py-2 px-4 text-right font-mono text-slate-600">
                                            <input
                                                className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 text-right"
                                                value={row.target}
                                                onChange={(e) => updateKPI(row.nodeId, row.kpiIndex, 'target', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-4 text-right font-mono bg-indigo-50/20 dark:bg-indigo-900/10">
                                            <div className={`flex items-center justify-end px-2 py-0.5 rounded font-bold transition-all ${getStatusColor(status)}`}>
                                                <input
                                                    className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 text-right font-inherit text-inherit"
                                                    value={row.actual || ''}
                                                    placeholder="-"
                                                    onChange={(e) => updateKPI(row.nodeId, row.kpiIndex, 'actual', e.target.value)}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-2 px-4 text-right border-l border-slate-100 dark:border-zinc-800 border-dashed">
                                            <input
                                                className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 text-right text-amber-700 dark:text-amber-500 placeholder-amber-300 dark:placeholder-amber-800/50 font-medium"
                                                value={row.warning || ''}
                                                onChange={(e) => updateKPI(row.nodeId, row.kpiIndex, 'warning', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-4 text-right border-l border-slate-100 dark:border-zinc-800 border-dashed">
                                            <input
                                                className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 text-right text-rose-700 dark:text-rose-500 placeholder-rose-300 dark:placeholder-rose-800/50 font-medium"
                                                value={row.critical || ''}
                                                onChange={(e) => updateKPI(row.nodeId, row.kpiIndex, 'critical', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-4 text-center text-slate-500">
                                            <input
                                                className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 text-center"
                                                value={row.unit}
                                                onChange={(e) => updateKPI(row.nodeId, row.kpiIndex, 'unit', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-4">
                                            <input
                                                className="w-full bg-transparent border-none p-0 text-[10px] font-mono text-slate-400 focus:ring-0"
                                                value={row.mingdaoId || ''}
                                                placeholder="UUID..."
                                                onChange={(e) => updateKPI(row.nodeId, row.kpiIndex, 'mingdaoId', e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            flattenSOPs.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                                        暂无 Matrix Role 任务数据
                                    </td>
                                </tr>
                            ) : (
                                flattenSOPs.filter(r => r.sopContent?.includes(searchTerm) || r.roleName?.includes(searchTerm) || r.nodeName?.includes(searchTerm)).map((row, idx) => {
                                    // Matrix Roles don't assume R/Y/G logic as strictly yet (missing warning/critical), 
                                    // but we can reuse status color logic if we have those fields, otherwise just neutral.
                                    // Let's assume neutral or simple green if actual exists.
                                    const status = row.actual ? 'green' : 'neutral';

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 group">
                                            <td className="py-2 px-4 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900/50 border-r border-slate-100 dark:border-zinc-800 z-10">
                                                {row.nodeName}
                                            </td>
                                            <td className="py-2 px-4 text-slate-600 dark:text-slate-400">
                                                <input
                                                    className="w-full bg-transparent border-none p-0 text-xs focus:ring-0"
                                                    value={row.stepName}
                                                    onChange={(e) => updateMatrix(row.nodeId, row.stepIndex, row.roleIndex, 'stepName', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 px-4 text-indigo-600 dark:text-indigo-400">
                                                <input
                                                    className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 font-medium text-indigo-600"
                                                    value={row.roleName}
                                                    onChange={(e) => updateMatrix(row.nodeId, row.stepIndex, row.roleIndex, 'roleName', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 px-4">
                                                <textarea
                                                    className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 resize-none h-6 overflow-hidden focus:h-20 focus:absolute focus:z-50 focus:bg-white focus:shadow-lg focus:p-2"
                                                    value={row.sopContent}
                                                    onChange={(e) => updateMatrix(row.nodeId, row.stepIndex, row.roleIndex, 'sopContent', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 px-4">
                                                <textarea
                                                    className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 resize-none h-6 overflow-hidden"
                                                    value={row.standard}
                                                    onChange={(e) => updateMatrix(row.nodeId, row.stepIndex, row.roleIndex, 'standard', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 px-4">
                                                <input
                                                    className="w-full bg-transparent border-none p-0 text-xs focus:ring-0"
                                                    value={row.piName}
                                                    onChange={(e) => updateMatrix(row.nodeId, row.stepIndex, row.roleIndex, 'piName', e.target.value)}
                                                />
                                            </td>

                                            <td className="py-2 px-4 text-right font-mono">
                                                <input
                                                    className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 text-right"
                                                    value={row.target}
                                                    onChange={(e) => updateMatrix(row.nodeId, row.stepIndex, row.roleIndex, 'target', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 px-4 text-right font-mono bg-indigo-50/20 dark:bg-indigo-900/10">
                                                <div className={`flex items-center justify-end px-2 py-0.5 rounded font-bold transition-all ${getStatusColor(status)}`}>
                                                    <input
                                                        className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 text-right font-inherit text-inherit"
                                                        value={row.actual || ''}
                                                        placeholder="-"
                                                        onChange={(e) => updateMatrix(row.nodeId, row.stepIndex, row.roleIndex, 'actual', e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-2 px-4 text-center text-slate-500">
                                                <input
                                                    className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 text-center"
                                                    value={row.unit}
                                                    onChange={(e) => updateMatrix(row.nodeId, row.stepIndex, row.roleIndex, 'unit', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-2 px-4">
                                                <input
                                                    className="w-full bg-transparent border-none p-0 text-[10px] font-mono text-slate-400 focus:ring-0"
                                                    value={row.mingdaoId || ''}
                                                    placeholder="UUID..."
                                                    onChange={(e) => updateMatrix(row.nodeId, row.stepIndex, row.roleIndex, 'mingdaoId', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Summary */}
            <div className="h-8 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-end px-4 text-[10px] text-slate-400">
                {activeTab === 'kpi' ? `${flattenKPIs.length} KPIs Total` : `${flattenSOPs.length} Steps Total`}
            </div>
        </div>
    );
}
