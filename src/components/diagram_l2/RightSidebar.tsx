import { useState } from 'react';
import { Node } from 'reactflow';
import { Settings2, BarChart3, Lock, ExternalLink, Plus, X, List, Copy, Unlink, Link2 } from 'lucide-react';
import { SubActivity, MatrixRoleData } from '../../types/diagram';
import { CreativeRoleSelect } from '@/components/resources/CreativeRoleSelect';
import { CreativeKPISelect } from '@/components/resources/CreativeKPISelect';
import { UnitSelect } from '@/components/resources/UnitSelect';
import { useResourceStore } from '@/lib/store/resource-store';

interface RightSidebarProps {
    selectedNodeId: string | null;
    nodes: Node[];
    setNodes: (setter: (nodes: Node[]) => Node[]) => void;
    isReadOnly?: boolean;
}

export default function RightSidebar({ selectedNodeId, nodes, setNodes, isReadOnly = false }: RightSidebarProps) {
    // Derive the live node object from the state to ensure we always have the latest data
    const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
    const [activeTab, setActiveTab] = useState<'kpi' | 'matrix'>('kpi');

    if (!selectedNode) return null; // Don't show for empty

    // --- Helper to update node data ---
    const updateNodeData = (newData: any) => {
        if (isReadOnly) return;
        console.log('[RightSidebar] updateNodeData triggering for:', selectedNode.id, newData);
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === selectedNode.id) {
                    console.log('[RightSidebar] Matched node, updating data');
                    return { ...n, data: { ...n.data, ...newData } };
                }
                return n;
            })
        );
    };

    // --- KPI Helpers (Restored for Process Level KPIs) ---
    const addKpi = () => {
        if (isReadOnly) return;
        const kpis = (selectedNode.data.kpis as any[]) || [];
        const newKpi = {
            id: Date.now().toString(),
            definitionId: '',
            name: '',
            target: '100',
            unit: '个',
        };
        updateNodeData({ kpis: [...kpis, newKpi] });
    };

    const updateKpi = (index: number, field: string, value: string) => {
        if (isReadOnly) return;
        const kpis = [...((selectedNode.data.kpis as any[]) || [])];
        kpis[index] = { ...kpis[index], [field]: value };
        updateNodeData({ kpis });
    };

    const deleteKpi = (id: string) => {
        if (isReadOnly) return;
        const kpis = (selectedNode.data.kpis as any[]) || [];
        updateNodeData({ kpis: kpis.filter((k) => k.id !== id) });
    };

    // --- Lane Implementation ---
    if (selectedNode.type === 'lane') {
        return (
            <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shadow-xl z-20">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-indigo-500" />
                        <h3 className="font-semibold text-slate-900 dark:text-white">泳道配置</h3>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="swimlane-role-sidebar" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">分配角色 (Role)</label>
                        <CreativeRoleSelect
                            value={selectedNode.data.roleId}
                            onChange={(newRoleId) => {
                                console.log('[RightSidebar] Received newRoleId:', newRoleId, 'isReadOnly:', isReadOnly);
                                // Find role name to update label for display
                                const roleName = useResourceStore.getState().getRoleById(newRoleId)?.name || '';
                                console.log('[RightSidebar] Resolved roleName:', roleName);
                                updateNodeData({ roleId: newRoleId, label: roleName });
                            }}
                            disabled={isReadOnly}
                        />
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs leading-relaxed">
                        提示：泳道代表角色或部门。您可以直接搜索现有角色，或输入新名称创建新角色。
                        <br />
                        (Tip: Lanes represent roles. Search existing roles or type to create a new one.)
                    </div>
                </div>
            </div>
        );
    }

    // --- Activity Node Data ---
    const subActivities = (selectedNode.data.subActivities as SubActivity[]) || [];
    const stepCount = subActivities.length;
    let matrixRolesCount = 0;
    subActivities.forEach(s => {
        if (s.roles) matrixRolesCount += s.roles.length;
    });

    return (
        <div className="absolute top-20 right-6 z-50 w-80">
            {/* Glassmorphism Card */}
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 animate-in slide-in-from-right-10 fade-in">

                {/* Header */}
                <div className="h-12 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between px-4 bg-white/50 dark:bg-zinc-800/50">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <Settings2 className="w-4 h-4 text-indigo-500" />
                        {isReadOnly ? '节点信息 (View Only)' : '节点属性'}
                    </div>
                    {/* Node Label (Quick Edit) */}
                    <input
                        type="text"
                        value={(selectedNode.data.label as string) || ''}
                        disabled={isReadOnly}
                        onChange={(e) => updateNodeData({ label: e.target.value })}
                        className={`text-right bg-transparent border-none text-xs font-medium focus:ring-0 w-32 ${isReadOnly ? 'text-slate-600 cursor-default' : 'text-slate-500 hover:text-indigo-600'}`}
                    />
                </div>

                {/* Node ID Display (for Developer/Simulation) */}
                <div className="px-4 py-2 bg-slate-50/50 dark:bg-zinc-800/30 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between group">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Node ID</span>
                    <div className="flex items-center gap-2">
                        <code className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 select-all">
                            {selectedNode.id}
                        </code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(selectedNode.id);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-zinc-700 rounded transition-colors"
                            title="复制 ID (Copy ID)"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                    </div>
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
                        onClick={() => setActiveTab('matrix')}
                        className={`flex-1 py-3 text-xs font-medium transition-colors flex items-center justify-center gap-1.5
                        ${activeTab === 'matrix' ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}
                        `}
                    >
                        <List className="w-3 h-3" />
                        Activity Matrix
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-4 min-h-[300px] max-h-[60vh] overflow-y-auto custom-scrollbar">

                    {/* KPI TAB: RESTORED FULL EDITING */}
                    {activeTab === 'kpi' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    流程节点指标 ({((selectedNode.data.kpis as any[]) || []).length})
                                </h3>
                                {!isReadOnly && (
                                    <button onClick={addKpi} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-indigo-600">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
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
                                                {!isReadOnly && (
                                                    <button onClick={() => deleteKpi(kpi.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity z-10">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <div className="space-y-3">
                                                    {/* KPI Definition Select */}
                                                    {/* KPI Name / Definition Control */}
                                                    <div className="w-full">
                                                        {kpi.definitionId !== undefined ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1">
                                                                    <CreativeKPISelect
                                                                        value={kpi.definitionId}
                                                                        disabled={isReadOnly}
                                                                        onChange={(defId) => {
                                                                            const def = useResourceStore.getState().getKpiDefinitionById(defId);
                                                                            if (def) {
                                                                                const updatedKpis = [...((selectedNode.data.kpis as any[]) || [])];
                                                                                updatedKpis[index] = {
                                                                                    ...updatedKpis[index],
                                                                                    definitionId: defId,
                                                                                    name: def.name,
                                                                                    unit: def.unit,
                                                                                };
                                                                                updateNodeData({ kpis: updatedKpis });
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                                {!isReadOnly && (
                                                                    <button
                                                                        onClick={() => {
                                                                            // Detach: Keep current name/unit but remove definitionId (set to undefined)
                                                                            const updatedKpis = [...((selectedNode.data.kpis as any[]) || [])];
                                                                            updatedKpis[index] = { ...updatedKpis[index], definitionId: undefined };
                                                                            updateNodeData({ kpis: updatedKpis });
                                                                        }}
                                                                        className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                                                                        title="Detach from Global Definition (Unlock Name)"
                                                                    >
                                                                        <Unlink className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={kpi.name}
                                                                    disabled={isReadOnly}
                                                                    onChange={(e) => updateKpi(index, 'name', e.target.value)}
                                                                    placeholder="KPI Name"
                                                                    className={`flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-indigo-500 ${isReadOnly ? 'cursor-default text-slate-600' : 'text-slate-700 dark:text-slate-200'}`}
                                                                />
                                                                {!isReadOnly && (
                                                                    <button
                                                                        onClick={() => {
                                                                            // Link: Switch to Global Mode (set to empty string to show Selector)
                                                                            const updatedKpis = [...((selectedNode.data.kpis as any[]) || [])];
                                                                            // Check if exact name match exists in global definitions
                                                                            const match = useResourceStore.getState().kpiDefinitions.find(d => d.name === kpi.name);
                                                                            if (match) {
                                                                                updatedKpis[index] = { ...updatedKpis[index], definitionId: match.id, unit: match.unit };
                                                                            } else {
                                                                                // No match, just enable Selector mode
                                                                                updatedKpis[index] = { ...updatedKpis[index], definitionId: '' };
                                                                            }
                                                                            updateNodeData({ kpis: updatedKpis });
                                                                        }}
                                                                        className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-colors"
                                                                        title="Link to Global Definition"
                                                                    >
                                                                        <Link2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-5 gap-2">
                                                        {/* Target */}
                                                        <div className="col-span-2 flex items-center gap-1 bg-white/50 dark:bg-zinc-900/50 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-zinc-800">
                                                            <span className="text-[10px] text-slate-400 whitespace-nowrap">目标</span>
                                                            <input
                                                                type="text"
                                                                value={kpi.target}
                                                                disabled={isReadOnly}
                                                                onChange={(e) => updateKpi(index, 'target', e.target.value)}
                                                                className={`flex-1 min-w-0 bg-transparent text-xs font-mono text-right font-medium border-none p-0 focus:ring-0 ${isReadOnly ? 'cursor-default text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-300'}`}
                                                            />
                                                        </div>
                                                        {/* Actual */}
                                                        <div className={`col-span-2 flex items-center gap-1 px-2 py-1.5 rounded-lg border overflow-hidden transition-colors duration-300 ${getInputStyle(status)}`}>
                                                            <span className="text-[10px] font-semibold whitespace-nowrap opacity-70">实绩</span>
                                                            <input
                                                                type="text"
                                                                value={kpi.actual || ''}
                                                                disabled={isReadOnly}
                                                                onChange={(e) => updateKpi(index, 'actual', e.target.value)}
                                                                className={`flex-1 min-w-0 bg-transparent text-xs font-mono border-none p-0 focus:ring-0 text-right font-bold text-inherit ${isReadOnly ? 'cursor-default' : ''}`}
                                                                placeholder="-"
                                                            />
                                                        </div>
                                                        {/* Unit */}
                                                        {/* Unit */}
                                                        <div className="col-span-1 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 rounded-lg border border-slate-100 dark:border-zinc-800">
                                                            <UnitSelect
                                                                value={kpi.unit}
                                                                disabled={isReadOnly}
                                                                onChange={(val) => updateKpi(index, 'unit', val)}
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

                    {/* MATRIX SUMMARY TAB */}
                    {activeTab === 'matrix' && (
                        <div className="space-y-6 pt-4">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-zinc-900 rounded-xl p-3 text-center border border-slate-100 dark:border-zinc-800">
                                    <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{stepCount}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Steps</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-zinc-900 rounded-xl p-3 text-center border border-slate-100 dark:border-zinc-800">
                                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{matrixRolesCount}</div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Matrix Roles</div>
                                </div>
                            </div>

                            {/* Hint */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg p-3 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-500">
                                    <Lock className="w-3 h-3" />
                                    Activity Matrix
                                </div>
                                <p className="text-[11px] leading-relaxed text-amber-600/90 dark:text-amber-400/90">
                                    详细的任务步骤及 KPI (Matrix Role Data) 只能在矩阵弹窗中编辑。
                                </p>
                                <div className="text-[10px] text-amber-500 mt-1 font-medium">
                                    • 双击节点打开矩阵视图
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
