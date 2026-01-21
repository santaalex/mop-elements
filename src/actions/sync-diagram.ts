'use server';

/**
 * Server Action to sync diagram data (KPI actuals) from external source (Mingdao Yun).
 * 
 * CURRENT STATUS: MOCK MODE
 * Returns simulated data to verify frontend UX (Auto-sync, Refresh states, Visual feedback).
 */

interface SyncResult {
    success: boolean;
    data?: Record<string, string>; // Map of MingdaoID -> Actual Value
    message?: string;
    timestamp: string;
}

export async function syncDiagramData(diagramId: string, mingdaoIds: string[]): Promise<SyncResult> {
    console.log(`[Sync] Triggered for diagram ${diagramId} with ${mingdaoIds.length} IDs.`);

    // Handle empty case
    if (mingdaoIds.length === 0) {
        return {
            success: true,
            data: {},
            message: 'No IDs to sync',
            timestamp: new Date().toISOString()
        };
    }

    // --- REAL MINGDAO INTEGRATION ---
    const APP_KEY = '2a33997f99650134';
    const SIGN = 'ODMzZGQ5OWIwYTYwNDUyOTZiNDJhYmI4Y2I4M2RiN2IyMWIzNzkwMTkyNzI3NjRkMmVlMDQzZjBhYWFlMjYzNw==';
    const WORKSHEET_ID = '695bd1edb50d95a5bb579b7e';
    const VALUE_FIELD_ID = '696f28413528addfe10159fd'; // Field: '数值'

    try {
        const response = await fetch('https://api.mingdao.com/v2/open/worksheet/getFilterRows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appKey: APP_KEY,
                sign: SIGN,
                worksheetId: WORKSHEET_ID,
                pageSize: 100, // Fetch up to 100 KPIs
                filterControls: [] // No filter, get all (or filter by IDs if list is huge, but optimized for <100)
            }),
            cache: 'no-store'
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const json = await response.json();

        if (!json.success || !json.data || !json.data.rows) {
            console.error('Mingdao API Error Response:', json);
            return { success: false, message: 'Failed to fetch external data', timestamp: new Date().toISOString() };
        }

        const realData: Record<string, string> = {};

        // Map Row ID -> Value
        json.data.rows.forEach((row: any) => {
            const rowId = row.rowid; // Mingdao Row ID
            const val = row[VALUE_FIELD_ID]; // Value from '数值' column
            if (rowId && val !== undefined && val !== null) {
                realData[rowId] = String(val);
            }
        });

        console.log(`[Sync] Fetched ${json.data.rows.length} rows from Mingdao. Mapped ${Object.keys(realData).length} matching IDs.`);

        return {
            success: true,
            data: realData,
            message: 'Synced successfully',
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Sync Exception:', error);
        return { success: false, message: 'Sync Exception', timestamp: new Date().toISOString() };
    }
}
