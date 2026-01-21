
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Current Projects in DB ---');
    const projects = await prisma.project.findMany({
        select: { id: true, name: true, createdAt: true }
    });

    if (projects.length === 0) {
        console.log('No projects found.');
    } else {
        projects.forEach(p => {
            console.log(`[${p.id}] ${p.name} (${p.createdAt.toISOString()})`);
        });
    }
    console.log(`\nTotal Count: ${projects.length}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
