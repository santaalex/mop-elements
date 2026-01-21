import { verifySession } from '@/lib/session';
import prisma from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, Key, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { logout } from '@/actions/auth';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Verify Auth & Role
    const session = await verifySession();
    if (!session.isAuth) redirect('/login');

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { role: true, name: true }
    });

    if (!user || user.role !== 'ADMIN') {
        redirect('/dashboard'); // Kick non-admins back to dashboard
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-zinc-950">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-zinc-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        MoP Admin
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Hello, {user.name}</p>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                        <Users className="w-4 h-4" />
                        User Management
                    </Link>
                    <Link href="/admin/keys" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                        <Key className="w-4 h-4" />
                        License Keys
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                        <Settings className="w-4 h-4" />
                        Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                        <LayoutDashboard className="w-4 h-4" />
                        Back to App
                    </Link>
                    <form action={logout}>
                        <button className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-colors">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
}
