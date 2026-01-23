import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNodesState, useEdgesState, Node, Edge } from 'reactflow';
import { MopDsl } from '../schema/dsl';
import { dslToReactFlow } from './transformer';

interface RuntimeState {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: any;
    onEdgesChange: any;
    isConnected: boolean;
    simulateTraffic: () => Promise<void>;
}

export function useMoPRuntime(dsl: MopDsl): RuntimeState {
    // Initialize state with transformed DSL
    const initialData = useMemo(() => {
        // Flatten all L2 graphs for now, or pick the first one?
        // In a real app, we might need a selector. For now, let's assume one active L2 graph or merge them.
        // Seeing existing logic, we likely want to render ONE L2 graph.
        // Let's pick the first available L2 graph key.
        const l2Keys = Object.keys(dsl.l2_graphs);
        if (l2Keys.length > 0) {
            return dslToReactFlow(dsl.l2_graphs[l2Keys[0]], dsl.resources);
        }
        return { nodes: [], edges: [] };
    }, [dsl]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);
    const [isConnected, setIsConnected] = useState(false);

    const projectId = dsl.meta.project_id;

    // Real-time SSE Connection
    useEffect(() => {
        if (!projectId) return;

        console.log(`[MoP Runtime] Connecting to SSE stream for project ${projectId}...`);
        const eventSource = new EventSource(`/api/sse/project/${projectId}`);

        eventSource.onopen = () => {
            console.log('[MoP Runtime] SSE Connection established');
            setIsConnected(true);
        };

        eventSource.addEventListener('node-update', (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                // console.log('[MoP Runtime] Update received:', data);

                setNodes((nds) => {
                    const match = nds.find(n => n.id === data.nodeId);
                    if (match) {
                        return nds.map((node) => {
                            if (node.id === data.nodeId) {
                                // Merge runtime stats into data
                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        // We map the incoming specialized stats to generic data props used by nodes
                                        activeCount: data.stats.activeCount,
                                        avgWaitTime: data.stats.avgWaitTime,
                                        status: data.stats.status,
                                        // Also store full stats object for debug/advanced use
                                        runtimeStats: data.stats
                                    }
                                };
                            }
                            return node;
                        });
                    }
                    return nds;
                });
            } catch (err) {
                console.error('[MoP Runtime] Error parsing update:', err);
            }
        });

        eventSource.onerror = (err) => {
            console.error('[MoP Runtime] SSE Error:', err);
            eventSource.close();
            setIsConnected(false);
        };

        return () => {
            eventSource.close();
            setIsConnected(false);
        };
    }, [projectId, setNodes]);

    // Simulation Logic (Ported from MonitorCanvas)
    const simulateTraffic = useCallback(async () => {
        // Find first activity node to trigger
        const activityNode = nodes.find(n => n.type === 'activity');
        if (!activityNode) {
            console.warn('No activity nodes found to simulate traffic on.');
            return;
        }

        try {
            const res = await fetch('/api/webhooks/mingdao/ingest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-project-id': projectId,
                },
                body: JSON.stringify({
                    traceId: `sim-${Date.now()}`,
                    nodeKey: activityNode.id, // Using internal ID as key for simplicity in simulation
                    action: 'ENTER',
                    timestamp: new Date().toISOString(),
                    operator: 'MoP Simulator',
                    payload: { message: 'Simulated Event via Runtime Engine' }
                }),
            });

            if (res.ok) {
                console.log('Simulation trigger sent!');
            } else {
                console.error('Simulation failed', await res.text());
            }
        } catch (e) {
            console.error('Simulation error', e);
        }
    }, [nodes, projectId]);

    return {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        isConnected,
        simulateTraffic
    };
}
