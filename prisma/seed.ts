import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const password = await hash('password123', 12)

    const user = await prisma.user.upsert({
        where: { email: 'admin@mingdao.com' },
        update: {},
        create: {
            email: 'admin@mingdao.com',
            name: 'Admin User',
            passwordHash: password,
            role: 'ADMIN',
            // Create a default 7-day trial key for the admin
            licenseKeys: {
                create: {
                    key: 'ADMIN-TRIAL-KEY-' + Date.now(),
                    status: 'ACTIVE',
                    planType: 'TRIAL',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            }
        },
    })

    console.log({ user })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
