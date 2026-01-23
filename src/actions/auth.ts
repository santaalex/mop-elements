'use server'

import { redirect } from 'next/navigation'
import { hashPassword, verifyPassword } from '@/lib/auth-utils'
import prisma from '@/lib/db'
import { createSession, deleteSession } from '@/lib/session'
import { loginSchema, registerSchema } from '@/lib/validations/auth'

export async function register(prevState: any, formData: FormData) {
    const rawData = {
        email: formData.get('email'),
        password: formData.get('password'),
        name: formData.get('name'),
    }

    const validation = registerSchema.safeParse(rawData);

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors.email?.[0] || validation.error.flatten().fieldErrors.password?.[0] || '输入无效' };
    }

    const { email, password, name } = validation.data;

    // 1. Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        return { error: '该邮箱已被注册' }
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

    // 4. Create Session (Defaults to USER)
    await createSession(newUser.id, newUser.name || 'User', 'USER') // Changed

    redirect('/dashboard')
}

export async function login(prevState: any, formData: FormData) {
    const rawData = {
        email: formData.get('email'),
        password: formData.get('password'),
    }

    const validation = loginSchema.safeParse(rawData);

    if (!validation.success) {
        return { error: '邮箱或密码格式错误' }
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return { error: '邮箱或密码错误' }
    }

    // Pass user.role from DB
    await createSession(user.id, user.name || 'User', user.role) // Changed
    redirect('/dashboard')
}

export async function logout() {
    await deleteSession()
    redirect('/login')
}
