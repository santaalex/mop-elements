'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from 'lucide-react'; // Placeholder icon
import { cn } from '@/lib/utils';

// We'll accept partial data, but expect `activeCount` eventually
export const MonitorNode = memo(({ data, selected }: NodeProps) => {
    // Default stats (will eventually come from real-time data)
    const activeCount = (data.activeCount as number) || 0;
    const status = (data.status as string) || 'NORMAL'; // NORMAL, WARNING, CRITICAL
    const avgWaitTime = (data.avgWaitTime as number) || 0;

    // Dynamic styles based on status
    const statusColor = {
        NORMAL: 'border-slate-700 bg-slate-900',
        WARNING: 'border-yellow-500/50 bg-yellow-900/10 shadow-[0_0_15px_rgba(234,179,8,0.2)]',
        CRITICAL: 'border-red-500/80 bg-red-900/20 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse',
    }[status as 'NORMAL' | 'WARNING' | 'CRITICAL'];

    return (
        <div className={cn(
            "relative min-w-[180px] rounded-lg border-2 px-4 py-3 transition-all duration-300",
            statusColor,
            selected ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950" : ""
        )}>
            {/* Header / Title */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-200">
                    {data.label || 'Process Node'}
                </span>
                {/* Real-time Badge */}
                {activeCount > 0 && (
                    <div className={cn(
                        "flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold",
                        status === 'CRITICAL' ? "bg-red-500 text-white" :
                            status === 'WARNING' ? "bg-yellow-500 text-black" :
                                "bg-indigo-500 text-white"
                    )}>
                        {activeCount}
                    </div>
                )}
            </div>

            {/* Content / Metadata */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Avg Wait:</span>
                    <span className={cn(
                        "font-mono",
                        avgWaitTime > 30 ? "text-red-400" : "text-emerald-400"
                    )}>
                        {avgWaitTime ? `${avgWaitTime}m` : '-'}
                    </span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                    {/* Capacity Bar (Mock) */}
                    <div
                        className={cn("h-full transition-all duration-500",
                            status === 'CRITICAL' ? "bg-red-500" : "bg-indigo-500"
                        )}
                        style={{ width: `${Math.min(activeCount * 5, 100)}%` }}
                    />
                </div>
            </div>

            {/* Handles - Keep them invisible or styled minimally */}
            <Handle type="target" position={Position.Top} className="!bg-slate-600 !w-3 !h-1 !rounded-[2px]" />
            <Handle type="source" position={Position.Bottom} className="!bg-slate-600 !w-3 !h-1 !rounded-[2px]" />
        </div>
    );
});

MonitorNode.displayName = 'MonitorNode';
