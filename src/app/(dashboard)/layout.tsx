import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import Link from 'next/link';
import { User, LogOut, LayoutDashboard, Plus } from 'lucide-react';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30">
            {/* Navigation Bar */}
            <nav className="sticky top-0 z-40 w-full border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
                <div className="container flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
                    <div className="flex gap-6 md:gap-10">
                        <Link href="/dashboard" className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <span className="hidden font-bold sm:inline-block text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                                MoP 流程决策平台
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {session.user.email}
                            </span>
                        </div>

                        <form action="/api/auth/logout" method="POST">
                            <button
                                type="submit"
                                className="p-2 text-slate-500 hover:text-red-600 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-900"
                                title="退出登录"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </nav>

            <main className="container max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
