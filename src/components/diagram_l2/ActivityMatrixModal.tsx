import React, { useState } from 'react';
import { SubActivity, MatrixRoleData, RoleConfig } from '@/types/diagram';
import { X, Save, Edit3, Eye, Trash2, Plus, Settings } from 'lucide-react';
import { getKpiStatus, getStatusColor } from '../../lib/kpi-utils';
import { ExportButton } from '@/components/common/ExportButton';

interface ActivityMatrixModalProps {
    isOpen: boolean;
    onClose: () => void;

    // Context
    activityName: string;
    activityId: string;

    // Data
    subActivities: SubActivity[];
    roleConfigs: RoleConfig[];

    // Save Handler for BOTH structure (roles) and content (steps)
    onSave: (newSubActivities: SubActivity[], newRoles: RoleConfig[]) => void;

    // Mode
    isEditMode: boolean; // Global app mode
}

const THEME_COLORS = {
    blue: { bg: 'bg-blue-50/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100' },
    purple: { bg: 'bg-purple-50/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100' },
    green: { bg: 'bg-emerald-50/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100' },
    orange: { bg: 'bg-amber-50/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100' },
    slate: { bg: 'bg-slate-50/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-100' },
};

export function ActivityMatrixModal({
    isOpen,
    onClose,
    activityName,
    activityId,
    subActivities,
    roleConfigs,
    onSave,
    isEditMode
}: ActivityMatrixModalProps) {

    // Local state
    const [localData, setLocalData] = useState<SubActivity[]>([]);
    const [localRoles, setLocalRoles] = useState<RoleConfig[]>([]);
    const [activeTab, setActiveTab] = useState<'view' | 'edit'>(isEditMode ? 'edit' : 'view');

    // Sync local state when open
    React.useEffect(() => {
        if (isOpen) {
            setLocalData(JSON.parse(JSON.stringify(subActivities || [])));
            // Ensure at least one role exists if empty? No, let user add.
            // But for robustness, if roles are undefined, set empty.
            setLocalRoles(JSON.parse(JSON.stringify(roleConfigs || [])));

            setActiveTab(isEditMode ? 'edit' : 'view');
        }
    }, [isOpen, subActivities, roleConfigs, isEditMode]);

    if (!isOpen) return null;

    // --- Actions ---

    // Safe ID generator for non-secure contexts (HTTP)
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

    const handleSave = () => {
        onSave(localData, localRoles);
        onClose();
    };

    const addRole = () => {
        const themes: any[] = ['blue', 'purple', 'green', 'orange'];
        const nextTheme = themes[localRoles.length % themes.length];

        const newRole: RoleConfig = {
            id: generateId(),
            name: `新岗位 ${localRoles.length + 1}`,
            colorTheme: nextTheme
        };
        setLocalRoles([...localRoles, newRole]);
    };

    const updateRoleName = (id: string, name: string) => {
        setLocalRoles(localRoles.map(r => r.id === id ? { ...r, name } : r));
    };

    const deleteRole = (id: string) => {
        if (confirm('确定删除该岗位列吗？该岗位的所有数据将丢失。')) {
            setLocalRoles(localRoles.filter(r => r.id !== id));
        }
    };

    const addStep = () => {
        const newStep: SubActivity = {
            id: generateId(),
            name: '', // Empty by default
            roles: []
        };
        setLocalData([...localData, newStep]);
    };

    const deleteStep = (id: string) => {
        setLocalData(localData.filter(s => s.id !== id));
    };

    // Helper to get or create cell data
    const getCellData = (step: SubActivity, roleId: string): MatrixRoleData => {
        let cell = step.roles.find(r => r.roleId === roleId);

        // Migration / Initialization
        if (cell) {
            // Migrate legacy 'standard' -> 'processStandard' if needed
            if (cell.standard && !cell.processStandard && !cell.qualityStandard) {
                cell.processStandard = cell.standard;
            }
            // Migrate legacy 'piName' -> 'kpis' if needed
            if (cell.piName && (!cell.kpis || cell.kpis.length === 0)) {
                cell.kpis = [{
                    id: generateId(),
                    name: cell.piName,
                    target: cell.target || '',
                    unit: cell.unit || '',
                    actual: cell.actual,
                    mingdaoId: cell.mingdaoId,
                    direction: 'higher',
                    warning: '',
                    critical: ''
                }];
            }
            // Ensure arrays exist and string fields valid
            if (!cell.kpis) cell.kpis = [];
            if (cell.processStandard === undefined) cell.processStandard = '';
            if (cell.qualityStandard === undefined) cell.qualityStandard = '';

            return cell;
        }

        // Return empty mock for rendering
        return {
            roleId,
            roleName: '',
            sopContent: '',
            processStandard: '',
            qualityStandard: '',
            kpis: [],
            // Legacy
            standard: '',
            piName: ''
        };
    };

    // Update cell helper
    const updateCell = (stepIndex: number, roleId: string, field: keyof MatrixRoleData, value: string) => {
        const newData = [...localData];
        const step = newData[stepIndex];

        let cellIndex = step.roles.findIndex(r => r.roleId === roleId);
        const cellData: MatrixRoleData = cellIndex !== -1 ? { ...step.roles[cellIndex] } : {
            roleId,
            roleName: localRoles.find(r => r.id === roleId)?.name || '',
            sopContent: '',
            processStandard: '',
            qualityStandard: '',
            kpis: [],
            standard: ''
        };

        // Safety check for kpis if we ever update other fields
        if (!cellData.kpis) cellData.kpis = [];

        (cellData as any)[field] = value;

        if (cellIndex === -1) {
            step.roles.push(cellData);
        } else {
            step.roles[cellIndex] = cellData;
        }
        setLocalData(newData);
    };

    // Helper for updating KPIs
    const updateKPI = (stepIndex: number, roleId: string, kpiIndex: number | null, kpiField: string | null, value: any, action: 'add' | 'update' | 'delete') => {
        const newData = [...localData];
        const step = newData[stepIndex];
        let cellIndex = step.roles.findIndex(r => r.roleId === roleId);

        // Ensure cell exists
        if (cellIndex === -1) {
            const newCell: MatrixRoleData = {
                roleId,
                roleName: localRoles.find(r => r.id === roleId)?.name || '',
                sopContent: '',
                processStandard: '',
                qualityStandard: '',
                kpis: [],
                standard: ''
            };
            step.roles.push(newCell);
            cellIndex = step.roles.length - 1;
        }

        const cell = step.roles[cellIndex];
        // Ensure immutability for React state (shallow copy cell at least)
        step.roles[cellIndex] = { ...cell };
        const currentCell = step.roles[cellIndex];

        if (!currentCell.kpis) currentCell.kpis = [];

        if (action === 'add') {
            currentCell.kpis.push({
                id: generateId(),
                name: '',
                target: '',
                unit: '',
                direction: 'higher',
                warning: '',
                critical: ''
            });
        } else if (action === 'delete' && kpiIndex !== null) {
            currentCell.kpis.splice(kpiIndex, 1);
        } else if (action === 'update' && kpiIndex !== null && kpiField) {
            (currentCell.kpis[kpiIndex] as any)[kpiField] = value;
        }

        setLocalData(newData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-900 w-[98vw] max-w-[1800px] h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">

                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {activityName}
                            <span className="text-sm font-normal text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">责任矩阵</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        {isEditMode && (
                            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveTab('view')}
                                    className={`px-3 py-1 text-sm rounded-md flex items-center gap-2 ${activeTab === 'view' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                                >
                                    <Eye size={14} /> 诊断视图
                                </button>
                                <button
                                    onClick={() => setActiveTab('edit')}
                                    className={`px-3 py-1 text-sm rounded-md flex items-center gap-2 ${activeTab === 'edit' ? 'bg-white shadow text-amber-600' : 'text-slate-500'}`}
                                >
                                    <Settings size={14} /> 配置模式
                                </button>
                            </div>
                        )}
                        <ExportButton targetId="matrix-content" fileName={`${activityName}-责任矩阵`} />
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50 p-6">
                    <div id="matrix-content" className="min-w-fit border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm inline-block">

                        <table className="text-sm text-left border-collapse">
                            {/* THEAD */}
                            <thead className="bg-slate-100 dark:bg-slate-900">
                                {/* Row 1: Role Headers */}
                                <tr>
                                    <th className="px-4 py-3 min-w-[200px] border-r border-b border-slate-300 sticky left-0 bg-slate-100 z-10 w-[200px]">
                                        步骤 (Sub-activity)
                                    </th>

                                    {/* Dynamic Role Configs */}
                                    {localRoles.map(role => {
                                        const theme = THEME_COLORS[role.colorTheme || 'slate'] || THEME_COLORS.slate;
                                        return (
                                            <th key={role.id} colSpan={4} className={`px-4 py-2 text-center border-r border-b border-slate-300 ${theme.bg} ${theme.text}`}>
                                                <div className="flex items-center justify-center gap-2 group">
                                                    {activeTab === 'edit' ? (
                                                        <>
                                                            <input
                                                                value={role.name}
                                                                onChange={(e) => updateRoleName(role.id, e.target.value)}
                                                                className="bg-transparent text-center border-b border-dashed border-slate-400 focus:border-blue-500 outline-none w-32"
                                                            />
                                                            <button
                                                                onClick={() => deleteRole(role.id)}
                                                                className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        role.name
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}

                                    {/* Add Role Button */}
                                    {activeTab === 'edit' && (
                                        <th className="px-4 py-2 border-b border-slate-300 bg-slate-50">
                                            <button
                                                onClick={addRole}
                                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                                            >
                                                <Plus size={14} /> 加岗位
                                            </button>
                                        </th>
                                    )}
                                </tr>

                                {/* Row 2: Sub-headers (SOP | Process Std | Quality Std | KPI) */}
                                <tr className="text-xs text-slate-500 bg-slate-50">
                                    <th className="px-4 py-2 border-r border-b border-slate-300 sticky left-0 bg-slate-50 z-10"></th>
                                    {localRoles.map(role => (
                                        <React.Fragment key={role.id}>
                                            <th className="px-3 py-1 border-r border-b border-slate-200 w-[200px] text-center font-normal">标准 SOP / 任务</th>
                                            <th className="px-3 py-1 border-r border-b border-slate-200 w-[150px] text-center font-normal">工艺标准</th>
                                            <th className="px-3 py-1 border-r border-b border-slate-200 w-[150px] text-center font-normal">质量标准</th>
                                            <th className="px-3 py-1 border-r border-b border-slate-200 w-[180px] text-center font-normal">绩效 PI (Targets)</th>
                                        </React.Fragment>
                                    ))}
                                    {activeTab === 'edit' && <th className="border-b border-slate-300"></th>}
                                </tr>
                            </thead>

                            {/* TBODY */}
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {localData.map((step, idx) => (
                                    <tr key={step.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">

                                        {/* Step Name */}
                                        <td className="px-4 py-3 font-medium border-r border-slate-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            {activeTab === 'edit' ? (
                                                <div className="flex items-center justify-between gap-2">
                                                    <input
                                                        value={step.name}
                                                        placeholder="输入步骤名称..."
                                                        onChange={(e) => {
                                                            const newData = [...localData];
                                                            newData[idx].name = e.target.value;
                                                            setLocalData(newData);
                                                        }}
                                                        className="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-100 rounded px-1"
                                                    />
                                                    <button onClick={() => deleteStep(step.id)} className="text-slate-300 hover:text-rose-500">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="whitespace-pre-wrap break-words max-w-[180px]">{step.name}</div>
                                            )}
                                        </td>

                                        {/* Dynamic Cells */}
                                        {localRoles.map(role => {
                                            const cell = getCellData(step, role.id);
                                            return (
                                                <React.Fragment key={role.id}>
                                                    {/* SOP Content */}
                                                    <td className="px-2 py-2 border-r border-slate-100 align-top">
                                                        {activeTab === 'edit' ? (
                                                            <textarea
                                                                className="w-full h-24 text-xs p-1 border border-slate-200 rounded resize-none focus:border-blue-400 outline-none"
                                                                placeholder="任务描述..."
                                                                value={cell.sopContent || ''}
                                                                onChange={(e) => updateCell(idx, role.id, 'sopContent', e.target.value)}
                                                            />
                                                        ) : (
                                                            <div className="text-xs whitespace-pre-wrap break-words text-slate-700">{cell.sopContent}</div>
                                                        )}
                                                    </td>

                                                    {/* Process Standard */}
                                                    <td className="px-2 py-2 border-r border-slate-100 align-top">
                                                        {activeTab === 'edit' ? (
                                                            <textarea
                                                                className="w-full h-24 text-xs p-1 border border-slate-200 rounded resize-none focus:border-blue-400 outline-none"
                                                                placeholder="工艺标准..."
                                                                value={cell.processStandard || ''}
                                                                onChange={(e) => updateCell(idx, role.id, 'processStandard', e.target.value)}
                                                            />
                                                        ) : (
                                                            <div className="text-xs whitespace-pre-wrap break-words text-slate-600">{cell.processStandard}</div>
                                                        )}
                                                    </td>

                                                    {/* Quality Standard */}
                                                    <td className="px-2 py-2 border-r border-slate-100 align-top">
                                                        {activeTab === 'edit' ? (
                                                            <textarea
                                                                className="w-full h-24 text-xs p-1 border border-slate-200 rounded resize-none focus:border-blue-400 outline-none"
                                                                placeholder="质量标准..."
                                                                value={cell.qualityStandard || ''}
                                                                onChange={(e) => updateCell(idx, role.id, 'qualityStandard', e.target.value)}
                                                            />
                                                        ) : (
                                                            <div className="text-xs whitespace-pre-wrap break-words text-slate-600">{cell.qualityStandard}</div>
                                                        )}
                                                    </td>

                                                    {/* KPIs (Multiple) */}
                                                    <td className="px-2 py-2 border-r border-slate-200 align-top bg-slate-50/30">
                                                        <div className="flex flex-col gap-2">
                                                            {cell.kpis && cell.kpis.map((kpi, kIdx) => (
                                                                <div key={kpi.id} className="border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                                                    {activeTab === 'edit' ? (
                                                                        <div className="flex flex-col gap-1 relative group/kpi">
                                                                            <button
                                                                                onClick={() => updateKPI(idx, role.id, kIdx, null, null, 'delete')}
                                                                                className="absolute -right-1 -top-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover/kpi:opacity-100"
                                                                            >
                                                                                <X size={12} />
                                                                            </button>
                                                                            <input
                                                                                className="w-full text-xs p-1 border border-slate-200 rounded font-medium"
                                                                                placeholder="指标名称"
                                                                                value={kpi.name}
                                                                                onChange={(e) => updateKPI(idx, role.id, kIdx, 'name', e.target.value, 'update')}
                                                                            />
                                                                            <div className="flex gap-1">
                                                                                <input
                                                                                    className="w-1/2 text-xs p-1 border border-slate-200 rounded"
                                                                                    placeholder="目标"
                                                                                    value={kpi.target}
                                                                                    onChange={(e) => updateKPI(idx, role.id, kIdx, 'target', e.target.value, 'update')}
                                                                                />
                                                                                <input
                                                                                    className="w-1/2 text-xs p-1 border border-slate-200 rounded"
                                                                                    placeholder="单位"
                                                                                    value={kpi.unit}
                                                                                    onChange={(e) => updateKPI(idx, role.id, kIdx, 'unit', e.target.value, 'update')}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-xs font-bold text-slate-500 whitespace-pre-wrap break-words">{kpi.name}</span>
                                                                            <div className="flex justify-between items-baseline text-[10px] text-slate-400">
                                                                                <span>Target: {kpi.target}{kpi.unit}</span>
                                                                                {kpi.actual && (
                                                                                    <span className={`px-1.5 py-0.5 rounded font-bold ${getStatusColor(getKpiStatus(kpi.actual, kpi.target, kpi.direction, kpi.warning, kpi.critical))}`}>
                                                                                        {kpi.actual}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}

                                                            {/* Add KPI Button */}
                                                            {activeTab === 'edit' && (
                                                                <button
                                                                    onClick={() => updateKPI(idx, role.id, null, null, null, 'add')}
                                                                    className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center justify-center gap-1 py-1 border border-dashed border-blue-200 rounded hover:bg-blue-50"
                                                                >
                                                                    <Plus size={10} /> 添加指标
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}

                                        {activeTab === 'edit' && <td className="bg-slate-50"></td>}
                                    </tr>
                                ))}

                                {/* Add Step Button (Edit Mode) */}
                                {activeTab === 'edit' && (
                                    <tr>
                                        <td className="px-4 py-3 border-r border-slate-200 sticky left-0 bg-white z-10">
                                            <button
                                                onClick={addStep}
                                                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors"
                                            >
                                                <Plus size={16} /> 添加步骤
                                            </button>
                                        </td>
                                        {/* Updated ColSpan: Roles * 4 + 1 */}
                                        <td colSpan={localRoles.length * 4 + 1}></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FOOTER */}
                {activeTab === 'edit' && (
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">取消</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg flex items-center gap-2">
                            <Save size={16} /> 保存配置
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
