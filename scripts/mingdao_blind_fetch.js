
const APP_KEY = '2a33997f99650134';
const SIGN = 'ODMzZGQ5OWIwYTYwNDUyOTZiNDJhYmI4Y2I4M2RiN2IyMWIzNzkwMTkyNzI3NjRkMmVlMDQzZjBhYWFlMjYzNw==';
const BASE_URL = 'https://api.mingdao.com/v2/open/worksheet/getFilterRows';

async function run() {
    console.log(`Blind Fetching from ${BASE_URL}...`);

    // Try "ProcessKpi" as ID
    const body = {
        appKey: APP_KEY,
        sign: SIGN,
        worksheetId: 'ProcessKpi',
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
        console.log('Response:', JSON.stringify(data, null, 2));

    } catch (e) {
        console.error(e);
    }
}

run();
