
export const getKpiStatus = (
    actual?: string | number,
    target?: string | number,
    direction: 'higher' | 'lower' = 'higher',
    warning?: string | number,
    critical?: string | number
): 'green' | 'yellow' | 'red' | 'neutral' => {
    if (!actual || !target) return 'neutral';

    const a = typeof actual === 'string' ? parseFloat(actual) : actual;
    const t = typeof target === 'string' ? parseFloat(target) : target;

    if (isNaN(a) || isNaN(t)) return 'neutral';

    // Resolve thresholds
    let w = warning ? (typeof warning === 'string' ? parseFloat(warning) : warning) : NaN;
    let c = critical ? (typeof critical === 'string' ? parseFloat(critical) : critical) : NaN;

    if (direction === 'higher') {
        // Default thresholds if not set: <90% warning, <80% critical
        if (isNaN(w)) w = t * 0.9;
        if (isNaN(c)) c = t * 0.8;

        if (a <= c) return 'red';
        if (a < w) return 'yellow';
        return 'green';
    } else {
        // Lower is better
        // Default thresholds: >110% warning, >120% critical
        if (isNaN(w)) w = t * 1.1;
        if (isNaN(c)) c = t * 1.2;

        if (a >= c) return 'red';
        if (a > w) return 'yellow';
        return 'green';
    }
};

export const getStatusColor = (status: string) => {
    switch (status) {
        case 'green': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800';
        case 'yellow': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-800';
        case 'red': return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 ring-1 ring-rose-200 dark:ring-rose-800';
        default: return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
    }
};
