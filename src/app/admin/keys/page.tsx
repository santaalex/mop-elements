'use client';

import { useEffect, useState } from 'react';
import { getLicenseKeys, generateLicenseKey, revokeLicenseKey, deleteLicenseKey } from '@/actions/admin';
import { Key, Plus, Trash2, Ban, CheckCircle, Copy } from 'lucide-react';

export default function KeysPage() {
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        const res = await getLicenseKeys();
        if (res.success && res.data) {
            setKeys(res.data);
        }
        setLoading(false);
    };

    const handleGenerate = async (type: 'TRIAL' | 'ANNUAL') => {
        setGenerating(true);
        const days = type === 'TRIAL' ? 14 : 365;
        const res = await generateLicenseKey(type, days);
        if (res.success) {
            await loadKeys();
        }
        setGenerating(false);
    };

    // ...
    const handleRevoke = async (id: string) => {
        if (!confirm('确定要吊销该密钥吗？用户将无法继续使用。')) return;
        const res = await revokeLicenseKey(id);
        if (res.success) loadKeys();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('永久删除该记录？此操作不可恢复。')) return;
        const res = await deleteLicenseKey(id);
        if (res.success) loadKeys();
    };

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        alert('已复制到剪贴板！');
    };
    // ...

    if (loading) return <div className="text-slate-500">Loading keys...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">密钥管理</h2>
                    <p className="text-slate-500 text-sm">生成和管理系统访问激活码。</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleGenerate('TRIAL')}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        生成试用码 (14天)
                    </button>
                    <button
                        onClick={() => handleGenerate('ANNUAL')}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        生成正式码 (年付)
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {keys.map((key) => (
                    <div key={key.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                                ${key.status === 'ACTIVE'
                                    ? key.planType === 'ANNUAL' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                    : 'bg-slate-100 text-slate-400'
                                }`}>
                                <Key className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-mono font-bold text-slate-700 dark:text-slate-200 text-sm tracking-wide">
                                        {key.key}
                                    </h3>
                                    <button onClick={() => copyKey(key.key)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-500 transition-opacity">
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                    <span className={`px-1.5 py-0.5 rounded border ${key.planType === 'ANNUAL' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                                        }`}>
                                        {key.planType === 'ANNUAL' ? '年付版' : '试用版'}
                                    </span>
                                    <span>有效期至: {new Date(key.expiresAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                                    {key.user && (
                                        <span className="flex items-center gap-1 text-slate-400">
                                            • 使用者: <span className="text-slate-600 font-medium">{key.user.name || key.user.email}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {key.status === 'ACTIVE' ? (
                                <button
                                    onClick={() => handleRevoke(key.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="吊销密钥"
                                >
                                    <Ban className="w-4 h-4" />
                                </button>
                            ) : (
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded text-xs font-bold">
                                    已吊销
                                </span>
                            )}
                            <button
                                onClick={() => handleDelete(key.id)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="删除记录"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {keys.length === 0 && (
                    <div className="text-center py-12 text-slate-400 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                        暂无生成的密钥记录。
                    </div>
                )}
            </div>
        </div>
    );
}
