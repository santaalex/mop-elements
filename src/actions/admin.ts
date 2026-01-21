'use server'

import prisma from '@/lib/db'
import { verifySession } from '@/lib/session'
import { redirect } from 'next/navigation'

// Middleware-like check for Admin Role
async function checkAdmin() {
    const session = await verifySession()
    if (!session.isAuth) redirect('/login')

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { role: true }
    })

    if (!user || user.role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required')
    }
    return true
}

// --- User Management ---

export async function getUsers() {
    await checkAdmin()
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: { projects: true }
                }
            }
        })
        return { success: true, data: users }
    } catch (error) {
        return { success: false, error: 'Failed to fetch users' }
    }
}

// --- License Management ---

export async function getLicenseKeys() {
    await checkAdmin()
    try {
        const keys = await prisma.licenseKey.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            }
        })
        return { success: true, data: keys }
    } catch (error) {
        return { success: false, error: 'Failed to fetch keys' }
    }
}

export async function generateLicenseKey(type: 'TRIAL' | 'ANNUAL', days: number) {
    await checkAdmin()
    try {
        // Format: MOP-{TYPE}-{RANDOM}-{TIMESTAMP}
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase()
        const timePart = Date.now().toString(36).substring(4).toUpperCase()
        const key = `MOP-${type}-${randomPart}-${timePart}`

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + days)

        const newKey = await prisma.licenseKey.create({
            data: {
                key,
                planType: type,
                status: 'ACTIVE',
                expiresAt
            }
        })
        return { success: true, data: newKey }
    } catch (error) {
        return { success: false, error: 'Failed to generate key' }
    }
}

export async function revokeLicenseKey(id: string) {
    await checkAdmin()
    try {
        await prisma.licenseKey.update({
            where: { id },
            data: { status: 'REVOKED' }
        })
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to revoke key' }
    }
}

export async function deleteLicenseKey(id: string) {
    await checkAdmin()
    try {
        await prisma.licenseKey.delete({
            where: { id }
        })
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to delete key' }
    }
}
