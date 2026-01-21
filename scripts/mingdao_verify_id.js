
const APP_KEY = '2a33997f99650134';
const SIGN = 'ODMzZGQ5OWIwYTYwNDUyOTZiNDJhYmI4Y2I4M2RiN2IyMWIzNzkwMTkyNzI3NjRkMmVlMDQzZjBhYWFlMjYzNw==';
const BASE_URL = 'https://api.mingdao.com/v2/open/worksheet/getFilterRows';

// Extracted from URL: .../695bd1edb50d95a5bb579b7e/...
const WORKSHEET_ID = '695bd1edb50d95a5bb579b7e';

async function run() {
    console.log(`Verifying ID: ${WORKSHEET_ID}...`);

    const body = {
        appKey: APP_KEY,
        sign: SIGN,
        worksheetId: WORKSHEET_ID,
        pageSize: 10
    };

    try {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        console.log(`Status: ${res.status}`);
        const data = await res.json();

        if (data.success && data.data) {
            console.log('SUCCESS! Rows found:', data.data.rows.length);
            if (data.data.rows.length > 0) {
                const firstRow = data.data.rows[0];
                console.log('--- TARGET DATA ---');
                console.log('KPI Name:', firstRow['696f28413528addfe10159fc']);
                console.log('Value:', firstRow['696f28413528addfe10159fd']);
                console.log('ROW ID (Use this in Diagram):', firstRow.rowid);
                console.log('-------------------');
            }
        } else {
            console.log('Failed:', JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error(e);
    }
}

run();
