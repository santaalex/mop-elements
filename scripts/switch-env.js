/**
 * Switch Environment Script
 * 快速切换本地/CDN环境
 * 
 * Usage:
 *   node scripts/switch-env.js local
 *   node scripts/switch-env.js cdn
 */

const fs = require('fs');
const path = require('path');

const env = process.argv[2]; // 'local' or 'cdn'

if (!env || !['local', 'cdn'].includes(env)) {
    console.error('❌ Invalid environment. Use: local or cdn');
    console.log('Usage: node scripts/switch-env.js [local|cdn]');
    process.exit(1);
}

const indexPath = path.join(__dirname, '..', 'index.html');

try {
    let html = fs.readFileSync(indexPath, 'utf-8');

    // Replace USE_CDN value
    const useCdn = env === 'cdn';
    html = html.replace(
        /const USE_CDN = (true|false);/,
        `const USE_CDN = ${useCdn};`
    );

    fs.writeFileSync(indexPath, html, 'utf-8');

    console.log(`✅ Environment switched to: ${env.toUpperCase()}`);
    console.log(`📍 USE_CDN = ${useCdn}`);
    console.log(`🔄 Please refresh your browser (Ctrl+Shift+R)`);
} catch (error) {
    console.error('❌ Failed to switch environment:', error.message);
    process.exit(1);
}
