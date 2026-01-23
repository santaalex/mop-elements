/**
 * SIMULATION SCRIPT: Mingdao Yun -> MOP Platform
 * 
 * Usage: 
 *   node scripts/simulate_mingdao.js [project_id] [node_id] [action]
 * 
 * Example:
 *   node scripts/simulate_mingdao.js my-project-id node-1 ENTER
 */

const http = require('http');

// CONFIGURATION
const API_HOST = 'localhost';
const API_PORT = 3000;
const API_PATH = '/api/webhooks/mingdao/ingest';

const projectId = process.argv[2] || 'ac59f012-ec08-4d40-8b85-3c8c221cf400';
const nodeKey = process.argv[3] || 'activity-1769098455643';
const action = process.argv[4] || 'ENTER'; // ENTER, LEAVE

// Generate a random trace ID or use one
const traceId = 'ORDER-' + Math.floor(Math.random() * 10000);

const payload = {
    traceId: traceId,
    nodeKey: nodeKey,
    action: action,
    timestamp: Date.now(),
    operator: 'Simulated User',
    payload: {
        amount: 100,
        sku: 'TEST-SKU-001'
    }
};

const data = JSON.stringify(payload);

const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: API_PATH,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-project-id': projectId // Important header for our Mock implementation
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let responseData = '';
    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('RESPONSE:', responseData);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

// Write data to request body
req.write(data);
req.end();

console.log(`Sending Webhook: ${action} -> Node: ${nodeKey} (Trace: ${traceId})`);
