export const ENV_CONFIG = {
    // API Connection
    API_HOST: '/api/mingdao/v3/app/worksheets',

    // Credentials
    APP_KEY: 'd3aba8d467ffabd2',
    SIGN: 'NzBhN2U0NDU5MGE1NzVlMjQxZjhiMDFjMGFkZjU4ODNmYTYyODBiOWNjN2VkZWE1YjkyNTZhOGE3MjE2NjY4ZQ==',

    // Worksheet Config (Projects)
    WORKSHEET_ID: '6978a032c77fe2e8449cb929',
    VIEW_ID: '6978a032c77fe2e8449cb92d',

    // Field Definitions (Schema)
    FIELDS: {
        // User Table (Existing)
        USERNAME: '697b7620ba088c775961b7b1',
        PASSWORD: '697b7667821b53911b7727aa',
        STATUS: '697b7667821b53911b7727ab',
        NICKNAME: '697b7667821b53911b7727ac',

        // Project Table (New)
        PROJ_NAME: 'project_name',
        PROJ_CODE: 'project_code',
        PROJ_DESC: 'project_desc',
        PROJ_VER: 'dsl_version',
        PROJ_VER: 'dsl_version',
        // Critical Missing Field
        CANVAS_DATA: 'canvas_data',
        // Manual Metadata (Optional but Recommended)
        PROJ_CREATOR: 'creator_name',    // 文本/Member
        PROJ_DATE: 'created_at'          // 文本/Date
    },

    // Business Logic Constants
    STATUS_OPTS: {
        PENDING: '117da386-fa03-4407-aa0d-66d5bc874133', // 待审核
        ACTIVE: '9111a5cf-0545-470a-b3e8-5f03abd1b6f8',  // 启用
        DISABLED: '65e84dfe-734a-4554-8752-9a0f650f7d6f' // 停用
    }
};
