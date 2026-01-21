import { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { OctopusHandles } from './OctopusHandles';
import { SubActivity, MatrixRoleData } from '../../../types/diagram';

const ActivityNode = ({ data, selected }: NodeProps) => {

    // --- Status Logic ---
    const getNodeStatus = () => {
        let hasRed = false;
        let hasYellow = false;
        let hasGreen = false;

        // 1. Check Process KPIs (Legacy/High Level)
        const kpis = (data.kpis as any[]) || [];
        for (const kpi of kpis) {
            const { actual, target, direction = 'higher', warning, critical } = kpi;
            if (!actual || !target) continue;

            const a = parseFloat(actual);
            const t = parseFloat(target);
            if (isNaN(a) || isNaN(t)) continue;

            let w = parseFloat(warning);
            let c = parseFloat(critical);
            let status = 'neutral';

            if (direction === 'higher') {
                if (isNaN(w)) w = t * 0.9;
                if (isNaN(c)) c = t * 0.8;
                if (a <= c) status = 'red';
                else if (a < w) status = 'yellow';
                else status = 'green';
            } else {
                if (isNaN(w)) w = t * 1.1;
                if (isNaN(c)) c = t * 1.2;
                if (a >= c) status = 'red';
                else if (a > w) status = 'yellow';
                else status = 'green';
            }
            if (status === 'red') hasRed = true;
            if (status === 'yellow') hasYellow = true;
            if (status === 'green') hasGreen = true;
        }

        // 2. Check Matrix Roles (SubActivities)
        const subActivities = (data.subActivities as SubActivity[]) || [];
        for (const sub of subActivities) {
            if (!sub.roles) continue;
            for (const role of sub.roles) {
                const { actual, target, direction = 'higher', warning, critical } = role;
                if (!actual || !target) continue;

                const a = parseFloat(actual);
                const t = parseFloat(target);
                if (isNaN(a) || isNaN(t)) continue;

                let w = warning ? parseFloat(warning) : NaN;
                let c = critical ? parseFloat(critical) : NaN;
                let status = 'neutral';

                if (direction === 'higher') {
                    if (isNaN(w)) w = t * 0.9;
                    if (isNaN(c)) c = t * 0.8;
                    if (a <= c) status = 'red';
                    else if (a < w) status = 'yellow';
                    else status = 'green';
                } else { // lower is better
                    if (isNaN(w)) w = t * 1.1;
                    if (isNaN(c)) c = t * 1.2;
                    if (a >= c) status = 'red';
                    else if (a > w) status = 'yellow';
                    else status = 'green';
                }

                if (status === 'red') hasRed = true;
                if (status === 'yellow') hasYellow = true;
                if (status === 'green') hasGreen = true;
            }
        }

        if (hasRed) return 'red';
        if (hasYellow) return 'yellow';
        if (hasGreen) return 'green';

        return 'neutral';
    };

    const status = getNodeStatus();

    const getStatusClasses = (s: string, isSelected: boolean) => {
        const base = "min-w-[100px] min-h-[60px] px-3 py-2 rounded-lg h-full border transition-all duration-300 flex items-center justify-center text-center";

        // Selection Ring
        const ring = isSelected ? "ring-2 ring-blue-500 ring-offset-2" : "";

        switch (s) {
            case 'red':
                return `${base} ${ring} bg-rose-50 dark:bg-rose-900/20 border-rose-500 dark:border-rose-500 shadow-[0_0_15px_-3px_rgba(244,63,94,0.4)] animate-pulse`;
            case 'yellow':
                return `${base} ${ring} bg-amber-50 dark:bg-amber-900/20 border-amber-500 dark:border-amber-500 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]`;
            case 'green':
                return `${base} ${ring} bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 dark:border-emerald-500 shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]`;
            default:
                // Neural / White
                return `${base} ${isSelected ? 'border-blue-500' : 'border-slate-800 dark:border-slate-200 hover:border-blue-400'} bg-white dark:bg-zinc-900 ${isSelected ? 'shadow-[0_0_0_4px_rgba(59,130,246,0.15)]' : ''}`;
        }
    };

    return (
        <div className="relative group h-full">
            <NodeResizer
                minWidth={100}
                minHeight={60}
                isVisible={selected}
                lineClassName="border-blue-400 opacity-50"
                handleClassName="h-2.5 w-2.5 bg-blue-500 border-none rounded"
            />

            <div className={getStatusClasses(status, selected)}>
                <span className={`text-sm font-medium break-words leading-tight ${status === 'neutral' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-900 dark:text-white font-bold'}`}>
                    {data.label as string || '活动(动宾词组)'}
                </span>

                {/* Status Badge (Optional, small dot) */}
                {status !== 'neutral' && (
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 
                        ${status === 'red' ? 'bg-rose-500' : status === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}
                    `} />
                )}
            </div>

            {/* Connectors */}
            <OctopusHandles />
        </div>
    );
};

export default memo(ActivityNode);
