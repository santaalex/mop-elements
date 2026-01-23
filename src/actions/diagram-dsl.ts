'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { l2GraphSchema, L2Graph, mopDslSchema, MopDsl } from '@/lib/schema/dsl';
import { verifyL2DiagramOwnership, verifyProjectOwnership } from '@/lib/permission';

export async function saveL2DiagramDsl(diagramId: string, graph: L2Graph) {
    try {
        // 1. Check permissions
        const auth = await verifyL2DiagramOwnership(diagramId);
        if (!auth.isAuthorized) {
            return { success: false, error: auth.error };
        }

        // 2. Validate data strictly against DSL Schema
        const validatedGraph = l2GraphSchema.parse(graph);
        const data = JSON.stringify(validatedGraph);

        // 3. Save to DB
        // Note: We are overwriting the 'data' field. 
        // Monitor Page Adapter handles 'legacy JSON' vs 'DSL JSON' detection on read.
        await db.poolSwimlaneDiagram.update({
            where: { id: diagramId },
            data: { data },
        });

        revalidatePath(`/project/[id]/process/${diagramId}`);
        revalidatePath(`/project/[id]/monitor`); // Also revalidate monitor
        return { success: true };
    } catch (error: any) {
        console.error('Failed to save L2 Diagram DSL:', error);
        if (error.constructor.name === 'ZodError') {
            // Extract specific validation errors for better feedback
            const issues = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
            return { success: false, error: `Validation Failed: ${issues}` };
        }
        return { success: false, error: 'Failed to save diagram' };
    }
}

export async function saveDiagramDsl(projectId: string, graph: MopDsl) {
    try {
        // 1. Check permissions
        const auth = await verifyProjectOwnership(projectId);
        if (!auth.isAuthorized) {
            return { success: false, error: auth.error };
        }

        // 2. Validate data strictly against DSL Schema
        const validatedDsl = mopDslSchema.parse(graph);
        const data = JSON.stringify(validatedDsl);

        // 3. Save to DB Project.data
        // We overwrite the legacy JSON with new DSL JSON
        await db.project.update({
            where: { id: projectId },
            data: { data },
        });

        revalidatePath(`/project/${projectId}`);
        return { success: true };
    } catch (error: any) {
        console.error('Failed to save Diagram DSL:', error);
        if (error.constructor.name === 'ZodError') {
            const issues = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
            return { success: false, error: `Validation Failed: ${issues}` };
        }
        return { success: false, error: 'Failed to save diagram' };
    }
}
