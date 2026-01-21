'use client';

import { useEffect, useState } from 'react';
import { getUsers } from '@/actions/admin';
import { Shield, ShieldAlert, User as UserIcon } from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        const res = await getUsers();
        if (res.success && res.data) {
            setUsers(res.data);
        }
        setLoading(false);
    };

    if (loading) return <div className="text-slate-500">Loading users...</div>;

    // ...
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">用户管理</h2>
                    <p className="text-slate-500 text-sm">管理注册用户及其权限角色。</p>
                </div>
                <div className="text-sm text-slate-400">
                    总计: <span className="font-bold text-slate-700 dark:text-slate-200">{users.length}</span>
                </div>
            </div>

// ... imports

            // ... inside component
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800 text-slate-500">
                        <tr>
                            <th className="px-6 py-4 font-medium">姓名</th>
                            <th className="px-6 py-4 font-medium">邮箱</th>
                            <th className="px-6 py-4 font-medium">角色</th>
                            <th className="px-6 py-4 font-medium">加入时间</th>
                            <th className="px-6 py-4 font-medium">项目数</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
// ...
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500">
                                            <UserIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{user.name || 'Unknown'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                    {user.email}
                                </td>
                                <td className="px-6 py-4">
                                    {user.role === 'ADMIN' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                            <ShieldAlert className="w-3 h-3" />
                                            ADMIN
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                            <Shield className="w-3 h-3" />
                                            USER
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-600">
                                        {user._count.projects}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
