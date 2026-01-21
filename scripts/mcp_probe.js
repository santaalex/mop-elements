
const APP_KEY = '2a33997f99650134';
const SIGN = 'ODMzZGQ5OWIwYTYwNDUyOTZiNDJhYmI4Y2I4M2RiN2IyMWIzNzkwMTkyNzI3NjRkMmVlMDQzZjBhYWFlMjYzNw==';
const BASE_URL = 'https://api.mingdao.com/mcp';

async function run() {
    const url = `${BASE_URL}?HAP-Appkey=${APP_KEY}&HAP-Sign=${encodeURIComponent(SIGN)}`;
    console.log(`Probing MCP: ${url}`);

    const body = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "list_resources",
        "params": {}
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log('Response:', text.substring(0, 1000));
    } catch (e) {
        console.error(e);
    }
}

run();
