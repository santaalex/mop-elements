'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { hashPassword, verifyPassword } from '@/lib/auth-utils'
import prisma from '@/lib/db'
import { createSession, deleteSession } from '@/lib/session'

// Simple validation schemas (if we had zod installed, we'd use it, but manual is fine too or minimal zod)
// Actually we didn't install zod, let's install it or just do manual checks?
// Wait, standard nextjs usually suggests zod. I'll do manual for speed/robustness without internet.
// Actually I see I didn't install zod. I will do simple checks.

export async function register(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string

    if (!email || !password || password.length < 6) {
        return { error: 'Invalid input. Password must be at least 6 chars.' }
    }

    // 1. Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        return { error: 'User already exists.' }
    }

    // 2. Create User
    const hashedPassword = await hashPassword(password)
    const newUser = await prisma.user.create({
        data: {
            email,
            passwordHash: hashedPassword,
            name,
        },
    })

    // 3. Generate 7-Day Trial Key
    const trialKey = `MOP-TRIAL-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.licenseKey.create({
        data: {
            key: trialKey,
            userId: newUser.id,
            planType: 'TRIAL',
            expiresAt: expiresAt,
        },
    })

    // 4. Create Session
    await createSession(newUser.id, newUser.name || 'User')

    redirect('/dashboard')
}

export async function login(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return { error: 'Invalid credentials.' }
    }

    await createSession(user.id, user.name || 'User')
    redirect('/dashboard')
}

export async function logout() {
    await deleteSession()
    redirect('/login')
}
