const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('1. Testing Connection...');
        const projectCount = await prisma.project.count();
        console.log('   Projects:', projectCount);

        console.log('2. Testing New Tables (Digital Twin)...');
        try {
            const instanceCount = await prisma.processInstance.count();
            console.log('   ProcessInstances:', instanceCount);
        } catch (e) {
            console.error('   FAILED to access ProcessInstance table. Schema mismatch?');
            throw e;
        }

        try {
            const statsCount = await prisma.nodeRealtimeStats.count();
            console.log('   NodeRealtimeStats:', statsCount);
        } catch (e) {
            console.error('   FAILED to access NodeRealtimeStats table.');
            throw e;
        }

        console.log('SUCCESS: Database and Client are in sync.');

    } catch (e) {
        console.error('FATAL ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
