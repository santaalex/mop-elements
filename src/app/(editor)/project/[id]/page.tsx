import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Share2, Settings, MoreHorizontal } from 'lucide-react';
import CollaborationEditor from '@/components/diagram/CollaborationEditor';
import prisma from '@/lib/db';
import { notFound } from 'next/navigation';

async function getProject(id: string) {
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            user: {
                select: { name: true, email: true }
            }
        }
    });

    if (!project) return null;
    return project;
}

export default async function ProjectEditorPage({ params }: { params: { id: string } }) {
    const project = await getProject(params.id);

    if (!project) {
        notFound();
    }

    return (
        <div className="flex flex-col h-full">
            {/* Editor Header */}
            <header className="h-14 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard"
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        title="返回工作台"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="font-semibold text-slate-900 dark:text-white leading-tight">
                                {project.name}
                            </h1>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-500 border border-slate-200 dark:border-zinc-700">
                                草稿
                            </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            由 {project.user.name || project.user.email} 编辑
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-1 mr-4 text-xs text-slate-400">
                        <span>自动保存于 刚刚</span>
                    </div>

                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <Share2 className="w-4 h-4" />
                        分享
                    </button>



                    <button className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Editor Canvas Area */}
            <main className="flex-1 bg-slate-50 dark:bg-zinc-950 relative overflow-hidden">
                <CollaborationEditor projectId={params.id} />
            </main>
        </div>
    );
}
