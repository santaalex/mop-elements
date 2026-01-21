
const fs = require('fs');
const url = 'https://apidoc.mingdao.com/application/zh-Hans/openapi.yaml?1756104794';

async function run() {
    console.log(`Downloading ${url}...`);
    const res = await fetch(url);
    const text = await res.text();
    fs.writeFileSync('openapi.yaml', text);
    console.log(`Downloaded ${text.length} bytes.`);
}

run();
