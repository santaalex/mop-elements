'use client';

import { useState } from 'react';
import { Edit2, Loader2, X, Save } from 'lucide-react';
import { updateProject } from '@/actions/project';
import { useRouter } from 'next/navigation';

interface EditProjectButtonProps {
    projectId: string;
    projectName: string;
    projectDescription?: string;
}

export default function EditProjectButton({ projectId, projectName, projectDescription }: EditProjectButtonProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    // Form state
    const [name, setName] = useState(projectName);
    const [description, setDescription] = useState(projectDescription || '');

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Reset state on open
        setName(projectName);
        setDescription(projectDescription || '');
        setIsOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) return;

        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);

            const res = await updateProject(projectId, formData);
            if (res.error) {
                alert(res.error);
                setIsSaving(false);
            } else {
                setIsOpen(false);
                router.refresh();
                setIsSaving(false);
            }
        } catch (error) {
            alert('更新出错');
            setIsSaving(false);
        }
    };

    return (
        <>
            <button
                onClick={handleClick}
                className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors z-20 relative"
                title="编辑项目信息"
            >
                <Edit2 className="w-4 h-4" />
            </button>

            {/* Modal - Render portal manually or just absolute (since we are in dashboard it works fine with fixed) */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={(e) => {
                        e.stopPropagation(); // Stop click from bubbling to Link or closing if clicking content
                    }}
                >
                    {/* Backdrop click handler */}
                    <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

                    <div
                        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden relative z-10 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">编辑项目信息</h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    项目名称 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="输入项目名称"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    项目描述
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                    placeholder="简要描述项目用途..."
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 flex justify-end gap-3 rounded-b-xl">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !name.trim()}
                                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                保存修改
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
