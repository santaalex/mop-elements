'use server'

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export type ProjectBackup = {
    project: {
        name: string;
        description: string | null;
        data: string | null;
    };
    l2Diagrams: {
        name: string;
        description: string | null;
        parentProcessId: string;
        data: string | null;
    }[];
    processKpis: {
        name: string;
        target: string;
        unit: string;
        mingdaoFieldId: string | null;
        nodeId: string;
        diagramId: string;
    }[];
    taskPis: {
        stepName: string;
        roleName: string;
        taskDesc: string;
        piName: string;
        target: string;
        mingdaoFieldId: string | null;
        nodeId: string;
        diagramId: string;
    }[];
};

export async function exportProject(projectId: string): Promise<{ success: boolean; data?: ProjectBackup; error?: string }> {
    try {
        console.log(`[Export] Starting export for project: ${projectId}`);
        const project = await db.project.findUnique({
            where: { id: projectId },
            include: {
                l2Diagrams: true,
                processKpis: true,
                taskPis: true,
            },
        });

        if (!project) {
            console.error(`[Export] Project not found: ${projectId}`);
            return { success: false, error: 'Project not found' };
        }

        const backup: ProjectBackup = {
            project: {
                name: project.name,
                description: project.description,
                data: project.data,
            },
            l2Diagrams: project.l2Diagrams.map((d: any) => ({
                name: d.name,
                description: d.description,
                parentProcessId: d.parentProcessId,
                data: d.data,
            })),
            processKpis: project.processKpis.map((k: any) => ({
                name: k.name,
                target: k.target,
                unit: k.unit,
                mingdaoFieldId: k.mingdaoFieldId,
                nodeId: k.nodeId,
                diagramId: k.diagramId,
            })),
            taskPis: project.taskPis.map((t: any) => ({
                stepName: t.stepName,
                roleName: t.roleName,
                taskDesc: t.taskDesc,
                piName: t.piName,
                target: t.target,
                mingdaoFieldId: t.mingdaoFieldId,
                nodeId: t.nodeId,
                diagramId: t.diagramId,
            })),
        };

        return { success: true, data: backup };
    } catch (error: any) {
        console.error('Export Failed:', error);
        return { success: false, error: 'Export failed: ' + (error?.message || String(error)) };
    }
}

export async function importProject(userId: string, backup: ProjectBackup): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
        // Create everything in a transaction (or structured create)
        const newProject = await db.project.create({
            data: {
                userId,
                name: `${backup.project.name} (Imported)`,
                description: backup.project.description,
                data: backup.project.data,
                // Nested writes
                l2Diagrams: {
                    create: backup.l2Diagrams.map((d: any) => ({
                        name: d.name,
                        description: d.description,
                        parentProcessId: d.parentProcessId,
                        data: d.data,
                    }))
                },
                processKpis: {
                    create: backup.processKpis.map((k: any) => ({
                        name: k.name,
                        target: k.target,
                        unit: k.unit,
                        mingdaoFieldId: k.mingdaoFieldId,
                        nodeId: k.nodeId,
                        diagramId: k.diagramId,
                    }))
                },
                taskPis: {
                    create: backup.taskPis.map((t: any) => ({
                        stepName: t.stepName,
                        roleName: t.roleName,
                        taskDesc: t.taskDesc,
                        piName: t.piName,
                        target: t.target,
                        mingdaoFieldId: t.mingdaoFieldId,
                        nodeId: t.nodeId,
                        diagramId: t.diagramId,
                    }))
                }
            },
        });

        revalidatePath('/dashboard');
        return { success: true, projectId: newProject.id };
    } catch (error) {
        console.error('Import Failed:', error);
        return { success: false, error: 'Import failed' };
    }
}
