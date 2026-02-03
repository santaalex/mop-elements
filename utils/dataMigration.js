/**
 * Data Migration Utilities for L3 Matrix
 * 参考: Prisma Migrations (幂等性), Redux Toolkit (数据标准化)
 * 
 * Purpose: Migrate old Assignment format to new SOP-centric format
 * - Old: { tasks, processPIs, qualityPIs }
 * - New: { sopAssignments: [{ sopId, tasks, pis }] }
 */

/**
 * Migrate Assignment from old format to new format
 * 
 * @param {Object} assignment - Old or new format assignment
 * @param {Object} activity - Associated activity (for default SOP)
 * @returns {Object} Migrated assignment (new format)
 * 
 * @example
 * const oldAssignment = {
 *   activityId: 'act-1',
 *   roleId: 'role-1',
 *   content: { tasks: ['审批'], processPIs: ['完整性'], qualityPIs: [] }
 * };
 * 
 * const newAssignment = migrateAssignment(oldAssignment, activity);
 * // => { activityId, roleId, sopAssignments: [{ sopId, tasks, pis }] }
 */
export function migrateAssignment(assignment, activity) {
    // ✅ 幂等性检查 (Idempotent check) - 参考 Prisma
    if (assignment.sopAssignments) {
        console.log('[Migration] Assignment already migrated, skipping.');
        return assignment;
    }

    console.log('[Migration] Migrating assignment:', assignment.roleId);

    // Extract old format data
    const { tasks = [], processPIs = [], qualityPIs = [] } = assignment.content || {};

    // ✅ Ensure Activity has at least one SOP
    if (!activity.sops || activity.sops.length === 0) {
        console.warn('[Migration] No SOPs found, creating default SOP for activity:', activity.id);
        activity.sops = [{
            id: `${activity.id}-default-sop`,
            name: '默认流程',
            order: 1,
            description: '由旧数据自动迁移生成'
        }];
    }

    // Map all data to the first SOP (default behavior)
    const defaultSopId = activity.sops[0].id;

    return {
        activityId: assignment.activityId,
        roleId: assignment.roleId,

        // ✅ New format
        sopAssignments: [
            {
                sopId: defaultSopId,
                tasks: tasks,
                pis: [
                    // Merge processPIs
                    ...processPIs.map(pi => normalizePIFormat(pi, 'process')),
                    // Merge qualityPIs
                    ...qualityPIs.map(pi => normalizePIFormat(pi, 'quality'))
                ]
            }
        ]
    };
}

/**
 * Normalize PI format: string or old object → new object
 * 参考: Redux Toolkit Entity Normalization
 * 
 * @param {string|Object} pi - PI in old format (string or object)
 * @param {string} type - 'process' or 'quality'
 * @returns {Object} Standardized PI object
 * 
 * @example
 * normalizePIFormat('审批完整性', 'process')
 * // => { name: '审批完整性', type: 'process', metricDef: {...} }
 * 
 * normalizePIFormat({ name: '完整性', metricDef: {...} }, 'process')
 * // => { name: '完整性', type: 'process', metricDef: {...} }
 */
export function normalizePIFormat(pi, type) {
    // Case 1: String format (old legacy)
    if (typeof pi === 'string') {
        return {
            name: pi,
            type: type,
            metricDef: {
                targetValue: null,
                warningThreshold: null,
                currentValue: null,
                unit: '%',
                direction: 'HigherBetter',
                dataSource: null
            }
        };
    }

    // Case 2: Object format (Step 3 format or new format)
    return {
        name: pi.name || 'Unnamed PI',
        type: type,
        metricDef: {
            targetValue: pi.metricDef?.targetValue ?? null,
            warningThreshold: pi.metricDef?.warningThreshold ?? null,
            currentValue: pi.metricDef?.currentValue ?? pi.currentValue ?? null,
            unit: pi.metricDef?.unit || '%',
            direction: pi.metricDef?.direction || 'HigherBetter',
            dataSource: pi.metricDef?.dataSource || null
        }
    };
}

/**
 * Migrate entire MatrixView data (all assignments)
 * 
 * @param {Object} matrixData - MatrixView.data
 * @returns {Object} Migrated data
 * 
 * @example
 * const migratedData = migrateMatrixData(matrixView.data);
 */
export function migrateMatrixData(matrixData) {
    console.log('[Migration] Starting full data migration...');

    const { activities, roles, assignments } = matrixData;

    // Create activity lookup map for fast access
    const activityMap = new Map(activities.map(a => [a.id, a]));

    // Migrate all assignments
    const migratedAssignments = assignments.map(assignment => {
        const activity = activityMap.get(assignment.activityId);

        if (!activity) {
            console.error('[Migration] Activity not found:', assignment.activityId);
            return assignment; // Skip migration
        }

        return migrateAssignment(assignment, activity);
    });

    console.log('[Migration] Migration complete. Migrated', migratedAssignments.length, 'assignments.');

    return {
        activities,
        roles,
        assignments: migratedAssignments
    };
}

/**
 * Validate migrated data (sanity check)
 * 参考: TypeScript Runtime Type Checking
 * 
 * @param {Object} data - Migrated data
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateMigratedData(data) {
    const errors = [];

    // Check all assignments have sopAssignments
    data.assignments.forEach((assignment, idx) => {
        if (!assignment.sopAssignments) {
            errors.push(`Assignment ${idx} (role: ${assignment.roleId}) missing sopAssignments`);
        }

        // Check all sopAssignments reference valid SOPs
        const activity = data.activities.find(a => a.id === assignment.activityId);
        if (activity && assignment.sopAssignments) {
            assignment.sopAssignments.forEach(sa => {
                const sopExists = activity.sops?.some(sop => sop.id === sa.sopId);
                if (!sopExists) {
                    errors.push(`SOP ${sa.sopId} not found in activity ${activity.id}`);
                }
            });
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}
