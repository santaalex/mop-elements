import { NextRequest } from 'next/server';
import { eventEmitter, EVENTS } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const projectId = params.id;

    // Create a TransformStream for the SSE response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Sends an SSE message
    const sendMessage = async (event: string, data: any) => {
        try {
            await writer.write(
                encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
        } catch (error) {
            console.error('Error writing to SSE stream:', error);
        }
    };

    // Event listener for node updates
    const onNodeUpdate = (data: any) => {
        // Only send updates relevant to this project
        if (data.projectId === projectId) {
            sendMessage('node-update', data);
        }
    };

    // Subscribe to events
    eventEmitter.on(EVENTS.NODE_UPDATE, onNodeUpdate);

    // Initial connection message
    await sendMessage('connected', { success: true, projectId });

    // Handle connection closure
    req.signal.addEventListener('abort', () => {
        eventEmitter.off(EVENTS.NODE_UPDATE, onNodeUpdate);
        writer.close().catch(() => { });
    });

    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
