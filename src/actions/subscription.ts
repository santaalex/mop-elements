'use server'

import prisma from '@/lib/db'
import { verifySession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function redeemKey(prevState: any, formData: FormData) {
    const keyString = formData.get('key') as string

    if (!keyString || keyString.trim().length === 0) {
        return { success: false, message: '请输入激活码' }
    }

    // 1. Authenticate
    const session = await verifySession()
    if (!session.isAuth) {
        return { success: false, message: '请先登录' }
    }

    try {
        // 2. Find Key
        const license = await prisma.licenseKey.findUnique({
            where: { key: keyString.trim() }
        })

        if (!license) {
            return { success: false, message: '无效的激活码' }
        }

        if (license.userId) {
            return { success: false, message: '该激活码已被其它账号使用' }
        }

        if (license.status !== 'ACTIVE') {
            return { success: false, message: '该激活码已失效' }
        }

        // 3. Redeem (Bind to User)
        // Note: Currently we keep the original expiration date of the key.
        // Future improvement: Extend user's current expiry if stacking is needed.

        await prisma.licenseKey.update({
            where: { id: license.id },
            data: {
                userId: session.userId,
                // status remains ACTIVE until it expires or is revoked
            }
        })

        revalidatePath('/settings')
        return { success: true, message: '激活成功！权益已到账' }

    } catch (error) {
        console.error('Redeem error:', error)
        return { success: false, message: '激活失败，请稍后重试' }
    }
}
