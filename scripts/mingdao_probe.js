
const APP_KEY = '2a33997f99650134';
const SIGN = 'ODMzZGQ5OWIwYTYwNDUyOTZiNDJhYmI4Y2I4M2RiN2IyMWIzNzkwMTkyNzI3NjRkMmVlMDQzZjBhYWFlMjYzNw==';
const BASE_URL = 'https://api.mingdao.com';

async function probeEndpoint(name, url, method, body, headers = {}) {
    console.log(`\n--- Probing ${name} ---`);
    console.log(`URL: ${url} | Method: ${method}`);

    const options = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers }
    };

    if (Object.keys(body).length > 0 && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    try {
        const res = await fetch(url, options);
        console.log(`Status: ${res.status}`);
        if (!res.ok) {
            console.log('Text:', await res.text().catch(() => 'No Body'));
            return;
        }

        const data = await res.json();
        // console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');

        // Check for success flags commonly used
        if (data.data || data.worksheets) {
            console.log('SUCCESS! Found data structure.');
            const str = JSON.stringify(data);
            if (str.includes('ProcessKpi')) {
                console.log('!!! FOUND ProcessKpi !!!');
                // Regex find ID?
                const match = str.match(/"worksheetId"\s*:\s*"([^"]+)"\s*,\s*"workSheetName"\s*:\s*"ProcessKpi"/);
                if (match) {
                    console.log('WorksheetID:', match[1]);
                } else {
                    // Try reverse order
                    const match2 = str.match(/"workSheetName"\s*:\s*"ProcessKpi"\s*,\s*"worksheetId"\s*:\s*"([^"]+)"/);
                    if (match2) console.log('WorksheetID:', match2[1]);
                    else console.log('Could not extract ID via Regex, please inspect full log.');
                }
                // Dump structure for ProcessKpi
                // Recursive search for the object
                const findDeep = (obj) => {
                    if (!obj) return;
                    if (obj.workSheetName === 'ProcessKpi' || obj.name === 'ProcessKpi') console.log('ProcessKpi Object:', obj);
                    if (typeof obj === 'object') Object.values(obj).forEach(findDeep);
                };
                findDeep(data);

            } else {
                console.log('ProcessKpi not found in this response.');
            }
        } else {
            console.log('Response valid but no data array found.');
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function run() {
    // 1. V1 Application GetWorksheetsByAppId (POST)
    await probeEndpoint('V1 GetWorksheetsByAppId (POST)',
        `${BASE_URL}/v1/Application/GetWorksheetsByAppId`,
        'POST',
        { appKey: APP_KEY, sign: SIGN }
    );

    // 2. V2 Open Worksheet getWorksheets (POST)
    await probeEndpoint('V2 Open getWorksheets (POST)',
        `${BASE_URL}/v2/open/worksheet/getWorksheets`,
        'POST',
        { appKey: APP_KEY, sign: SIGN }
    );

    // 3. V1 Application GetWorksheetsByAppId (GET Query)
    await probeEndpoint('V1 GetWorksheetsByAppId (GET)',
        `${BASE_URL}/v1/Application/GetWorksheetsByAppId?appKey=${APP_KEY}&sign=${encodedSign()}`,
        'GET',
        {}
    );

    // 4. MCP List ? (POST)
    // Sometimes MCP endpoints respond to JSON RPC
    await probeEndpoint('MCP Endpoint (POST)',
        `${BASE_URL}/mcp?HAP-Appkey=${APP_KEY}&HAP-Sign=${encodedSign()}`,
        'POST',
        { method: 'list_resources', params: {}, jsonrpc: '2.0', id: 1 }
    );
}

function encodedSign() {
    return encodeURIComponent(SIGN);
}

run();
