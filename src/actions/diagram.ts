'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { diagramDataSchema } from '@/lib/validations/diagram';
import { verifyProjectOwnership, verifyL2DiagramOwnership } from '@/lib/permission';

export async function saveDiagram(projectId: string, nodes: any[], edges: any[]) {
    try {
        // 1. Check permissions
        const auth = await verifyProjectOwnership(projectId);
        if (!auth.isAuthorized) {
            return { success: false, error: auth.error };
        }

        // 2. Validate data
        const validatedData = diagramDataSchema.parse({ nodes, edges });
        const data = JSON.stringify(validatedData);

        await db.project.update({
            where: { id: projectId },
            data: { data },
        });

        revalidatePath(`/project/${projectId}`);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to save diagram:', error);
        if (error.constructor.name === 'ZodError') {
            return { success: false, error: 'Validation failed: Invalid diagram data structure' };
        }
        return { success: false, error: 'Failed to save diagram' };
    }
}

// Options interface for flexible fetching
interface GetDiagramOptions {
    includeL2Nodes?: boolean;
    includeRealtimeStats?: boolean;
}

export async function getDiagram(projectId: string, options: GetDiagramOptions = {}) {
    try {
        // 1. Check permissions
        const auth = await verifyProjectOwnership(projectId);
        if (!auth.isAuthorized) {
            return { success: false, error: auth.error };
        }

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

        const parsedData = JSON.parse(project.data);

        // --- MERGE L2 NODES (Only if requested for Monitor Global View) ---
        if (options.includeL2Nodes) {
            const l2DiagramsData = await db.poolSwimlaneDiagram.findMany({
                where: { projectId },
                select: { id: true, data: true, parentProcessId: true },
            });

            const l2Nodes: any[] = [];
            const l2Edges: any[] = [];

            l2DiagramsData.forEach(l2 => {
                try {
                    const data = JSON.parse(l2.data);
                    if (data.nodes && Array.isArray(data.nodes)) {
                        l2Nodes.push(...data.nodes);
                    }
                    if (data.edges && Array.isArray(data.edges)) {
                        l2Edges.push(...data.edges);
                    }
                } catch (e) {
                    console.error(`Failed to parse L2 diagram ${l2.id}`, e);
                }
            });

            // If L1 is empty but we have L2 data, use L2 data
            if ((!parsedData.nodes || parsedData.nodes.length === 0) && l2Nodes.length > 0) {
                parsedData.nodes = l2Nodes;
                parsedData.edges = l2Edges;
            } else if (l2Nodes.length > 0) {
                parsedData.nodes = [...(parsedData.nodes || []), ...l2Nodes];
                parsedData.edges = [...(parsedData.edges || []), ...l2Edges];
            }
        }
        // ---------------------------------------

        // --- MERGE REAL-TIME STATISTICS (Only if requested) ---
        if (options.includeRealtimeStats) {
            const realTimeStats = await db.nodeRealtimeStats.findMany({
                where: { projectId },
            });

            const statsMap = new Map(realTimeStats.map(s => [s.nodeId, s]));

            if (parsedData.nodes && Array.isArray(parsedData.nodes)) {
                parsedData.nodes = parsedData.nodes.map((node: any) => {
                    const stat = statsMap.get(node.id);
                    if (stat) {
                        return {
                            ...node,
                            data: {
                                ...node.data,
                                activeCount: stat.activeCount,
                                avgWaitTime: stat.avgWaitTime,
                                status: stat.status,
                            }
                        };
                    }
                    return node;
                });
            }
        }
        // ----------------------------------

        return { success: true, data: parsedData, populatedProcessIds };
    } catch (error) {
        console.error('Failed to load diagram:', error);
        return { success: false, error: 'Failed to load diagram' };
    }
}

export async function getOrCreateL2Diagram(projectId: string, parentProcessId: string, name: string) {
    try {
        // 1. Check permissions (Must own parent project)
        const auth = await verifyProjectOwnership(projectId);
        if (!auth.isAuthorized) {
            return { success: false, error: auth.error };
        }

        // 2. Check if it exists
        const existing = await db.poolSwimlaneDiagram.findFirst({
            where: {
                projectId,
                parentProcessId,
            },
        });

        if (existing) {
            return { success: true, id: existing.id };
        }

        // 3. Create if not
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
        // 1. Check permissions
        const auth = await verifyL2DiagramOwnership(diagramId);
        if (!auth.isAuthorized) {
            return { success: false, error: auth.error };
        }

        // 2. Validate data
        const validatedData = diagramDataSchema.parse({ nodes, edges });
        const data = JSON.stringify(validatedData);

        await db.poolSwimlaneDiagram.update({
            where: { id: diagramId },
            data: { data },
        });

        revalidatePath(`/project/[id]/process/${diagramId}`);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to save L2 diagram:', error);
        if (error.constructor.name === 'ZodError') {
            return { success: false, error: 'Validation failed: Invalid diagram data structure' };
        }
        return { success: false, error: 'Failed to save L2 diagram' };
    }
}

export async function getL2Diagram(diagramId: string) {
    try {
        // 1. Check permissions
        const auth = await verifyL2DiagramOwnership(diagramId);
        if (!auth.isAuthorized) {
            return { success: false, error: auth.error };
        }

        const diagram = await db.poolSwimlaneDiagram.findUnique({
            where: { id: diagramId },
            select: { data: true, projectId: true },
        });

        if (!diagram?.data) {
            return { success: true, data: null };
        }

        const parsedData = JSON.parse(diagram.data);

        // --- MERGE REAL-TIME STATISTICS ---
        const realTimeStats = await db.nodeRealtimeStats.findMany({
            where: { projectId: diagram.projectId },
        });

        const statsMap = new Map(realTimeStats.map(s => [s.nodeId, s]));

        if (parsedData.nodes && Array.isArray(parsedData.nodes)) {
            parsedData.nodes = parsedData.nodes.map((node: any) => {
                const stat = statsMap.get(node.id);
                if (stat) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            activeCount: stat.activeCount,
                            avgWaitTime: stat.avgWaitTime,
                            status: stat.status,
                        }
                    };
                }
                return node;
            });
        }
        // ----------------------------------

        return { success: true, data: parsedData };
    } catch (error) {
        console.error('Failed to load L2 diagram:', error);
        return { success: false, error: 'Failed to load L2 diagram' };
    }
}
