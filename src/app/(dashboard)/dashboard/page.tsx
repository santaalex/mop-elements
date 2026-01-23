import Link from 'next/link';
import { Plus, FolderOpen, ArrowRight, Clock } from 'lucide-react';
import { getSession } from '@/lib/session';
import prisma from '@/lib/db';
import DeleteProjectButton from '@/components/dashboard/DeleteProjectButton';
import ProjectImporter from '@/components/dashboard/ProjectImporter';
import ProjectExporter from '@/components/dashboard/ProjectExporter';
import EditProjectButton from '@/components/dashboard/EditProjectButton';

async function getProjects(userId: string) {
    return await prisma.project.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
            _count: {
                select: { l2Diagrams: true }
            }
        }
    });
}

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) return null; // Layout handles redirect

    const projects = await getProjects(session.user.id);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">工作台</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">管理您的业务流程可视化项目。</p>
                </div>
                <div className="flex items-center gap-3">
                    <ProjectImporter userId={session.user.id} />
                    <Link
                        href="/project/new"
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 py-2 shadow-lg shadow-indigo-500/25"
                    >
                        <Plus className="w-4 h-4" />
                        创建新项目
                    </Link>
                </div>
            </div>

            {/* Project Grid */}
            {projects.length === 0 ? (
                <div className="min-h-[400px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-4">
                        <FolderOpen className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">暂无项目</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm text-center mt-1 mb-6">
                        创建您的第一个项目，开始可视化业务流程。
                    </p>
                    <Link
                        href="/project/new"
                        className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                        创建第一个项目 <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project: any) => (
                        <div
                            key={project.id}
                            className="group relative flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm hover:shadow-md transition-all hover:border-indigo-500/50 dark:hover:border-indigo-500/50"
                        >
                            {/* Delete Button - Outside Link */}
                            <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                                <EditProjectButton
                                    projectId={project.id}
                                    projectName={project.name}
                                    projectDescription={project.description}
                                />
                                <ProjectExporter projectId={project.id} projectName={project.name} />
                                <DeleteProjectButton projectId={project.id} projectName={project.name} />
                            </div>

                            <Link href={`/project/${project.id}`} className="flex-1 flex flex-col justify-between">


                                <div className="space-y-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <FolderOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {project.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                            {project.description || '暂无描述'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-medium">
                                        {project._count.l2Diagrams} 个流程图
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
