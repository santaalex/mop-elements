import { ENV_CONFIG } from './config.js';

/**
 * 核心数据基类 (Core Data Base Class)
 * 职责：封装与明道云 V3 API 的所有底层通信细节 (Headers, Error Handling, Fetch).
 */
export class MingdaoBaseService {
    constructor() {
        this.headers = {
            'Content-Type': 'application/json',
            'HAP-AppKey': ENV_CONFIG.APP_KEY,
            'HAP-Sign': ENV_CONFIG.SIGN
        };
        this.baseUrl = ENV_CONFIG.API_HOST; // e.g., /api/mingdao/v3/app/worksheets
    }

    /**
     * 通用：列表查询 (Get List)
     * @param {string} worksheetId - 表 ID
     * @param {string} viewId - 视图 ID (V3 必须)
     * @param {object} filter - 筛选条件 (Filter Object)
     * @param {number} pageSize - 分页大小 
     */
    async queryList(worksheetId, viewId, filter = {}, pageSize = 50, useFieldIdAsKey = false) {
        const url = `${this.baseUrl}/${worksheetId}/rows/list`;
        const payload = {
            viewId: viewId,
            pageSize: pageSize,
            pageIndex: 1,
            useFieldIdAsKey: useFieldIdAsKey,
            filter: filter
        };

        return this._request(url, payload);
    }

    /**
     * 通用：新建行 (Create Row)
     * @param {string} worksheetId 
     * @param {Array<{id: string, value: any}>} fields - [{id, value}] 数组
     */
    async addRow(worksheetId, fields) {
        const url = `${this.baseUrl}/${worksheetId}/rows`;
        const payload = {
            triggerWorkflow: true,
            fields: fields
        };

        const res = await this._request(url, payload);
        // V3 Create 成功通常返回 { data: "row_id", success: true }
        if (res.success && res.data) {
            return { success: true, rowId: res.data };
        }
        return res;
    }

    /**
     * 通用：更新行 (Update Row)
     * @param {string} worksheetId 
     * @param {string} rowId 
     * @param {Array<{id: string, value: any}>} fields 
     */
    async updateRow(worksheetId, rowId, fields) {
        const url = `${this.baseUrl}/${worksheetId}/rows/${rowId}`;
        const payload = {
            triggerWorkflow: true,
            fields: fields
        };
        return this._request(url, payload, 'PATCH');
    }

    async getRow(worksheetId, rowId) {
        // V3 Get Row Detail
        const url = `${this.baseUrl}/${worksheetId}/rows/${rowId}`;
        return this._request(url, {}, 'GET');
    }

    /**
     * 通用：删除行 (Delete Row)
     * @param {string} worksheetId 
     * @param {string} rowId 
     */
    async deleteRow(worksheetId, rowId) {
        const url = `${this.baseUrl}/${worksheetId}/rows/${rowId}`;
        const payload = {
            triggerWorkflow: true
        };
        const res = await this._request(url, payload, 'DELETE');
        if (res.success) {
            return { success: true };
        }
        return res;
    }

    /**
     * 底层请求发送器
     */
    async _request(url, payload, method = 'POST') {
        try {
            const options = {
                method: method,
                headers: this.headers
            };
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                options.body = JSON.stringify(payload);
            }

            console.log(`[V3 API] ${method} ${url}`, payload);
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success && result.error_code) {
                console.error('[V3 API Error]', result);
                return { success: false, message: result.error_msg || '未知 API 错误' };
            }

            return result; // Return raw result (success: true/false is inside)
        } catch (error) {
            console.error('[Network Error]', error);
            return { success: false, message: '网络请求失败' };
        }
    }
}
