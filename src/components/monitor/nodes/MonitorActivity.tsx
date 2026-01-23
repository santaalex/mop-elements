import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { Activity } from 'lucide-react';

export const MonitorActivity = memo(({ data, selected }: NodeProps) => {
    // Real-time data
    const activeCount = (data.activeCount as number) || 0;
    const status = (data.status as string) || 'NORMAL'; // NORMAL, WARNING, CRITICAL
    const avgWaitTime = (data.avgWaitTime as number) || 0;

    // Status Styling
    const statusStyles = {
        NORMAL: 'border-slate-700 bg-slate-900/90 text-slate-300',
        WARNING: 'border-yellow-500/50 bg-yellow-950/50 text-yellow-200 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
        CRITICAL: 'border-red-500/80 bg-red-950/50 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse',
    }[status as 'NORMAL' | 'WARNING' | 'CRITICAL'] || 'border-slate-700 bg-slate-900/90';

    return (
        <div className={cn(
            "relative min-w-[180px] rounded-lg border backdrop-blur-md px-3 py-2.5 transition-all duration-300",
            statusStyles,
            selected ? "ring-1 ring-indigo-500 ring-offset-1 ring-offset-slate-950" : ""
        )}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                    "p-1.5 rounded bg-slate-800 border border-slate-700",
                    status === 'WARNING' && "bg-yellow-900/30 border-yellow-800",
                    status === 'CRITICAL' && "bg-red-900/30 border-red-800"
                )}>
                    <Activity size={14} className="opacity-70" />
                </div>
                <span className="text-xs font-bold tracking-tight truncate max-w-[120px]">
                    {data.label || 'Activity'}
                </span>
            </div>

            {/* Active Tokens Visualization (Stacked Icons) */}
            <div className="mt-3 mb-1 min-h-[16px] flex flex-wrap gap-1 content-start">
                {/* Empty State */}
                {activeCount === 0 && (
                    <span className="text-[10px] text-slate-700 italic">No activity</span>
                )}

                {/* Render Tokens (Up to 14) */}
                {Array.from({ length: Math.min(activeCount, 14) }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "w-2.5 h-2.5 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.2)] transition-all duration-500",
                            {
                                // Color logic based on index (gradient effect) or status
                                'bg-indigo-400': status === 'NORMAL',
                                'bg-yellow-400 animate-pulse': status === 'WARNING',
                                'bg-red-500 animate-bounce': status === 'CRITICAL'
                            }
                        )}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    />
                ))}

                {/* Overflow Indicator */}
                {activeCount > 14 && (
                    <div className="h-2.5 flex items-center justify-center bg-slate-800 rounded px-1 min-w-[16px]">
                        <span className="text-[8px] font-bold text-slate-400 leading-none">+{activeCount - 14}</span>
                    </div>
                )}
            </div>

            {/* Compact Metrics Footer */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 uppercase font-mono">Load</span>
                    <span className={cn(
                        "text-[10px] font-mono font-bold",
                        activeCount > 0 ? "text-slate-200" : "text-slate-600"
                    )}>
                        {activeCount}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 uppercase font-mono">Wait</span>
                    <span className={cn(
                        "text-[10px] font-mono font-medium",
                        avgWaitTime > 30 ? "text-red-400" : "text-emerald-400"
                    )}>
                        {avgWaitTime}ms
                    </span>
                </div>
            </div>

            <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-0.5 !rounded-none opacity-0" />
            <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-0.5 !rounded-none opacity-0" />
        </div>
    );
});

MonitorActivity.displayName = 'MonitorActivity';
