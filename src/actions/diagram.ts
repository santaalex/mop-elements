'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function saveDiagram(projectId: string, nodes: any[], edges: any[]) {
    try {
        const data = JSON.stringify({ nodes, edges });

        await db.project.update({
            where: { id: projectId },
            data: { data },
        });

        revalidatePath(`/project/${projectId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to save diagram:', error);
        return { success: false, error: 'Failed to save diagram' };
    }
}

export async function getDiagram(projectId: string) {
    try {
        const project = await db.project.findUnique({
            where: { id: projectId },
            select: { data: true },
        });

        // Also fetch which nodes have L2 diagrams
        const l2Diagrams = await db.poolSwimlaneDiagram.findMany({
            where: { projectId },
            select: { parentProcessId: true },
        });

        const populatedProcessIds = l2Diagrams.map(d => d.parentProcessId);

        if (!project?.data) {
            return { success: true, data: null, populatedProcessIds };
        }

        return { success: true, data: JSON.parse(project.data), populatedProcessIds };
    } catch (error) {
        console.error('Failed to load diagram:', error);
        return { success: false, error: 'Failed to load diagram' };
    }
}

export async function getOrCreateL2Diagram(projectId: string, parentProcessId: string, name: string) {
    try {
        // 1. Check if it exists
        const existing = await db.poolSwimlaneDiagram.findFirst({
            where: {
                projectId,
                parentProcessId,
            },
        });

        if (existing) {
            return { success: true, id: existing.id };
        }

        // 2. Create if not
        const newDiagram = await db.poolSwimlaneDiagram.create({
            data: {
                name,
                projectId,
                parentProcessId,
                data: '{}', // Empty initial state
            },
        });

        return { success: true, id: newDiagram.id };
    } catch (error) {
        console.error('Failed to get/create L2 diagram:', error);
        return { success: false, error: 'Failed to create L2 diagram' };
    }
}

export async function saveL2Diagram(diagramId: string, nodes: any[], edges: any[]) {
    try {
        const data = JSON.stringify({ nodes, edges });

        await db.poolSwimlaneDiagram.update({
            where: { id: diagramId },
            data: { data },
        });

        revalidatePath(`/project/[id]/process/${diagramId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to save L2 diagram:', error);
        return { success: false, error: 'Failed to save L2 diagram' };
    }
}

export async function getL2Diagram(diagramId: string) {
    try {
        const diagram = await db.poolSwimlaneDiagram.findUnique({
            where: { id: diagramId },
            select: { data: true },
        });

        if (!diagram?.data) {
            return { success: true, data: null };
        }

        return { success: true, data: JSON.parse(diagram.data) };
    } catch (error) {
        console.error('Failed to load L2 diagram:', error);
        return { success: false, error: 'Failed to load L2 diagram' };
    }
}
