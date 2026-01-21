import React, { useState } from 'react';
import { SubActivity, MatrixRoleData, RoleConfig } from '@/types/diagram';
import { X, Save, Edit3, Eye, Trash2, Plus, Settings } from 'lucide-react';

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
        if (!cell) {
            // Return empty mock for rendering; actally likely need to update state if editing
            return {
                roleId,
                roleName: '',
                sopContent: '',
                standard: '',
                piName: '',
                target: '',
                unit: ''
            };
        }
        return cell;
    };

    // Update cell helper
    const updateCell = (stepIndex: number, roleId: string, field: keyof MatrixRoleData, value: string) => {
        const newData = [...localData];
        const step = newData[stepIndex];

        let cellIndex = step.roles.findIndex(r => r.roleId === roleId);
        if (cellIndex === -1) {
            // Create new cell
            step.roles.push({
                roleId,
                roleName: localRoles.find(r => r.id === roleId)?.name || '',
                sopContent: '',
                standard: '',
                piName: '',
                target: '',
                unit: '',
                [field]: value
            });
        } else {
            // Update existing
            step.roles[cellIndex] = {
                ...step.roles[cellIndex],
                [field]: value
            };
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
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X size={20} /></button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50 p-6">
                    <div className="min-w-fit border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm inline-block">

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
                                            <th key={role.id} colSpan={3} className={`px-4 py-2 text-center border-r border-b border-slate-300 ${theme.bg} ${theme.text}`}>
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

                                {/* Row 2: Sub-headers (SOP | Standard | KPI) */}
                                <tr className="text-xs text-slate-500 bg-slate-50">
                                    <th className="px-4 py-2 border-r border-b border-slate-300 sticky left-0 bg-slate-50 z-10"></th>
                                    {localRoles.map(role => (
                                        <React.Fragment key={role.id}>
                                            <th className="px-3 py-1 border-r border-b border-slate-200 w-[200px] text-center font-normal">标准 SOP / 任务</th>
                                            <th className="px-3 py-1 border-r border-b border-slate-200 w-[150px] text-center font-normal">工艺 / 质量标准</th>
                                            <th className="px-3 py-1 border-r border-b border-slate-200 w-[150px] text-center font-normal">绩效 PI (Target)</th>
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
                                                step.name
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
                                                                className="w-full h-16 text-xs p-1 border border-slate-200 rounded resize-none focus:border-blue-400 outline-none"
                                                                placeholder="任务描述..."
                                                                value={cell.sopContent || ''}
                                                                onChange={(e) => updateCell(idx, role.id, 'sopContent', e.target.value)}
                                                            />
                                                        ) : (
                                                            <div className="text-xs whitespace-pre-wrap text-slate-700">{cell.sopContent}</div>
                                                        )}
                                                    </td>

                                                    {/* Standard */}
                                                    <td className="px-2 py-2 border-r border-slate-100 align-top">
                                                        {activeTab === 'edit' ? (
                                                            <textarea
                                                                className="w-full h-16 text-xs p-1 border border-slate-200 rounded resize-none focus:border-blue-400 outline-none"
                                                                placeholder="质量标准..."
                                                                value={cell.standard || ''}
                                                                onChange={(e) => updateCell(idx, role.id, 'standard', e.target.value)}
                                                            />
                                                        ) : (
                                                            <div className="text-xs whitespace-pre-wrap text-slate-600">{cell.standard}</div>
                                                        )}
                                                    </td>

                                                    {/* KPI */}
                                                    <td className="px-2 py-2 border-r border-slate-200 align-top bg-slate-50/30">
                                                        {activeTab === 'edit' ? (
                                                            <div className="flex flex-col gap-1">
                                                                <input
                                                                    className="w-full text-xs p-1 border border-slate-200 rounded"
                                                                    placeholder="指标名称"
                                                                    value={cell.piName || ''}
                                                                    onChange={(e) => updateCell(idx, role.id, 'piName', e.target.value)}
                                                                />
                                                                <div className="flex gap-1">
                                                                    <input
                                                                        className="w-1/2 text-xs p-1 border border-slate-200 rounded"
                                                                        placeholder="目标"
                                                                        value={cell.target || ''}
                                                                        onChange={(e) => updateCell(idx, role.id, 'target', e.target.value)}
                                                                    />
                                                                    <input
                                                                        className="w-1/2 text-xs p-1 border border-slate-200 rounded"
                                                                        placeholder="单位"
                                                                        value={cell.unit || ''}
                                                                        onChange={(e) => updateCell(idx, role.id, 'unit', e.target.value)}
                                                                    />
                                                                </div>
                                                                <input
                                                                    className="w-full text-[10px] p-1 border border-slate-200 rounded mt-1 text-slate-500 font-mono bg-slate-50 focus:bg-white"
                                                                    placeholder="Mingdao ID (Data Binding)"
                                                                    value={cell.mingdaoId || ''}
                                                                    onChange={(e) => updateCell(idx, role.id, 'mingdaoId', e.target.value)}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                {cell.piName && (
                                                                    <>
                                                                        <span className="text-xs font-bold text-slate-500">{cell.piName}</span>
                                                                        <div className="flex justify-between items-baseline">
                                                                            <span className="text-[10px] text-slate-400">Target: {cell.target}{cell.unit}</span>
                                                                            <span className={`text-sm font-mono font-bold ${cell.actual ? 'text-blue-600' : 'text-slate-300'}`}>
                                                                                {cell.actual || '--'}
                                                                                {cell.mingdaoId && <span className="text-green-500 ml-1" title="Live Data ID Bound">●</span>}
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
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
                                        <td colSpan={localRoles.length * 3 + 1}></td>
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
