import prisma from '@/lib/db';

export type SubscriptionStatus = {
    isValid: boolean;
    planName: string; // '专业版' | '试用版' | '已过期'
    expiresAt: Date | null;
    remainingDays: number;
};

export async function getUserSubscription(userId: string): Promise<SubscriptionStatus> {
    const keys = await prisma.licenseKey.findMany({
        where: {
            userId: userId,
            status: 'ACTIVE',
        },
        orderBy: {
            expiresAt: 'desc',
        },
    });

    const now = new Date();
    // Find the latest valid key
    const activeKey = keys.find(k => k.expiresAt > now);

    if (!activeKey) {
        // Check if they had a key before (expired)
        const expiredKey = keys[0]; // Since we ordered by desc, this is the latest one
        return {
            isValid: false,
            planName: '已过期',
            expiresAt: expiredKey ? expiredKey.expiresAt : null,
            remainingDays: 0,
        };
    }

    const expiresAt = activeKey.expiresAt;
    const diffTime = Math.abs(expiresAt.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let planName = '普通版';
    if (activeKey.planType === 'ANNUAL') planName = '专业版 (年付)';
    if (activeKey.planType === 'TRIAL') planName = '试用版';

    return {
        isValid: true,
        planName,
        expiresAt,
        remainingDays: diffDays,
    };
}
