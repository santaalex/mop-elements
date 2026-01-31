/**
 * MingdaoAuthSDK.js
 * 
 * A generic, reusable SDK for Mingdao App V3 Authentication.
 * Contains NO hardcoded credentials. All configuration is injected via constructor.
 * 
 * Capability:
 * - Login (Rows List Search)
 * - Register (Add Row)
 * - Verify Identity (Rows List Search)
 * - Update Account (Update Row)
 */
export class MingdaoAuthSDK {
    /**
     * @param {Object} config
     * @param {string} config.apiHost - e.g., "https://api.mingdao.com/v3/app/worksheets" or proxy
     * @param {string} config.appKey - Mingdao App Key
     * @param {string} config.sign - Mingdao Sign
     * @param {string} config.worksheetId - User Table Worksheet ID
     * @param {string} config.viewId - User Table View ID (Required for Search)
     * @param {Object} config.fieldMapping - Map generic keys (USERNAME) to specific Field IDs
     * @param {Object} config.statusMapping - Map status keys (ACTIVE) to specific Option IDs
     */
    constructor(config) {
        this.config = config;
        this.headers = {
            'Content-Type': 'application/json',
            'HAP-AppKey': config.appKey,
            'HAP-Sign': config.sign
        };
    }

    /**
     * Helper: SHA-256 Hashing
     */
    async _hash(message) {
        if (!message) return '';
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    /**
     * Generic Search Helper (V3)
     */
    async _searchUser(username) {
        const url = `${this.config.apiHost}/${this.config.worksheetId}/rows/list`;

        const filter = {
            type: 'group',
            logic: 'AND',
            children: [
                {
                    type: 'condition',
                    field: this.config.fieldMapping.USERNAME,
                    operator: 'eq',
                    value: username
                }
            ]
        };

        // Add Status filter if ACTIVE is defined in mapping and we are logging in (not verifying)
        // For simplicity, verifyIdentity usually doesn't strictly require status check, but Login does.
        // We'll let the caller handle complex logic, or keep it simple here:
        // This is a basic "Find User by Username" helper.

        const payload = {
            viewId: this.config.viewId,
            pageSize: 1,
            pageIndex: 1,
            useFieldIdAsKey: true,
            filter: filter
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(payload)
        });
        return await response.json();
    }

    async login(username, password) {
        const url = `${this.config.apiHost}/${this.config.worksheetId}/rows/list`;

        // Strict Login Filter: Username AND Active Status
        const filter = {
            type: 'group',
            logic: 'AND',
            children: [
                {
                    type: 'condition',
                    field: this.config.fieldMapping.USERNAME,
                    operator: 'eq',
                    value: username
                },
                {
                    type: 'condition',
                    field: this.config.fieldMapping.STATUS,
                    operator: 'eq',
                    value: this.config.statusMapping.ACTIVE
                }
            ]
        };

        const payload = {
            viewId: this.config.viewId,
            pageSize: 1,
            pageIndex: 1,
            useFieldIdAsKey: true,
            filter: filter
        };

        try {
            console.log(`[SDK] Login Query: ${username}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.success && result.data && result.data.rows && result.data.rows.length > 0) {
                const user = result.data.rows[0];
                const dbPassHash = user[this.config.fieldMapping.PASSWORD];
                const inputPassHash = await this._hash(password);

                if (dbPassHash === inputPassHash) {
                    return {
                        success: true,
                        user: {
                            rowId: user.rowid || user.id,
                            username: user[this.config.fieldMapping.USERNAME],
                            nickname: user[this.config.fieldMapping.NICKNAME]
                        }
                    };
                } else {
                    return { success: false, message: '密码错误' };
                }
            } else {
                return { success: false, message: '账号不存在或未激活' };
            }
        } catch (error) {
            console.error('[SDK] Login Error:', error);
            return { success: false, message: '系统连接失败' };
        }
    }

    async register(username, password, nickname) {
        const url = `${this.config.apiHost}/${this.config.worksheetId}/rows`;
        const passHash = await this._hash(password);

        const fields = [
            { id: this.config.fieldMapping.USERNAME, value: username },
            { id: this.config.fieldMapping.PASSWORD, value: passHash },
            { id: this.config.fieldMapping.NICKNAME, value: nickname },
            { id: this.config.fieldMapping.STATUS, value: this.config.statusMapping.PENDING }
        ];

        const payload = {
            triggerWorkflow: true,
            fields: fields
        };

        try {
            console.log(`[SDK] Register Payload:`, JSON.stringify(payload));
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.success) {
                return { success: true, message: '注册申请已提交' };
            } else {
                return { success: false, message: result.error_msg || '注册失败' };
            }
        } catch (error) {
            console.error('[SDK] Register Error:', error);
            return { success: false, message: '系统连接失败' };
        }
    }

    async verifyIdentity(username, nickname) {
        try {
            // Re-use internal search (simplified) or implementation specific search
            // For Verify, we just match username, then check nickname locally
            const result = await this._searchUser(username);

            if (result.success && result.data && result.data.rows && result.data.rows.length > 0) {
                const user = result.data.rows[0];
                const dbNick = user[this.config.fieldMapping.NICKNAME];
                const rowId = user.rowid || user.id;

                // Loose match
                if (dbNick == nickname) {
                    return { success: true, rowId: rowId };
                } else {
                    return { success: false, message: `验证失败：昵称不匹配` };
                }
            } else {
                return { success: false, message: '验证失败：找不到该用户名' };
            }
        } catch (error) {
            console.error('[SDK] Verify Error:', error);
            return { success: false, message: '网络错误' };
        }
    }

    async updateAccount(rowId, updates) {
        const url = `${this.config.apiHost}/${this.config.worksheetId}/rows/${rowId}`;
        const fields = [];

        if (updates.password) {
            const hashed = await this._hash(updates.password);
            fields.push({ id: this.config.fieldMapping.PASSWORD, value: hashed });
        }
        if (updates.nickname) fields.push({ id: this.config.fieldMapping.NICKNAME, value: updates.nickname });
        if (updates.status) fields.push({ id: this.config.fieldMapping.STATUS, value: updates.status });

        if (fields.length === 0) return { success: false, message: 'No fields to update' };

        const payload = {
            triggerWorkflow: true,
            fields: fields
        };

        try {
            console.log(`[SDK] Update Payload:`, JSON.stringify(payload));
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.success) {
                return { success: true, message: '更新成功' };
            } else {
                return { success: false, message: result.error_msg || '更新失败' };
            }
        } catch (error) {
            console.error('[SDK] Update Error:', error);
            return { success: false, message: '网络错误' };
        }
    }
}
