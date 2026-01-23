import { ResourceManager } from '@/components/resources/ResourceManager';
import prisma from '@/lib/db';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/session';

interface ResourcesPageProps {
    params: {
        id: string;
    }
}

export default async function ResourcesPage({ params }: ResourcesPageProps) {
    const session = await getSession();
    if (!session) {
        // middleware should handle this but just in case
        return <div>Unauthorized</div>;
    }

    const projectId = params.id;
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { data: true, name: true }
    });

    if (!project) {
        notFound();
    }

    let initialResources = undefined;
    try {
        const parsed = JSON.parse(project.data as string || '{}');
        initialResources = parsed.resources;
    } catch (e) {
        console.error('Failed to parse project resources', e);
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 bg-white dark:bg-slate-900 sticky top-0 z-10">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    <span className="text-slate-500 font-normal">{project.name} / </span>
                    Resources
                </h1>
            </header>
            <ResourceManager projectId={projectId} initialResources={initialResources} />
        </div>
    );
}
