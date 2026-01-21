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
}

// --- Activity Matrix Types (New) ---

export interface MatrixRoleData {
    roleId: string;       // e.g. "technician"
    roleName: string;     // e.g. "安装技师"

    // The "What & How"
    sopContent: string;   // Tasks & SOP Instructions

    // The "Standard" (New requirement)
    standard: string;     // Craftsmanship Standards & Quality Points

    // The "Measure" (KPI)
    piName: string;       // KPI Name
    target: string;       // Target Value
    unit: string;
    actual?: string;      // Live Data from Mingdao

    // Thresholds
    warning?: string;
    critical?: string;
    direction?: 'higher' | 'lower';
    mingdaoId?: string;   // For Sync link
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

