// Remote Import (Cloud Native)
import { MingdaoAuthSDK } from 'https://cdn.jsdelivr.net/gh/santaalex/mop-elements@764bccb/MingdaoAuthSDK.js';
import { ENV_CONFIG } from './config.js';
export const CONFIG = {
    // 你的工作表 ID
    WORKSHEET_ID: '697b7620ba088c775961b7b0',
    // 你的视图 ID (V3 搜索必须)
    VIEW_ID: '697b7620ba088c775961b7b4',

    // 字段对照表 (Field IDs)
    FIELDS: {
        USERNAME: '697b7620ba088c775961b7b1', // 用户名
        PASSWORD: '697b7667821b53911b7727aa', // 密码
        STATUS: '697b7667821b53911b7727ab',   // 账号状态
        NICKNAME: '697b7667821b53911b7727ac'  // 昵称
    },

    // 状态枚举值
    STATUS_OPTS: {
        PENDING: '117da386-fa03-4407-aa0d-66d5bc874133', // 待审核
        ACTIVE: '9111a5cf-0545-470a-b3e8-5f03abd1b6f8',  // 启用
        DISABLED: '65e84dfe-734a-4554-8752-9a0f650f7d6f' // 停用
    },

    // 凭证
    CREDENTIALS: {
        APP_KEY: 'd3aba8d467ffabd2',
        SIGN: 'NzBhN2U0NDU5MGE1NzVlMjQxZjhiMDFjMGFkZjU4ODNmYTYyODBiOWNjN2VkZWE1YjkyNTZhOGE3MjE2NjY4ZQ=='
    },

    // API Host V3 (Local Proxy)
    API_HOST: '/api/mingdao/v3/app/worksheets'
};

