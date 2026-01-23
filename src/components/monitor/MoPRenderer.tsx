'use client';

import React, { useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    ReactFlowProvider,
    NodeTypes,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { MopDsl } from '@/lib/schema/dsl';
import { useMoPRuntime } from '@/lib/engine/runtime';

// Import Node Types
import StartEventNode from '../diagram_l2/nodes/StartEventNode';
import EndEventNode from '../diagram_l2/nodes/EndEventNode';
import ActivityNode from '../diagram_l2/nodes/ActivityNode';
import GatewayNode from '../diagram_l2/nodes/GatewayNode';
import LaneNode from '../diagram_l2/nodes/LaneNode';
import CustomEdge from '../diagram/edges/CustomEdge';

interface MoPRendererProps {
    dsl: MopDsl;
}

const edgeTypes = {
    custom: CustomEdge,
};

function RendererContent({ dsl }: MoPRendererProps) {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        isConnected,
        simulateTraffic
    } = useMoPRuntime(dsl);

    const nodeTypes: NodeTypes = useMemo(() => ({
        startEvent: StartEventNode,
        endEvent: EndEventNode,
        activity: ActivityNode,
        gateway: GatewayNode,
        lane: LaneNode,
        // Fallbacks
        start: StartEventNode,
        end: EndEventNode,
    }), []);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-zinc-950 relative">
            {/* Status Indicator */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-medium border border-slate-200 dark:border-zinc-800">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {isConnected ? 'LIVE' : 'Connecting...'}
            </div>

            {/* Simulation Control (Hidden in Prod, visible for verification) */}
            <div className="absolute top-16 right-4 z-50">
                <button
                    onClick={simulateTraffic}
                    className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-2 border border-indigo-200 dark:border-indigo-800/50"
                    title="Simulate a traffic event for testing"
                >
                    Test Signal
                </button>
            </div>

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
                minZoom={0.1}
                defaultEdgeOptions={{
                    type: 'custom',
                    animated: true,
                    style: { strokeWidth: 1.5, stroke: '#94a3b8' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                }}
            >
                <Background gap={20} size={1} color="#cbd5e1" />
                <Controls />
            </ReactFlow>
        </div>
    );
}

export function MoPRenderer(props: MoPRendererProps) {
    return (
        <ReactFlowProvider>
            <RendererContent {...props} />
        </ReactFlowProvider>
    );
}
