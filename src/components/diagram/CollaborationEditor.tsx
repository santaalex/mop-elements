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
    reconnectEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, LayoutTemplate } from 'lucide-react';
import GroupNode from './nodes/GroupNode';
import ProcessNode from './nodes/ProcessNode';
import CustomEdge from './edges/CustomEdge';
import { saveDiagram, getDiagram } from '@/actions/diagram';

const nodeTypes: NodeTypes = {
    group: GroupNode,
    process: ProcessNode,
};

const edgeTypes = {
    custom: CustomEdge,
};

// Standard 5-Layer Architecture
const LAYER_WIDTH = 1200;

const initialNodesTemplate = [
    // 1. Customer (Top) -> Blue
    {
        id: 'layer-customer',
        type: 'group',
        position: { x: 0, y: 0 },
        data: { label: '客户 (Customer)', color: 'blue' },
        style: { width: LAYER_WIDTH, height: 160 },
        selectable: true,
        zIndex: -1, // Push to background
    },
    // 2. Management Processes -> Violet
    {
        id: 'layer-management',
        type: 'group',
        position: { x: 0, y: 160 },
        data: { label: '管理类 (Management)', color: 'violet' },
        style: { width: LAYER_WIDTH, height: 240 },
        zIndex: -1,
    },
    // 3. Core Business Processes -> Indigo
    {
        id: 'layer-core',
        type: 'group',
        position: { x: 0, y: 160 + 240 },
        data: { label: '主业务 (Core Business)', color: 'indigo' },
        style: { width: LAYER_WIDTH, height: 450 },
        zIndex: -1,
    },
    // 4. Support Processes -> Slate
    {
        id: 'layer-support',
        type: 'group',
        position: { x: 0, y: 160 + 240 + 450 },
        data: { label: '支持类 (Support)', color: 'slate' },
        style: { width: LAYER_WIDTH, height: 240 },
        zIndex: -1,
    },
    // 5. Supplier (Bottom) -> Emerald
    {
        id: 'layer-supplier',
        type: 'group',
        position: { x: 0, y: 160 + 240 + 450 + 240 },
        data: { label: '供应商 (Supplier)', color: 'emerald' },
        style: { width: LAYER_WIDTH, height: 160 },
        zIndex: -1,
    },
];

// Sidebar Component for Dragging
const Sidebar = () => {
    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur shadow-lg rounded-xl border border-slate-200 dark:border-zinc-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">工具栏</div>

            <div
                className="flex flex-col items-center justify-center p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-grab active:cursor-grabbing border border-indigo-100 dark:border-indigo-800 transition-colors"
                draggable
                onDragStart={(event) => onDragStart(event, 'process')}
                title="拖动创建一个新流程"
            >
                <Box className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">流程节点</span>
            </div>

            {/* Visual Separator */}
            <div className="h-px w-full bg-slate-200 dark:bg-zinc-700 my-1" />

            <div className="flex flex-col items-center justify-center p-3 rounded-lg text-slate-500 hover:bg-slate-100 cursor-not-allowed opacity-50" title="暂未开放">
                <LayoutTemplate className="w-6 h-6 mb-1" />
                <span className="text-xs">泳道模板</span>
            </div>
        </div>
    );
};

// Inner Component to use ReactFlow hooks
const EditorContent = ({ projectId }: { projectId: string }) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]); // Start empty to wait for load
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { screenToFlowPosition } = useReactFlow();

    // Auto-load state
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Initial Data Load
    useEffect(() => {
        if (!projectId) return;

        const load = async () => {
            const res = await getDiagram(projectId);
            if (res.success && res.data) {
                // Restore existing diagram but inject projectId into data for interactions
                const loadedNodes = (res.data.nodes || initialNodesTemplate).map((n: any) => ({
                    ...n,
                    data: { ...n.data, projectId }
                }));
                // Ensure initial template nodes also get projectId if they were saved without it
                setNodes(loadedNodes);
                setEdges(res.data.edges || []);
            } else {
                // New diagram -> use template
                const templateNodes = initialNodesTemplate.map(n => ({
                    ...n,
                    data: { ...n.data, projectId }
                }));
                setNodes(templateNodes);
                setEdges([]);
            }
            setHasLoaded(true);
        };
        load();
    }, [projectId, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
        },
        [setEdges],
    );

    const onSave = useCallback(async () => {
        if (!projectId) return;

        setIsSaving(true);
        try {
            const result = await saveDiagram(projectId, nodes, edges);
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
    }, [projectId, nodes, edges]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: `process-${Date.now()}`,
                type,
                position,
                data: { label: '新的业务流程', projectId },
                zIndex: 10,
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [screenToFlowPosition, setNodes, projectId],
    );

    if (!hasLoaded) {
        return <div className="w-full h-full bg-slate-50 dark:bg-zinc-950 flex items-center justify-center text-slate-400">Loading diagram...</div>;
    }

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-zinc-950 relative" ref={reactFlowWrapper}>
            <Sidebar />
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
                // Connection settings
                connectionLineType={ConnectionLineType.SmoothStep}
                defaultEdgeOptions={{
                    type: 'custom',
                    animated: true,
                    style: { strokeWidth: 2, stroke: '#6366f1' },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: '#6366f1',
                    },
                }}
                snapToGrid={true}
                snapGrid={[20, 20]}
                fitView
                className="bg-slate-50 dark:bg-zinc-950"
                minZoom={0.1}
                proOptions={{ hideAttribution: true }}
            >
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

                <Controls className="!bg-white/80 dark:!bg-zinc-900/80 !border-white/20 dark:!border-zinc-800 !shadow-xl !rounded-xl" />
                <MiniMap
                    className="!bg-white/80 dark:!bg-zinc-900/80 !border-white/20 dark:!border-zinc-800 !shadow-xl !rounded-xl"
                    nodeColor={(n) => {
                        const c = n.data.color as string;
                        if (c === 'blue') return '#60a5fa';
                        if (c === 'violet') return '#a78bfa';
                        if (c === 'indigo') return '#818cf8';
                        if (c === 'emerald') return '#34d399';
                        if (n.type === 'process') return '#4f46e5';
                        return '#94a3b8';
                    }}
                />
                <Background gap={24} size={1} color="#94a3b8" className="opacity-10" />
            </ReactFlow>
        </div>
    );
};

export default function CollaborationEditor({ projectId }: { projectId: string }) {
    return (
        <ReactFlowProvider>
            <EditorContent projectId={projectId} />
        </ReactFlowProvider>
    );
}
