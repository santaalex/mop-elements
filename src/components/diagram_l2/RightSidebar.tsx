import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { X, Settings2, FileText, BarChart3, ChevronRight, Plus, ChevronDown, User, Trash2 } from 'lucide-react';

interface SopRole {
    id: string;
    roleName: string;
    taskDesc: string;
    pi: string;
    target: string;
}

interface SopStep {
    id: string;
    name: string;
    roles: SopRole[];
}

interface RightSidebarProps {
    selectedNodeId: string | null;
    nodes: Node[];
    setNodes: (setter: (nodes: Node[]) => Node[]) => void;
}

export default function RightSidebar({ selectedNodeId, nodes, setNodes }: RightSidebarProps) {
    const [activeTab, setActiveTab] = useState<'kpi' | 'sop'>('kpi');
    const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

    // Derive the live node object from the state to ensure we always have the latest data
    const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

    if (!selectedNode || selectedNode.type === 'lane') return null; // Don't show for lanes or empty

    const toggleStep = (stepId: string) => {
        setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
    };

    // --- Helper to update node data ---
    const updateNodeData = (newData: any) => {
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === selectedNode.id) {
                    return { ...n, data: { ...n.data, ...newData } };
                }
                return n;
            })
        );
    };

    // --- KPI Helpers ---
    const addKpi = () => {
        const kpis = (selectedNode.data.kpis as any[]) || [];
        const newKpi = {
            id: Date.now().toString(),
            name: '新指标',
            target: '100',
            unit: '%',
        };
        updateNodeData({ kpis: [...kpis, newKpi] });
    };

    const updateKpi = (index: number, field: string, value: string) => {
        const kpis = [...((selectedNode.data.kpis as any[]) || [])];
        kpis[index] = { ...kpis[index], [field]: value };
        updateNodeData({ kpis });
    };

    const deleteKpi = (id: string) => {
        const kpis = (selectedNode.data.kpis as any[]) || [];
        updateNodeData({ kpis: kpis.filter((k) => k.id !== id) });
    };

    // --- SOP Helpers ---
    const addSopStep = () => {
        const steps = (selectedNode.data.sop_steps as SopStep[]) || [];
        const newStep: SopStep = {
            id: Date.now().toString(),
            name: '新子活动 (Sub-activity)',
            roles: []
        };
        // Auto-expand the new step
        setExpandedSteps(prev => ({ ...prev, [newStep.id]: true }));
        updateNodeData({ sop_steps: [...steps, newStep] });
    };

    const deleteSopStep = (stepId: string) => {
        if (!confirm('确定删除此子活动及其所有岗位条目吗？')) return;
        const steps = (selectedNode.data.sop_steps as SopStep[]) || [];
        updateNodeData({ sop_steps: steps.filter(s => s.id !== stepId) });
    };

    const updateSopStepName = (stepIndex: number, name: string) => {
        const steps = [...((selectedNode.data.sop_steps as SopStep[]) || [])];
        steps[stepIndex] = { ...steps[stepIndex], name };
        updateNodeData({ sop_steps: steps });
    };

    const addRoleToStep = (stepIndex: number) => {
        const steps = [...((selectedNode.data.sop_steps as SopStep[]) || [])];
        const newRole: SopRole = {
            id: Date.now().toString(),
            roleName: '岗位名称',
            taskDesc: '',
            pi: '',
            target: ''
        };
        steps[stepIndex] = { ...steps[stepIndex], roles: [...steps[stepIndex].roles, newRole] };
        updateNodeData({ sop_steps: steps });
    };

    const deleteRoleFromStep = (stepIndex: number, roleId: string) => {
        const steps = [...((selectedNode.data.sop_steps as SopStep[]) || [])];
        steps[stepIndex] = {
            ...steps[stepIndex],
            roles: steps[stepIndex].roles.filter(r => r.id !== roleId)
        };
        updateNodeData({ sop_steps: steps });
    };

    const updateRoleData = (stepIndex: number, roleIndex: number, field: keyof SopRole, value: string) => {
        const steps = [...((selectedNode.data.sop_steps as SopStep[]) || [])];
        const roles = [...steps[stepIndex].roles];
        roles[roleIndex] = { ...roles[roleIndex], [field]: value };
        steps[stepIndex] = { ...steps[stepIndex], roles };
        updateNodeData({ sop_steps: steps });
    };

    return (
        <div className="absolute top-20 right-6 z-50 w-80">
            {/* Glassmorphism Card */}
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 animate-in slide-in-from-right-10 fade-in">

                {/* Header */}
                <div className="h-12 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between px-4 bg-white/50 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <Settings2 className="w-4 h-4 text-indigo-500" />
                        节点属性
                    </div>
                    {/* Node Label (Quick Edit) */}
                    <input
                        type="text"
                        value={(selectedNode.data.label as string) || ''}
                        onChange={(e) => updateNodeData({ label: e.target.value })}
                        className="text-right bg-transparent border-none text-xs font-medium text-slate-500 hover:text-indigo-600 focus:ring-0 w-32"
                    />
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                    <button
                        onClick={() => setActiveTab('kpi')}
                        className={`flex-1 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5
                        ${activeTab === 'kpi' ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        <BarChart3 className="w-3 h-3" />
                        Process KPI
                    </button>
                    <button
                        onClick={() => setActiveTab('sop')}
                        className={`flex-1 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5
                        ${activeTab === 'sop' ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        <FileText className="w-3 h-3" />
                        SOP Matrix
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-4 min-h-[300px] max-h-[60vh] overflow-y-auto custom-scrollbar">

                    {/* KPI TAB */}
                    {activeTab === 'kpi' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    流程节点指标 ({((selectedNode.data.kpis as any[]) || []).length})
                                </h3>
                                <button onClick={addKpi} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-indigo-600">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {((selectedNode.data.kpis as any[]) || []).length === 0 ? (
                                    <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-lg">
                                        <div className="text-xs text-slate-400">暂无指标</div>
                                    </div>
                                ) : (
                                    ((selectedNode.data.kpis as any[]) || []).map((kpi: any, index: number) => {
                                        const getKpiStatus = (actual: string, target: string, direction: string = 'higher', warning: string, critical: string) => {
                                            if (!actual || !target) return 'neutral';
                                            const a = parseFloat(actual);
                                            const t = parseFloat(target);
                                            if (isNaN(a) || isNaN(t)) return 'neutral';

                                            let w = parseFloat(warning);
                                            let c = parseFloat(critical);

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

                                        const status = getKpiStatus(kpi.actual, kpi.target, kpi.direction, kpi.warning, kpi.critical);

                                        // Card Style (Outer)
                                        const getCardStyle = (s: string) => {
                                            switch (s) {
                                                case 'green': return 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 ring-1 ring-emerald-100 dark:ring-emerald-900 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)]';
                                                case 'yellow': return 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 ring-1 ring-amber-100 dark:ring-amber-900 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.15)]';
                                                case 'red': return 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 ring-1 ring-rose-100 dark:ring-rose-900 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.15)]';
                                                default: return 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md';
                                            }
                                        };

                                        // Input Style (Inner)
                                        const getInputStyle = (s: string) => {
                                            switch (s) {
                                                case 'green': return 'bg-white/80 border-emerald-100 text-emerald-600';
                                                case 'yellow': return 'bg-white/80 border-amber-100 text-amber-600';
                                                case 'red': return 'bg-white/80 border-rose-100 text-rose-600';
                                                default: return 'bg-slate-50 dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-indigo-500';
                                            }
                                        };

                                        return (
                                            <div key={kpi.id} className={`group rounded-xl p-3 transition-all duration-300 relative border ${getCardStyle(status)}`}>
                                                <button onClick={() => deleteKpi(kpi.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity z-10">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        value={kpi.name}
                                                        onChange={(e) => updateKpi(index, 'name', e.target.value)}
                                                        className="w-[90%] bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 border-none p-0 focus:ring-0 placeholder-slate-300"
                                                        placeholder="指标名称..."
                                                    />
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {/* Target */}
                                                        <div className="col-span-2 flex items-center gap-1 bg-white/50 dark:bg-zinc-900/50 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-zinc-800">
                                                            <span className="text-[10px] text-slate-400 whitespace-nowrap">目标</span>
                                                            <input
                                                                type="text"
                                                                value={kpi.target}
                                                                onChange={(e) => updateKpi(index, 'target', e.target.value)}
                                                                className="flex-1 min-w-0 bg-transparent text-xs font-mono text-slate-600 dark:text-slate-300 border-none p-0 focus:ring-0 text-right font-medium"
                                                            />
                                                        </div>
                                                        {/* Actual */}
                                                        <div className={`col-span-2 flex items-center gap-1 px-2 py-1.5 rounded-lg border overflow-hidden transition-colors duration-300 ${getInputStyle(status)}`}>
                                                            <span className="text-[10px] font-semibold whitespace-nowrap opacity-70">实绩</span>
                                                            <input
                                                                type="text"
                                                                value={kpi.actual || ''}
                                                                onChange={(e) => updateKpi(index, 'actual', e.target.value)}
                                                                className="flex-1 min-w-0 bg-transparent text-xs font-mono border-none p-0 focus:ring-0 text-right font-bold text-inherit"
                                                                placeholder="-"
                                                            />
                                                        </div>
                                                        {/* Unit */}
                                                        <div className="col-span-1 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 px-1 py-1.5 rounded-lg border border-slate-100 dark:border-zinc-800">
                                                            <input
                                                                type="text"
                                                                value={kpi.unit}
                                                                onChange={(e) => updateKpi(index, 'unit', e.target.value)}
                                                                className="w-full text-center bg-transparent text-xs text-slate-400 border-none p-0 focus:ring-0"
                                                                title="单位"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* SOP TAB */}
                    {activeTab === 'sop' && (
                        <div className="space-y-4">
                            {/* SOP Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    活动细化分解 ({((selectedNode.data.sop_steps as any[]) || []).length})
                                </h3>
                                <button onClick={addSopStep} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-indigo-600">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Steps List */}
                            <div className="space-y-2">
                                {((selectedNode.data.sop_steps as SopStep[]) || []).length === 0 ? (
                                    <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-lg">
                                        <div className="text-xs text-slate-400">暂无子活动</div>
                                        <div className="text-[10px] text-slate-300 mt-1">点击 + 添加分解步骤</div>
                                    </div>
                                ) : (
                                    ((selectedNode.data.sop_steps as SopStep[]) || []).map((step, stepIndex) => (
                                        <div key={step.id} className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">

                                            {/* Step Header */}
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-zinc-900 group">
                                                <button onClick={() => toggleStep(step.id)} className="text-slate-400 hover:text-slate-600">
                                                    {expandedSteps[step.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </button>
                                                <input
                                                    type="text"
                                                    value={step.name}
                                                    onChange={(e) => updateSopStepName(stepIndex, e.target.value)}
                                                    className="flex-1 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 border-none p-0 focus:ring-0"
                                                    placeholder="子活动名称..."
                                                />
                                                <button onClick={() => addRoleToStep(stepIndex)} className="text-slate-400 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" title="添加岗位">
                                                    <User className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => deleteSopStep(step.id)} className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="删除子活动">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            {/* Roles List for this Step */}
                                            {expandedSteps[step.id] && (
                                                <div className="p-2 space-y-3 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800">
                                                    {(step.roles || []).length === 0 ? (
                                                        <div className="text-[10px] text-slate-400 text-center py-2 italic cursor-pointer hover:text-indigo-500" onClick={() => addRoleToStep(stepIndex)}>
                                                            + 添加对应岗位
                                                        </div>
                                                    ) : (
                                                        step.roles.map((role, roleIndex) => (
                                                            <div key={role.id} className="pl-2 border-l-2 border-slate-100 dark:border-zinc-800 relative group/role">
                                                                <button onClick={() => deleteRoleFromStep(stepIndex, role.id)} className="absolute right-0 top-0 text-slate-300 hover:text-red-500 opacity-0 group-hover/role:opacity-100">
                                                                    <X className="w-3 h-3" />
                                                                </button>

                                                                {/* Role Name */}
                                                                <div className="flex items-center gap-1 mb-1.5">
                                                                    <User className="w-3 h-3 text-indigo-400" />
                                                                    <input
                                                                        type="text"
                                                                        value={role.roleName}
                                                                        onChange={(e) => updateRoleData(stepIndex, roleIndex, 'roleName', e.target.value)}
                                                                        className="bg-transparent text-[11px] font-medium text-indigo-600 border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:ring-0 p-0 w-full"
                                                                        placeholder="岗位名称 (如: 采购员)..."
                                                                    />
                                                                </div>

                                                                {/* Task Desc */}
                                                                <textarea
                                                                    value={role.taskDesc}
                                                                    onChange={(e) => updateRoleData(stepIndex, roleIndex, 'taskDesc', e.target.value)}
                                                                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded px-2 py-1.5 text-[10px] text-slate-600 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500/50 resize-none h-16 mb-1.5"
                                                                    placeholder="任务描述 (SOP)..."
                                                                />

                                                                <div className="flex gap-2 items-center">
                                                                    <div className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded px-2 py-1 flex items-center gap-1">
                                                                        <span className="text-[9px] text-slate-400 shrink-0">KPI</span>
                                                                        <input
                                                                            type="text"
                                                                            value={role.pi}
                                                                            onChange={(e) => updateRoleData(stepIndex, roleIndex, 'pi', e.target.value)}
                                                                            className="w-full bg-transparent text-[10px] text-slate-600 focus:ring-0 border-none p-0"
                                                                            placeholder="指标内容..."
                                                                        />
                                                                    </div>
                                                                    <div className="w-20 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded px-2 py-1 flex items-center gap-1">
                                                                        <span className="text-[9px] text-slate-400 shrink-0">值</span>
                                                                        <input
                                                                            type="text"
                                                                            value={role.target}
                                                                            onChange={(e) => updateRoleData(stepIndex, roleIndex, 'target', e.target.value)}
                                                                            className="w-full bg-transparent text-[10px] text-slate-600 focus:ring-0 border-none p-0 text-right"
                                                                            placeholder="100%"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
