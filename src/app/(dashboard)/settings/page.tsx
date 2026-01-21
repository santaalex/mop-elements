import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/session';
import { getUserSubscription } from '@/lib/subscription';
import { ShieldCheck, CreditCard, Clock } from 'lucide-react';
import RedeemForm from './RedeemForm';

// We need to fetch data client-side or pass it from a server component wrapper.
// Since we want dynamic updates after server action, let's use a standard client component approach 
// but fetch initial data via a server action wrapper or simpler: pure server component page 
// with a client form. Ideally, the page is Server Component, form is Client.

// Let's make this file a client component to handle the form state easily, 
// but we'll fetch data in a useEffect for now to keep it simple without heavy refactoring.
// Actually, better pattern: Page is Server Component -> passes data to Client Component.
// But to save file count, I'll allow this component to fetch its own data on mount via a server action wrapper 
// OR just make it fully client-side fetching from an API? 
// No, let's stick to Server Actions. I'll make a server component wrapper in the same file if possible? 
// No, Next.js doesn't like mixing "use client" and async component export in same file easily.

// Plan: 
// 1. Create a `SubscriptionPanel` client component.
// 2. The default export page will be a Server Component that fetches data and renders the panel.

// --- Main Page Component (Server) ---

export default async function SettingsPage() {
    const session = await verifySession();
    if (!session.isAuth) redirect('/login');

    const sub = await getUserSubscription(session.userId);
    const user = await prisma.user.findUnique({ where: { id: session.userId } });

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">账户设置</h1>

            {/* Profile Section */}
            <div className="bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    基本信息
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold tracking-wider">用户名</label>
                        <div className="mt-1 text-slate-900 dark:text-slate-200 font-medium">{user?.name}</div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold tracking-wider">邮箱地址</label>
                        <div className="mt-1 text-slate-900 dark:text-slate-200 font-mono">{user?.email}</div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 uppercase font-bold tracking-wider">当前角色</label>
                        <div className="mt-1">
                            {user?.role === 'ADMIN' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    管理员
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                    普通用户
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Subscription Section */}
            <div className="bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 rounded-xl p-6 relative overflow-hidden">
                {sub.isValid && sub.planName.includes('专业') && (
                    <div className="absolute top-0 right-0 bg-gradient-to-bl from-amber-200 to-amber-100 text-amber-800 px-4 py-1 rounded-bl-xl text-xs font-bold shadow-sm">
                        尊贵会员
                    </div>
                )}

                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    订阅状态
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">当前版本</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {sub.planName}
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 剩余有效期
                        </div>
                        <div className={`text-xl font-bold ${sub.remainingDays < 7 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {sub.isValid ? `${sub.remainingDays} 天` : '已过期'}
                        </div>
                    </div>
                </div>

                {sub.expiresAt && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg text-sm mb-6 flex items-center justify-between">
                        <span>您的权益将有效期至：</span>
                        <span className="font-mono font-bold">
                            {sub.expiresAt.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                )}

                <div className="border-t border-slate-100 dark:border-zinc-800 pt-6">
                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">激活 / 续费</h3>
                    <p className="text-xs text-slate-500 mb-4">
                        输入您获得的激活码以延长服务时间或升级版本。
                    </p>
                    <RedeemForm />
                </div>
            </div>
        </div>
    );
}
