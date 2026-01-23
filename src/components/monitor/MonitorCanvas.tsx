'use client';

import React, { useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    NodeTypes,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Import Standard L2 Nodes (matching the Editor UI)
import StartEventNode from '../diagram_l2/nodes/StartEventNode';
import EndEventNode from '../diagram_l2/nodes/EndEventNode';
import ActivityNode from '../diagram_l2/nodes/ActivityNode';
import GatewayNode from '../diagram_l2/nodes/GatewayNode';
import LaneNode from '../diagram_l2/nodes/LaneNode';
import CustomEdge from '../diagram/edges/CustomEdge'; // Ensure this exists or use default

interface MonitorCanvasProps {
    projectId: string;
    initialNodes: Node[];
    initialEdges: Edge[];
}

const edgeTypes = {
    custom: CustomEdge,
};

export function MonitorCanvas({ projectId, initialNodes, initialEdges }: MonitorCanvasProps) {

    // Use the exact same node types as SwimlaneEditor
    const nodeTypes: NodeTypes = useMemo(() => ({
        startEvent: StartEventNode,
        endEvent: EndEventNode,
        activity: ActivityNode,
        gateway: GatewayNode,
        lane: LaneNode,
        // Fallbacks for legacy/monitor types if any data mismatches occur
        process: ActivityNode,
        start: StartEventNode,
        end: EndEventNode,
        decision: GatewayNode,
    }), []);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Initial Node Setup: Inject isMonitor flag
    React.useEffect(() => {
        const montiorNodes = initialNodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                isMonitor: true, // Helper flag for UI
                activeCount: node.data.activeCount ?? 0,  // Preserve logic
                avgWaitTime: node.data.avgWaitTime
            },
            draggable: false,
            connectable: false
        }));
        setNodes(montiorNodes);
    }, [initialNodes, setNodes]);

    // Real-time SSE Connection
    React.useEffect(() => {
        if (!projectId) return;

        console.log(`[Monitor] Connecting to SSE stream for project ${projectId}...`);
        const eventSource = new EventSource(`/api/sse/project/${projectId}`);

        eventSource.onopen = () => {
            console.log('[Monitor] SSE Connection established');
        };

        eventSource.addEventListener('node-update', (event) => {
            try {
                console.log('[Monitor] Raw SSE event received:', event.data);
                const data = JSON.parse(event.data);
                console.log('[Monitor] Parsed data:', data);

                setNodes((nds) => {
                    const match = nds.find(n => n.id === data.nodeId);
                    if (match) {
                        console.log('[Monitor] Found matching node, updating:', match.id);
                        return nds.map((node) => {
                            if (node.id === data.nodeId) {
                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        activeCount: data.stats.activeCount,
                                        avgWaitTime: data.stats.avgWaitTime,
                                        status: data.stats.status
                                    }
                                };
                            }
                            return node;
                        });
                    } else {
                        console.warn('[Monitor] No matching node found for ID:', data.nodeId);
                        console.log('[Monitor] Available IDs:', nds.map(n => n.id));
                        return nds;
                    }
                });
            } catch (err) {
                console.error('[Monitor] Error parsing update:', err);
            }
        });

        eventSource.onerror = (err) => {
            console.error('[Monitor] SSE Error:', err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [projectId, setNodes]);

    const simulateTraffic = async () => {
        // Find first activity node
        const activityNode = nodes.find(n => n.type === 'activity');
        if (!activityNode) {
            alert('No activity nodes found to test!');
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
                    nodeKey: activityNode.id,
                    action: 'ENTER',
                    timestamp: new Date().toISOString(),
                    operator: 'Simulation Bot',
                    payload: { message: 'Hello from verification button' }
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
    };

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-zinc-950 relative">
            <ReactFlowProvider>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={true}
                    proOptions={{ hideAttribution: true }}
                    minZoom={0.2}
                    defaultEdgeOptions={{
                        type: 'custom',
                        animated: true,
                        style: { strokeWidth: 1.5, stroke: '#94a3b8' }, // Slate-400
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                    }}
                >
                    <Background gap={20} size={1} color="#cbd5e1" />
                    <Controls />
                </ReactFlow>
            </ReactFlowProvider>

            {/* Simulation Button (Top Right) - Restored for verification */}
            <div className="absolute top-20 right-4 z-50">
                <button
                    onClick={simulateTraffic}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    Simulate Traffic
                </button>
            </div>
        </div>
    );
}
