export interface NodeKPI {
    id: string;
    name: string;
    target: string;
    unit: string;
    actual?: string;
    warning?: string;    // Yellow threshold
    critical?: string;   // Red threshold
    direction?: 'higher' | 'lower';
    mingdaoId?: string;  // Data Source ID
    definitionId?: string; // Reference to Global Resource ID
}

// --- Activity Matrix Types (New) ---

export interface MatrixKPI {
    id: string;
    name: string;
    target: string;
    unit: string;
    actual?: string;
    mingdaoId?: string;
    // Status Logic
    direction?: 'higher' | 'lower';
    warning?: string;
    critical?: string;
}

export interface MatrixRoleData {
    roleId: string;       // e.g. "technician"
    roleName: string;     // e.g. "安装技师"

    // The "What & How"
    sopContent: string;   // Tasks & SOP Instructions

    // The "Standard" (Split)
    processStandard: string; // 工艺标准
    qualityStandard: string; // 质量标准

    // The "Measure" (Multiple KPIs)
    kpis: MatrixKPI[];

    // Legacy fields (Deprecated - kept for transitional compatibility)
    standard?: string;
    piName?: string;
    target?: string;
    unit?: string;
    actual?: string;
    mingdaoId?: string;
    warning?: string;
    critical?: string;
    direction?: 'higher' | 'lower';
}

// The "Row" in the Matrix: A Sub-activity (Step)
export interface SubActivity {
    id: string;
    name: string;         // e.g. "1. 安装预检"
    roles: MatrixRoleData[];
}

export interface RoleConfig {
    id: string;
    name: string;
    colorTheme?: 'blue' | 'purple' | 'green' | 'orange' | 'slate';
}

