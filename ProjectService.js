import { ENV_CONFIG } from './config.js';
import { MingdaoBaseService } from './MingdaoBaseService.js';

export class ProjectService extends MingdaoBaseService {

    /**
     * Get Projects List
     */
    async getProjects(username) {
        // 1. Prepare Filter (Empty for MVP/Global)
        const filter = {
            // type: 'group'... if needed
        };

        // 2. Call Base Method (useFieldIdAsKey = false to use Aliases)
        const result = await this.queryList(
            ENV_CONFIG.WORKSHEET_ID,
            ENV_CONFIG.VIEW_ID,
            filter,
            50,
            false // <--- Critical Change: Return Aliases (project_name), not IDs
        );

        // 3. Transform Data (Business Logic)
        if (result.success && result.data && result.data.rows) {
            // Map raw fields to our semantic objects
            // V3 Alias Mode System Fields:
            // ownerid: { fullname: "..." }
            // utime: "2026-01-31 10:30:00"
            console.log('[ProjectService] Raw Rows:', result.data.rows); // <--- DEBUG LOG

            return result.data.rows.map(row => {
                // Safe Date Parsing
                // Priority: Manual 'created_at' -> utime -> ctime
                const timeStr = row[ENV_CONFIG.FIELDS.PROJ_DATE] || row.utime || row.ctime;
                let updatedStr = 'N/A';

                if (timeStr) {
                    try {
                        const date = new Date(timeStr.replace(/-/g, '/'));
                        if (!isNaN(date.getTime())) {
                            updatedStr = date.toLocaleDateString();
                        } else {
                            updatedStr = String(timeStr).split(' ')[0];
                        }
                    } catch (e) {
                        updatedStr = timeStr;
                    }
                }

                // Owner Resolution: Manual 'creator_name' -> Owner -> Creator -> Unknown
                let ownerName = 'Unknown';
                // Check manual field first
                if (row[ENV_CONFIG.FIELDS.PROJ_CREATOR]) {
                    ownerName = row[ENV_CONFIG.FIELDS.PROJ_CREATOR];
                    // If it's an object (Member field)
                    if (typeof ownerName === 'object' && ownerName.fullname) {
                        ownerName = ownerName.fullname;
                    }
                }
                // Fallback to System Fields
                else if (row.ownerid && row.ownerid.fullname) {
                    ownerName = row.ownerid.fullname;
                } else if (row.caid && row.caid.fullname) {
                    ownerName = row.caid.fullname;
                } else if (row.owneraccountname) {
                    ownerName = row.owneraccountname;
                }

                // Robust ID Retrieval
                // V3 Alias Mode: Key is 'rowId' (CamelCase)
                const finalId = row.rowId || row.rowid || row.id || row.row_id;
                if (!finalId) {
                    console.warn('[ProjectService] Missing ID for row:', Object.keys(row), row);
                }

                // Hierarchy Resolution
                let parentInfo = null;
                const rawParent = row[ENV_CONFIG.FIELDS.PARENT_ID] || row.parent_id;
                if (rawParent) {
                    // Check if it's an array (Mingdao returns array for relations) or object
                    const parentObj = Array.isArray(rawParent) ? rawParent[0] : rawParent;
                    if (parentObj) {
                        parentInfo = {
                            id: parentObj.sid || parentObj.rowid || parentObj.id,
                            name: parentObj.name || parentObj.project_name || 'Unknown Parent'
                        };
                    }
                }

                return {
                    id: finalId,
                    name: row[ENV_CONFIG.FIELDS.PROJ_NAME] || '未命名项目',
                    code: row[ENV_CONFIG.FIELDS.PROJ_CODE],
                    desc: row[ENV_CONFIG.FIELDS.PROJ_DESC],
                    version: row[ENV_CONFIG.FIELDS.PROJ_VER],
                    canvasData: row[ENV_CONFIG.FIELDS.CANVAS_DATA] || JSON.stringify({ version: "3.0", lanes: [], nodes: [] }),
                    updatedAt: updatedStr,
                    owner: ownerName,
                    parent: parentInfo // <--- New Field
                };
            });
        } else {
            console.warn('[Project] Fetch failed:', result);
            return [];
        }
    }

    /**
     * Create New Project
     * @param {string} name 
     * @param {string} creatorName 
     * @param {string} parentId - Optional: ID of the parent project (for L2)
     */
    async createProject(name, creatorName = 'Unknown', parentId = null) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

        // V3 API Rule: Inside 'fields' array, the key MUST be 'id'
        const fields = [
            { id: ENV_CONFIG.FIELDS.PROJ_NAME, value: name },
            { id: ENV_CONFIG.FIELDS.PROJ_CODE, value: 'P-' + Date.now().toString().slice(-6) },
            { id: ENV_CONFIG.FIELDS.PROJ_VER, value: '1.0.0' },
            { id: ENV_CONFIG.FIELDS.CANVAS_DATA, value: JSON.stringify({ version: "3.0", lanes: [], nodes: [] }) },
            // Manual Metadata
            { id: ENV_CONFIG.FIELDS.PROJ_CREATOR, value: creatorName },
            { id: ENV_CONFIG.FIELDS.PROJ_DATE, value: dateStr }
        ];

        // If Parent ID is provided, add the relation link
        if (parentId) {
            fields.push({
                id: ENV_CONFIG.FIELDS.PARENT_ID,
                value: String(parentId) // Mingdao Relation usually expects Row ID string
            });
        }

        // WAITING: V3 `rows` endpoint payload for aliases.
        // Standard: [{ controlId: "alias", value: "val" }] works in some versions, or simply map { "alias": "val" } in `cells`?
        // Safe bet: The generic `addRow` in BaseService expects `fields` array.
        // Let's assume Mingdao V3 supports `controlId` for alias.

        return this.addRow(ENV_CONFIG.WORKSHEET_ID, fields);
    }

    /**
     * Update Project Canvas
     * Wraps V3 /rows/{id} endpoint
     */
    async saveCanvas(rowId, canvasJsonString) {
        const fields = [
            { id: ENV_CONFIG.FIELDS.CANVAS_DATA, value: canvasJsonString }
        ];
        const res = await this.updateRow(ENV_CONFIG.WORKSHEET_ID, rowId, fields);
        return res.success;
    }

    /**
     * Delete Project
     * GitHub-Safe interaction relies on UI, but Service just executes.
     */
    async deleteProject(rowId) {
        return this.deleteRow(ENV_CONFIG.WORKSHEET_ID, rowId);
    }

    /**
     * Update Project Meta
     */
    async updateProjectMetadata(rowId, name, desc) {
        const fields = [
            { id: ENV_CONFIG.FIELDS.PROJ_NAME, value: name },
            { id: ENV_CONFIG.FIELDS.PROJ_DESC, value: desc }
        ];
        const res = await this.updateRow(ENV_CONFIG.WORKSHEET_ID, rowId, fields);
        return res;
    }
}
