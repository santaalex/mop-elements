
const APP_KEY = '2a33997f99650134';
const SIGN = 'ODMzZGQ5OWIwYTYwNDUyOTZiNDJhYmI4Y2I4M2RiN2IyMWIzNzkwMTkyNzI3NjRkMmVlMDQzZjBhYWFlMjYzNw==';
const APP_ID = '02238ebc-5806-4f52-9491-d9be007a6005';
const BASE_URL = 'https://api.mingdao.com';

async function run() {
    const url = `${BASE_URL}/v1/Application/GetWorksheetsByAppId`;
    console.log(`Querying ${url} with AppID...`);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appKey: APP_KEY,
                sign: SIGN,
                appId: APP_ID
            })
        });

        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

run();
