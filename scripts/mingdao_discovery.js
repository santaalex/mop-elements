
const APP_KEY = '2a33997f99650134';
const SIGN = 'ODMzZGQ5OWIwYTYwNDUyOTZiNDJhYmI4Y2I4M2RiN2IyMWIzNzkwMTkyNzI3NjRkMmVlMDQzZjBhYWFlMjYzNw==';
const BASE_URL = 'https://api.mingdao.com';

async function fetchWorksheets() {
    console.log('--- Fetching Worksheets (V1) ---');
    const url = `${BASE_URL}/v1/Application/GetWorksheetsByAppId`;

    const body = {
        appKey: APP_KEY,
        sign: SIGN
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        console.log(`Status: ${res.status}`);
        const data = await res.json();
        // console.log('Response:', JSON.stringify(data, null, 2)); // Detailed log

        if (data.data && Array.isArray(data.data)) {
            // V1 structure: data.data is list of groups/worksheets?
            // Usually data.data.worksheets or similar.
            console.log("Root content keys:", Object.keys(data.data[0] || {}));

            // Search Recursively
            function findWorksheet(items) {
                for (const item of items) {
                    if (item.workSheetName === 'ProcessKpi' || item.workSheetName === 'MoP数据') {
                        return item;
                    }
                    if (item.items) { // Groups?
                        const found = findWorksheet(item.items);
                        if (found) return found;
                    }
                    // Check 'workSheetInfo' if embedded?
                }
                return null;
            }

            // Dump structure briefly
            console.log('Structure Preview:', JSON.stringify(data.data.slice(0, 2), null, 1));
        } else {
            console.log('Unexpected Response Structure:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Error fetching worksheets:', error);
    }
}

fetchWorksheets();
