/**
 * MetricCore.js
 * 
 * Core logic for the "Traffic Light" metric model.
 * Pure functions only. No external dependencies.
 */

// 1. Enums
export const MetricDirection = {
    HigherBetter: 'HigherBetter', // e.g. Satisfaction (Target is Minimum)
    LowerBetter: 'LowerBetter',   // e.g. Cost (Target is Maximum)
    MatchTarget: 'MatchTarget'    // e.g. Budget Compliance (Range)
};

export const MetricStatus = {
    Green: 'Green',   // Good / Safe
    Yellow: 'Yellow', // Warning / At Risk
    Red: 'Red',       // Critical / Failed
    Gray: 'Gray'      // Not Defined / No Data
};

// 2. Factory: Lightweight Schema Enforcement
export function createMetric(props = {}) {
    return {
        id: props.id || crypto.randomUUID(), // Ensure ID exists
        name: props.name || 'New Metric',
        unit: props.unit || '',

        // Traffic Light Configuration
        direction: props.direction || MetricDirection.HigherBetter,
        targetValue: typeof props.targetValue === 'number' ? props.targetValue : 100,
        warningThreshold: typeof props.warningThreshold === 'number' ? props.warningThreshold : null, // Optional

        // Dynamic Data (Optional, allows this object to hold state if needed, though usually external)
        currentValue: typeof props.currentValue === 'number' ? props.currentValue : null,

        description: props.description || '',
    };
}

// 3. Logic: Status Calculation (The "Brain")
export function calcMetricStatus(metric, valueOverride = null) {
    const val = valueOverride !== null ? valueOverride : metric.currentValue;

    // 0. No Data Check
    if (val === null || val === undefined || isNaN(val)) {
        return MetricStatus.Gray;
    }

    const { targetValue, warningThreshold, direction } = metric;

    // Warning defaults to target if not set (binary state: Green/Red), 
    // BUT usually simpler to just compare strictly if warning is missing.
    // Let's implement strict logic:
    // Red: < Critical, Yellow: < Warning, Green: >= Target (For HigherBetter)

    // Helper to get effective warning line
    const safeWarning = warningThreshold !== null ? warningThreshold : targetValue;

    if (direction === MetricDirection.HigherBetter) {
        // Example: Target 100, Warning 90.
        // val >= 100 -> Green
        // 90 <= val < 100 -> Yellow
        // val < 90 -> Red
        if (val >= targetValue) return MetricStatus.Green;
        if (val >= safeWarning) return MetricStatus.Yellow;
        return MetricStatus.Red;
    }

    if (direction === MetricDirection.LowerBetter) {
        // Example: Target 10, Warning 15.
        // val <= 10 -> Green
        // 10 < val <= 15 -> Yellow
        // val > 15 -> Red
        if (val <= targetValue) return MetricStatus.Green;
        if (val <= safeWarning) return MetricStatus.Yellow;
        return MetricStatus.Red;
    }

    if (direction === MetricDirection.MatchTarget) {
        // Range Logic: Target is center, Warning is absolute deviation?
        // Or Target/Warning are Min/Max?
        // Let's assert: MatchTarget usually implies "Within Tolerance".
        // Simplification for V1: Match exact target +/- warning tolerance?
        // Current Plan says: "Range". Let's treat targetValue as "Ideal".
        // Let's defer complex MatchTarget logic or implement simple % deviation.
        // For now, return Gray to encourage implementing Higher/Lower first.
        return MetricStatus.Gray;
    }

    return MetricStatus.Gray;
}

// 4. Helper: Format Value
export function formatMetricValue(value, unit = '') {
    if (value === null || value === undefined) return '-';
    // Simple logic: if integer, show int. If float, show 2 decimals.
    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2);
    return unit ? `${formatted} ${unit}` : formatted;
}