export class AuthService {
    constructor() {
        // V3 headers
        this.headers = {
            'Content-Type': 'application/json',
            'HAP-AppKey': CONFIG.CREDENTIALS.APP_KEY,
            'HAP-Sign': CONFIG.CREDENTIALS.SIGN
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
     * 登录 (Login)
     * 使用 V3 列表查询接口 (rows/list)
     */
    async login(username, password) {
        // V3 Doc: /rows/list
        const url = `${CONFIG.API_HOST}/${CONFIG.WORKSHEET_ID}/rows/list`;

        const filter = {
            type: 'group',
            logic: 'AND',
            children: [
                {
                    type: 'condition',
                    field: CONFIG.FIELDS.USERNAME,
                    operator: 'eq',
                    value: username
                },
                {
                    type: 'condition',
                    field: CONFIG.FIELDS.STATUS,
                    operator: 'eq',
                    value: CONFIG.STATUS_OPTS.ACTIVE
                }
            ]
        };

        const payload = {
            viewId: CONFIG.VIEW_ID,
            pageSize: 1,
            pageIndex: 1,
            useFieldIdAsKey: true, // 关键：强制 V3 返回 Field ID
            filter: filter
        };

        try {
            console.log(`[Auth] Login Query: ${username}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            // V3 Resp: { data: { rows: [] }, success: true }
            if (result.success && result.data && result.data.rows && result.data.rows.length > 0) {
                const user = result.data.rows[0];
                console.log('[Auth] Login Row Data:', JSON.stringify(user)); // Debug Log

                const dbPassHash = user[CONFIG.FIELDS.PASSWORD];

                // 本地比对哈希
                const inputPassHash = await this._hash(password);

                if (dbPassHash === inputPassHash) {
                    return {
                        success: true,
                        user: {
                            rowId: user.rowId || user.rowid || user.id,
                            username: user[CONFIG.FIELDS.USERNAME],
                            nickname: user[CONFIG.FIELDS.NICKNAME]
                        }
                    };
                } else {
                    return { success: false, message: '密码错误' };
                }
            } else {
                return { success: false, message: '账号不存在或未激活' };
            }
        } catch (error) {
            console.error('Login Error:', error);
            return { success: false, message: '系统连接失败' };
        }
    }

    /**
     * 注册 (Register)
     * V3 Endpoint: /rows (新建行)
     */
    async register(username, password, nickname) {
        // V3 Doc: /rows (Add)
        const url = `${CONFIG.API_HOST}/${CONFIG.WORKSHEET_ID}/rows`;

        const passHash = await this._hash(password);

        // 严格遵循文档: fields: [{id, value}]
        const fields = [
            { id: CONFIG.FIELDS.USERNAME, value: username },
            { id: CONFIG.FIELDS.PASSWORD, value: passHash },
            { id: CONFIG.FIELDS.NICKNAME, value: nickname },
            { id: CONFIG.FIELDS.STATUS, value: CONFIG.STATUS_OPTS.PENDING }
        ];

        const payload = {
            triggerWorkflow: true,
            fields: fields
        };

        try {
            console.log(`[Auth] Register Payload:`, JSON.stringify(payload));
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.success) {
                return { success: true, message: '注册申请已提交，等待管理员审核' };
            } else {
                return { success: false, message: result.error_msg || '注册失败' };
            }
        } catch (error) {
            console.error('Register Error:', error);
            return { success: false, message: '系统连接失败' };
        }
    }

    /**
     * 验证身份 (Verify Identity)
     * 使用 V3 列表查询接口 (rows/list)
     */
    async verifyIdentity(username, nickname) {
        console.log(`[Auth] Verifying: User=${username}, Nick=${nickname}`);

        const url = `${CONFIG.API_HOST}/${CONFIG.WORKSHEET_ID}/rows/list`;
        const filter = {
            type: 'group',
            logic: 'AND',
            children: [
                {
                    type: 'condition',
                    field: CONFIG.FIELDS.USERNAME,
                    operator: 'eq',
                    value: username
                }
            ]
        };

        const payload = {
            viewId: CONFIG.VIEW_ID, // V3 必须
            pageSize: 1,
            pageIndex: 1,
            useFieldIdAsKey: true, // 关键：强制返回字段 ID 作为 Key
            filter: filter
        };

        try {
            console.log(`[Auth] Fetching from: ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            console.log('[Auth] API Response:', result);

            if (result.success && result.data && result.data.rows && result.data.rows.length > 0) {
                const user = result.data.rows[0];
                // 打印完整的 row 结构以便调试
                console.log('[Auth] Full Row Data:', JSON.stringify(user));

                const dbNick = user[CONFIG.FIELDS.NICKNAME];
                const rowId = user.rowId || user.rowid || user.id; // Compatible V2/V3/CamelCase

                console.log(`[Auth] Found User: RowId=${rowId}, DB_NickName=${dbNick}`);

                // 宽松匹配
                if (dbNick == nickname) {
                    console.log('[Auth] Identity Verified!');
                    return { success: true, rowId: rowId };
                } else {
                    console.error(`[Auth] Mismatch! Input=${nickname}, DB=${dbNick}`);
                    return { success: false, message: `验证失败：用户名存在，但昵称不匹配 (库中为: ${dbNick})` };
                }
            } else {
                console.warn('[Auth] No user found with that username');
                return { success: false, message: '验证失败：找不到该用户名' };
            }
        } catch (error) {
            console.error('Verify Error:', error);
            return { success: false, message: '网络错误' };
        }
    }

    /**
     * 更新账号信息 (Update)
     * V3 Endpoint: /rows/{row_id}
     */
    async updateAccount(rowId, updates) {
        const url = `${CONFIG.API_HOST}/${CONFIG.WORKSHEET_ID}/rows/${rowId}`;
        const fields = [];

        if (updates.password) {
            const hashed = await this._hash(updates.password);
            fields.push({ id: CONFIG.FIELDS.PASSWORD, value: hashed });
        }

        if (updates.nickname) fields.push({ id: CONFIG.FIELDS.NICKNAME, value: updates.nickname });
        if (updates.status) fields.push({ id: CONFIG.FIELDS.STATUS, value: updates.status });

        if (fields.length === 0) return { success: false, message: '没有需要更新的字段' };

        // V3 Update Structure (Strictly fields array)
        const payload = {
            triggerWorkflow: true,
            fields: fields
        };

        try {
            console.log(`[Auth] Update Payload (Row ${rowId}):`, JSON.stringify(payload));
            const response = await fetch(url, {
                method: 'PATCH',
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
            console.error('Update Error:', error);
            return { success: false, message: '网络错误' };
        }
    }
}
