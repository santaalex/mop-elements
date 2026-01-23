import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Settings2, BarChart3, AlertTriangle } from 'lucide-react';
import { OctopusHandles } from './OctopusHandles';

const ActivityNode = ({ data, selected }: NodeProps) => {
    // Basic Style Helper
    const isEditMode = data.isEditMode !== false; // Default true if undefined

    return (
        <div className={`
            min-w-[140px] px-3 py-2 rounded-lg border-2 shadow-sm transition-all duration-200
            ${selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}
            bg-white
            relative group
        `}>
            {/* Handles - Replaced with 4-way OctopusHandles */}
            <OctopusHandles />

            <div className="flex flex-col gap-1">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity</span>
                    {data.kpis && data.kpis.length > 0 && (
                        <div className="flex items-center gap-1 text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                            <BarChart3 className="w-3 h-3" />
                            {data.kpis.length}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="text-sm font-medium text-slate-700 text-center py-1">
                    {data.label}
                </div>

                {/* Real-time Stats Filters (Only visible if data exists AND in Monitor Mode) */}
                {(data.activeCount !== undefined || data.avgWaitTime !== undefined) && data.isMonitor && (
                    <div className="flex items-center justify-center gap-2 mt-1 border-t border-slate-100 pt-1">
                        {/* Active Instances Badge */}
                        {data.activeCount !== undefined && data.activeCount > 0 && (
                            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-medium border border-emerald-100" title="Active Instances">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {data.activeCount}
                            </div>
                        )}

                        {/* Active Instances Badge (Zero state - optional, or just hide) */}
                        {data.activeCount === 0 && (
                            <div className="text-[10px] text-slate-400">Idle</div>
                        )}

                        {/* Avg Wait Time Badge */}
                        {data.avgWaitTime !== undefined && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500" title="Avg Wait Time">
                                <span className="text-slate-300">|</span>
                                {data.avgWaitTime}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer (Roles/Warnings) */}
                <div className="flex items-center justify-end gap-1 mt-1">
                    {/* Warning if no roles assigned (example logic) */}
                    {(!data.subActivities || data.subActivities.length === 0) && isEditMode && (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(ActivityNode);
