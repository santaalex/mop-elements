
const fs = require('fs');
const APP_KEY = '2a33997f99650134';
const SIGN = 'ODMzZGQ5OWIwYTYwNDUyOTZiNDJhYmI4Y2I4M2RiN2IyMWIzNzkwMTkyNzI3NjRkMmVlMDQzZjBhYWFlMjYzNw==';
const URL = 'https://api.mingdao.com/v2/open/worksheet/getWorksheets'; // Correct endpoint for V2

async function run() {
    console.log(`Fetching from ${URL}...`);
    try {
        const res = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appKey: APP_KEY, sign: SIGN })
        });

        console.log(`Status: ${res.status}`);
        const data = await res.json();

        fs.writeFileSync('mingdao_response.json', JSON.stringify(data, null, 2));
        console.log('Saved response to mingdao_response.json');

    } catch (e) {
        console.error(e);
    }
}

run();
