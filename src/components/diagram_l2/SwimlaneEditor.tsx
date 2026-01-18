'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    NodeTypes,
    Panel,
    ReactFlowProvider,
    useReactFlow,
    ConnectionLineType,
    MarkerType,
    Node,
    reconnectEdge,
    useOnSelectionChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, X, Circle, MousePointer2, Layers, Database } from 'lucide-react';

import { saveL2Diagram, getL2Diagram } from '@/actions/diagram';
import RightSidebar from './RightSidebar';
import ProjectDataTable from './ProjectDataTable';

// Import our new L2 nodes
import StartEventNode from './nodes/StartEventNode';
import EndEventNode from './nodes/EndEventNode';
import ActivityNode from './nodes/ActivityNode';
import GatewayNode from './nodes/GatewayNode';
import LaneNode from './nodes/LaneNode';
import CustomEdge from '../diagram/edges/CustomEdge';

const nodeTypes: NodeTypes = {
    startEvent: StartEventNode,
    endEvent: EndEventNode,
    activity: ActivityNode,
    gateway: GatewayNode,
    lane: LaneNode,
};

const edgeTypes = {
    custom: CustomEdge,
};

// --- Sidebar for Dragging ---
const L2Sidebar = ({ onToggleTable }: { onToggleTable: () => void }) => {
    const onDragStart = (event: React.DragEvent, nodeType: string, extraData?: any) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        if (extraData) {
            event.dataTransfer.setData('application/reactflow-data', JSON.stringify(extraData));
        }
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-4 p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-xl rounded-xl border border-slate-200 dark:border-zinc-800 w-16 items-center">

            <div className="text-[10px] font-bold text-slate-400 uppercase text-center -mb-2">Events</div>

            {/* Start Event */}
            <div
                className="w-10 h-10 rounded-full border-2 border-slate-600 flex items-center justify-center cursor-grab hover:scale-110 transition-transform bg-white"
                draggable
                onDragStart={(e) => onDragStart(e, 'startEvent')}
                title="开始 (Start)"
            >
                <div className="w-8 h-8 rounded-full border border-slate-300" />
            </div>

            {/* End Event */}
            <div
                className="w-10 h-10 rounded-full border-[3px] border-slate-800 flex items-center justify-center cursor-grab hover:scale-110 transition-transform bg-white"
                draggable
                onDragStart={(e) => onDragStart(e, 'endEvent')}
                title="结束 (End)"
            >
                <div className="w-full h-full rounded-full bg-slate-800 opacity-10" />
            </div>

            <div className="h-px w-8 bg-slate-200" />
            <div className="text-[10px] font-bold text-slate-400 uppercase text-center -mb-2">Tasks</div>

            {/* Task */}
            <div
                className="w-10 h-8 rounded border border-slate-600 bg-white flex items-center justify-center text-[8px] cursor-grab hover:scale-110 transition-transform shadow-sm"
                draggable
                onDragStart={(e) => onDragStart(e, 'activity')}
                title="活动 (Activity)"
            >
                Activity
            </div>

            <div className="h-px w-8 bg-slate-200" />
            <div className="text-[10px] font-bold text-slate-400 uppercase text-center -mb-2">Gateways</div>

            {/* XOR Gateway */}
            <div
                className="w-8 h-8 border border-slate-600 bg-white rotate-45 flex items-center justify-center hover:scale-110 transition-transform cursor-grab mb-2"
                draggable
                onDragStart={(e) => onDragStart(e, 'gateway', { gatewayType: 'XOR' })}
                title="互斥网关 (XOR)"
            >
                <X className="w-5 h-5 -rotate-45 text-slate-600" />
            </div>

            {/* AND Gateway */}
            <div
                className="w-8 h-8 border border-slate-600 bg-white rotate-45 flex items-center justify-center hover:scale-110 transition-transform cursor-grab mb-2"
                draggable
                onDragStart={(e) => onDragStart(e, 'gateway', { gatewayType: 'AND' })}
                title="并行网关 (AND)"
            >
                <Plus className="w-5 h-5 -rotate-45 text-slate-600" />
            </div>

            {/* OR Gateway */}
            <div
                className="w-8 h-8 border border-slate-600 bg-white rotate-45 flex items-center justify-center hover:scale-110 transition-transform cursor-grab"
                draggable
                onDragStart={(e) => onDragStart(e, 'gateway', { gatewayType: 'OR' })}
                title="相容网关 (OR)"
            >
                <Circle className="w-4 h-4 -rotate-45 text-slate-600" />
            </div>

            <div className="w-8 h-[1px] bg-slate-200 dark:bg-zinc-700 my-1"></div>

            {/* Global Data Table Toggle */}
            <div className="relative group">
                <div
                    className="w-10 h-10 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all border border-indigo-200 dark:border-indigo-800"
                    onClick={onToggleTable}
                    title="全局数据表 (Global Data)"
                >
                    <Database size={20} />
                </div>
            </div>
        </div>
    );
}

