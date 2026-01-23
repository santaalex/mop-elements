import { NextRequest, NextResponse } from 'next/server';
import { mingdaoWebhookSchema } from '@/lib/validations/mingdao';
import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { eventEmitter, EVENTS } from '@/lib/events';

// 6. Push Realtime Update via SSE (using singleton Emitter)
async function pushRealtimeUpdate(projectId: string, nodeId: string, stats: any) {
    eventEmitter.emit(EVENTS.NODE_UPDATE, {
        projectId,
        nodeId,
        stats: {
            activeCount: stats.activeCount,
            avgWaitTime: stats.avgWaitTime,
            status: stats.status,
            updatedAt: new Date().toISOString()
        }
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Validation
        const validation = mingdaoWebhookSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid payload', details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { traceId, nodeKey, action, timestamp, operator, payload } = validation.data;
        const ts = new Date(timestamp);

        // 2. Find relevant project/node based on nodeKey
        // NOTE: In a real app, 'nodeKey' needs to map to a specific ProjectId + NodeId.
        // For this Prototype, we assume nodeKey is unique or we search for it.
        // Or we assume the payload includes projectId. 
        // Let's assume nodeKey implies uniqueness or we use a Project Secret.
        // For simplicity now: We need to find WHICH project this node belongs to.
        // We can query PoolSwimlaneDiagram or new tables if we indexed nodeKey.
        // But wait, the schema we built doesn't index `nodeKey` specifically on Project/Diagram yet.
        // The `NodeRealtimeStats` uses `nodeId` which corresponds to ReactFlow node id.
        // Let's assume `nodeKey` passed from Mingdao IS the ReactFlow Node ID for now.

        // However, we need projectId to create ProcessInstance. Use the projectId from the diagram?
        // We'll search for a L2 diagram that contains this node? Or assumes NodeRealtimeStats exists?
        // Let's try to find an existing NodeRealtimeStats or fallback.

        // CRITICAL Hack for MVP: We need projectId. 
        // Let's look for a project that has this node in its JSON data? That's too slow.
        // BETTER: Requiring 'projectId' in the webhook or headers.

        // Let's check headers for a project-secret or id.
        const projectId = req.headers.get('x-project-id');
        if (!projectId) {
            return NextResponse.json({ error: 'Missing x-project-id header' }, { status: 400 });
        }

        // 3. Process Logic
        // A. Upsert Instance
        const instance = await prisma.processInstance.upsert({
            where: { id: traceId },
            create: {
                id: traceId,
                projectId,
                status: 'RUNNING',
                currentNodeId: nodeKey,
                enterNodeTime: ts,
                startTime: ts,
            },
            update: {
                // Determine status based on action
                status: action === 'LEAVE' ? 'RUNNING' : (action === 'SUSPEND' ? 'SUSPENDED' : 'RUNNING'),
                currentNodeId: action === 'ENTER' ? nodeKey : undefined, // If leave, where is it? Maybe null or next
                enterNodeTime: action === 'ENTER' ? ts : undefined,
                endTime: action === 'LEAVE' && nodeKey === 'END' ? ts : undefined, // Heuristic
            }
        });

        // B. Log it
        await prisma.processLog.create({
            data: {
                instanceId: traceId,
                nodeId: nodeKey,
                action,
                timestamp: ts,
                operator,
                payload: payload ? JSON.stringify(payload) : undefined,
            }
        });

        // C. Update Realtime Stats (The Cache)
        // Recalculate active count for this node
        const activeCount = await prisma.processInstance.count({
            where: {
                projectId,
                currentNodeId: nodeKey,
                status: 'RUNNING'
            }
        });

        // Calculate average wait time (simple avg of current active ones)
        // complex logic simplified: just placeholder for now
        const avgWaitTime = 0;

        const stats = await prisma.nodeRealtimeStats.upsert({
            where: { nodeId: nodeKey },
            create: {
                nodeId: nodeKey,
                projectId,
                activeCount,
                avgWaitTime,
                status: activeCount > 10 ? 'WARNING' : 'NORMAL' // Simple rule
            },
            update: {
                activeCount,
                status: activeCount > 10 ? 'WARNING' : 'NORMAL'
            }
        });

        // 4. Push Realtime Event
        await pushRealtimeUpdate(projectId, nodeKey, stats);

        return NextResponse.json({ success: true, stats });

    } catch (error: any) {
        console.error('Webhook processing failed:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message, stack: error.stack }, { status: 500 });
    }
}