const EditorContent = ({ projectId, diagramId }: { projectId: string, diagramId: string }) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { screenToFlowPosition } = useReactFlow();

    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isTableOpen, setIsTableOpen] = useState(false);

    // SELECTION HOOK
    useOnSelectionChange({
        onChange: ({ nodes }) => {
            const node = nodes[0];
            setSelectedNode(node || null);
        },
    });

    // Load Data
    useEffect(() => {
        const load = async () => {
            if (!diagramId) return;
            const res = await getL2Diagram(diagramId);
            if (res.success && res.data) {
                setNodes(res.data.nodes || []);
                setEdges(res.data.edges || []);
            } else {
                if (nodes.length === 0) {
                    setNodes([
                        {
                            id: 'lane-1',
                            type: 'lane',
                            position: { x: 50, y: 50 },
                            data: { label: '默认泳道 (Role A)' },
                            style: { width: 800, height: 200 },
                            zIndex: -1,
                        }
                    ]);
                }
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [diagramId]); // Only run on mount or ID change. Do NOT include nodes/edges or it loops/overwrites!

    const onSave = useCallback(async () => {
        if (!diagramId) return;

        setIsSaving(true);
        try {
            const result = await saveL2Diagram(diagramId, nodes, edges);
            if (result.success) {
                setLastSaved(new Date());
            } else {
                alert('保存失败，请重试');
            }
        } catch (err) {
            console.error(err);
            alert('保存出错');
        } finally {
            setIsSaving(false);
        }
    }, [diagramId, nodes, edges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    // RECONNECT LOGIC
    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
        },
        [setEdges],
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            const dataStr = event.dataTransfer.getData('application/reactflow-data');

            if (typeof type === 'undefined' || !type) return;

            const extraData = dataStr ? JSON.parse(dataStr) : {};

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: { label: type === 'activity' ? '新活动' : '', ...extraData },
                zIndex: type === 'lane' ? -1 : 10, // Lanes are background
            };

            if (type === 'lane') {
                newNode.style = { width: 800, height: 200 };
            }

            setNodes((nds) => nds.concat(newNode));
        },
        [screenToFlowPosition, setNodes],
    );

    const addLane = () => {
        const lastLane = nodes.filter(n => n.type === 'lane').pop();
        const yPos = lastLane ? lastLane.position.y + (lastLane.measured?.height || 200) : 50;

        const newLane: Node = {
            id: `lane-${Date.now()}`,
            type: 'lane',
            position: { x: 50, y: yPos },
            data: { label: '新角色 (New Role)' },
            style: { width: 800, height: 200 },
            zIndex: -1,
        };
        setNodes((nds) => nds.concat(newLane));
    };

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-zinc-950 relative" ref={reactFlowWrapper}>
            <L2Sidebar onToggleTable={() => setIsTableOpen(!isTableOpen)} />

            {/* RIGHT SIDEBAR INTEGRATION */}
            <RightSidebar selectedNodeId={selectedNode?.id || null} nodes={nodes} setNodes={setNodes} />

            {/* GLOBAL DATA TABLE DRAWER */}
            <ProjectDataTable
                isOpen={isTableOpen}
                onClose={() => setIsTableOpen(false)}
                nodes={nodes}
                setNodes={setNodes}
            />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onReconnect={onReconnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={{
                    type: 'custom',
                    animated: true,
                    style: { strokeWidth: 1.5, stroke: '#475569' },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
                }}
                snapToGrid={true}
                snapGrid={[20, 20]}
                fitView
            >
                <Background gap={20} size={1} />
                <Controls />
                <MiniMap />

                <Panel position="top-right" className="flex gap-2">
                    <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur p-2 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                        {lastSaved && (
                            <span className="text-xs text-slate-400">
                                已保存 {lastSaved.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className={`
                                px-3 py-1.5 text-xs font-semibold text-white rounded transition-all
                                ${isSaving
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow active:scale-95'}
                            `}
                        >
                            {isSaving ? '保存中...' : '保存画布'}
                        </button>
                    </div>
                </Panel>

                <Panel position="top-center">
                    <button
                        onClick={addLane}
                        className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-2 rounded-full shadow-lg border border-slate-200 dark:border-zinc-700 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-medium transition-all"
                    >
                        <Layers className="w-4 h-4" />
                        添加泳道 (Add Lane)
                    </button>
                </Panel>
            </ReactFlow>
        </div>
    );
};

export default function SwimlaneEditor({ projectId, diagramId }: { projectId: string; diagramId: string }) {
    return (
        <ReactFlowProvider>
            <EditorContent projectId={projectId} diagramId={diagramId} />
        </ReactFlowProvider>
    );
}
