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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, LayoutTemplate, Eye, Pencil, MousePointer2, Move, Undo2, Redo2 } from 'lucide-react';
import GroupNode from './nodes/GroupNode';
import ProcessNode from './nodes/ProcessNode';
import CustomEdge from './edges/CustomEdge';
import { saveDiagram, getDiagram } from '@/actions/diagram';
import { saveDiagramDsl } from '@/actions/diagram-dsl';
import { l1ToReactFlow, reactFlowToL1, createDefaultDsl } from '@/lib/engine/transformer';
import { useUndoRedo } from '@/hooks/useUndoRedo';

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
        draggable: false, // Locked position
        zIndex: -1,
    },
    // 2. Management Processes -> Violet
    {
        id: 'layer-management',
        type: 'group',
        position: { x: 0, y: 160 },
        data: { label: '管理类 (Management)', color: 'violet' },
        style: { width: LAYER_WIDTH, height: 240 },
        draggable: false,
        zIndex: -1,
    },
    // 3. Core Business Processes -> Indigo
    {
        id: 'layer-core',
        type: 'group',
        position: { x: 0, y: 160 + 240 },
        data: { label: '主业务 (Core Business)', color: 'indigo' },
        style: { width: LAYER_WIDTH, height: 450 },
        draggable: false,
        zIndex: -1,
    },
    // 4. Support Processes -> Slate
    {
        id: 'layer-support',
        type: 'group',
        position: { x: 0, y: 160 + 240 + 450 },
        data: { label: '支持类 (Support)', color: 'slate' },
        style: { width: LAYER_WIDTH, height: 240 },
        draggable: false,
        zIndex: -1,
    },
    // 5. Supplier (Bottom) -> Emerald
    {
        id: 'layer-supplier',
        type: 'group',
        position: { x: 0, y: 160 + 240 + 450 + 240 },
        data: { label: '供应商 (Supplier)', color: 'emerald' },
        style: { width: LAYER_WIDTH, height: 160 },
        draggable: false,
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
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { screenToFlowPosition } = useReactFlow();

    // Auto-load state
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); // Default to View Mode
    const [navMode, setNavMode] = useState<'mouse' | 'trackpad'>('mouse');

    // Smart Resize Logic for Swimlanes
    const onGroupResize = useCallback((id: string, params: { width: number, height: number, x: number, y: number }) => {
        setNodes((prevNodes) => {
            const resizingNode = prevNodes.find(n => n.id === id);
            if (!resizingNode || !resizingNode.style) return prevNodes;

            const oldHeight = parseFloat(resizingNode.style.height as any);
            // If oldHeight is missing or NaN, fallback?
            if (isNaN(oldHeight)) return prevNodes;

            const heightDiff = params.height - oldHeight;

            // Optimization: If no change, return
            if (heightDiff === 0 && params.width === parseFloat(resizingNode.style.width as any)) return prevNodes;

            return prevNodes.map(node => {
                // Determine if this is a group node (swimlane)
                if (node.type !== 'group') {
                    // If this is a process node, and it's below the resizing group, shift it down
                    // We use a small buffer (+10) to ensure we only shift nodes clearly below
                    if (node.position.y > resizingNode.position.y + 10) {
                        return {
                            ...node,
                            position: { ...node.position, y: node.position.y + heightDiff }
                        };
                    }
                    return node;
                }

                // Logic for Group Nodes (swimlanes)
                const newStyle = { ...node.style, width: params.width }; // Sync Width for ALL groups

                // If this is the resizing node, update its height
                if (node.id === id) {
                    newStyle.height = params.height;
                }

                // If this group node is physically below the resizing node, shift it down
                let newY = node.position.y;
                if (node.position.y > resizingNode.position.y + 10) {
                    newY += heightDiff;
                }

                return {
                    ...node,
                    style: newStyle,
                    position: { ...node.position, y: newY }
                };
            });
        });
    }, [setNodes]);

    // Initial Data Load
    useEffect(() => {
        if (!projectId) return;

        const load = async () => {
            const res = await getDiagram(projectId);
            if (res?.success && res.data) {
                let loadedNodes: Node[] = [];
                let loadedEdges: Edge[] = [];
                const rawData = res.data as any;

                // DETECT FORMAT: DSL vs Legacy
                // DSL has 'l1_graph' or 'version' at root. Legacy has 'nodes'.
                if ('l1_graph' in rawData || 'version' in rawData) {
                    console.log('[L1 Editor] Detected DSL format, transforming...');
                    // Use Default empty graph if l1_graph missing but wrapper exists
                    const l1Graph = rawData.l1_graph || { layers: [], nodes: [], edges: [] };
                    const { nodes: rfNodes, edges: rfEdges } = l1ToReactFlow(l1Graph);
                    loadedNodes = rfNodes as any as Node[];
                    loadedEdges = rfEdges as any as Edge[];
                } else {
                    // Legacy Format
                    console.log('[L1 Editor] Detected Legacy format');
                    loadedNodes = (rawData.nodes || initialNodesTemplate);
                    loadedEdges = (rawData.edges || []);
                }

                // Inject projectId and Handlers
                loadedNodes = loadedNodes.map((n: any) => ({
                    ...n,
                    draggable: n.type === 'group' ? false : undefined,
                    data: {
                        ...n.data,
                        projectId,
                        isEditMode, // Initial state
                        onResize: onGroupResize, // Inject Handler
                        hasDrillDown: res.populatedProcessIds?.includes(n.id) || false
                    },
                })) as Node[];

                setNodes(loadedNodes);
                setEdges(loadedEdges);
                setHasLoaded(true);
            } else {
                // Initialize directly from template
                const initialNodes = initialNodesTemplate.map(n => ({
                    ...n,
                    data: { ...n.data, projectId, isEditMode, onResize: onGroupResize, hasDrillDown: false }
                })) as Node[];

                setNodes(initialNodes);
                setEdges([]);
                setHasLoaded(true);
            }
            setHasLoaded(true);
        };
        load();
    }, [projectId, setNodes, setEdges, onGroupResize]); // removed isEditMode dep loop

    // UNDO / REDO HOOK
    const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo({
        nodes, edges, setNodes, setEdges
    });

    const onNodeDragStart = useCallback(() => takeSnapshot(), [takeSnapshot]);

    // Wrap onNodesChange/onEdgesChange to snapshot on removal
    const onNodesChangeWithUndo = useCallback((changes: any) => {
        if (!isEditMode) return;
        if (changes.some((c: any) => c.type === 'remove')) {
            takeSnapshot();
        }
        onNodesChange(changes);
    }, [onNodesChange, takeSnapshot, isEditMode]);

    const onEdgesChangeWithUndo = useCallback((changes: any) => {
        if (!isEditMode) return;
        if (changes.some((c: any) => c.type === 'remove')) {
            takeSnapshot();
        }
        onEdgesChange(changes);
    }, [onEdgesChange, takeSnapshot, isEditMode]);

    const onConnect = useCallback(
        (params: Connection) => {
            takeSnapshot();
            setEdges((eds) => addEdge(params, eds));
        },
        [setEdges, takeSnapshot],
    );

    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            takeSnapshot();
            setEdges((els) => {
                const newEdges = els.filter((e) => e.id !== oldEdge.id);
                return addEdge(newConnection, newEdges);
            });
        },
        [setEdges, takeSnapshot],
    );

    const onSave = useCallback(async () => {
        if (!projectId) return;

        setIsSaving(true);
        try {
            console.log('[L1 Editor] Saving Diagram...');

            // 1. Transform current View -> L1Graph
            const l1Graph = reactFlowToL1(nodes as any, edges as any);

            // 2. Fetch Existing Data to Preserve Resources/L2
            // We use getDiagram to get the full JSON
            const existingRes = await getDiagram(projectId);
            let fullDsl: any;

            if (existingRes?.success && existingRes.data && ('l1_graph' in existingRes.data || 'version' in existingRes.data)) {
                // Merge with existing DSL
                fullDsl = {
                    ...existingRes.data,
                    l1_graph: l1Graph,
                    meta: {
                        ...(existingRes.data.meta || {}),
                        last_updated: new Date().toISOString()
                    }
                };
            } else {
                // Initialize new DSL if none exists or legacy
                fullDsl = createDefaultDsl(projectId);
                fullDsl.l1_graph = l1Graph;
            }

            const result = await saveDiagramDsl(projectId, fullDsl);
            if (result.success) {
                setLastSaved(new Date());
            } else {
                alert(`保存失败: ${result.error}`);
            }
        } catch (err: any) {
            console.error(err);
            alert(`保存出错: ${err.message}`);
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

            const newNode: Node = {
                id: `process-${Date.now()}`,
                type,
                position,
                data: { label: '新的业务流程', projectId, isEditMode },
                zIndex: 10,
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [screenToFlowPosition, setNodes, projectId, isEditMode],
    );

    // Update nodes data when Edit Mode toggles
    useEffect(() => {
        setNodes((nds) =>
            nds.map((node) => ({
                ...node,
                data: { ...node.data, isEditMode },
            }))
        );
    }, [isEditMode, setNodes]);

    if (!hasLoaded) {
        return <div className="w-full h-full bg-slate-50 dark:bg-zinc-950 flex items-center justify-center text-slate-400">Loading diagram...</div>;
    }

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-zinc-950 relative" ref={reactFlowWrapper}>
            {/* Sidebar only in Edit Mode */}
            {isEditMode && <Sidebar />}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChangeWithUndo}
                onEdgesChange={onEdgesChangeWithUndo}
                onNodeDragStart={onNodeDragStart}
                onConnect={onConnect}
                onEdgeUpdate={onReconnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={isEditMode}
                nodesConnectable={isEditMode}
                deleteKeyCode={isEditMode ? ['Backspace', 'Delete'] : null}
                elementsSelectable={true}
                panOnDrag={navMode === 'mouse'}
                panOnScroll={navMode === 'trackpad'}
                selectionOnDrag={navMode === 'trackpad'}
                zoomOnScroll={navMode === 'mouse'}
                zoomOnPinch={true}
                zoomActivationKeyCode="Ctrl"
                elevateNodesOnSelect={false}
                // Connection settings
                connectionLineType={ConnectionLineType.SmoothStep}
                defaultEdgeOptions={{
                    type: 'custom',
                    animated: true,
                    style: { strokeWidth: 2, stroke: '#6366f1' },
                    interactionWidth: 25, // Easier to select
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

                        {/* Undo / Redo */}
                        {isEditMode && (
                            <>
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 rounded p-1">
                                    <button
                                        onClick={undo}
                                        disabled={!canUndo}
                                        className={`p-1.5 rounded transition-colors ${canUndo ? 'hover:bg-white text-indigo-600 shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                                        title="撤回 (Ctrl+Z)"
                                    >
                                        <Undo2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={redo}
                                        disabled={!canRedo}
                                        className={`p-1.5 rounded transition-colors ${canRedo ? 'hover:bg-white text-indigo-600 shadow-sm' : 'text-slate-300 cursor-not-allowed'}`}
                                        title="重做 (Ctrl+Shift+Z / Ctrl+Y)"
                                    >
                                        <Redo2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1" />
                            </>
                        )}

                        {/* Nav Mode Toggle */}
                        <div className="flex bg-slate-100 dark:bg-zinc-800 rounded p-1 gap-1">
                            <button
                                onClick={() => setNavMode('mouse')}
                                className={`p-1.5 rounded text-xs flex items-center gap-1 transition-all ${navMode === 'mouse' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-slate-400 hover:text-slate-600'}`}
                                title="鼠标模式：左键平移，滚轮缩放"
                            >
                                <MousePointer2 className="w-3.5 h-3.5" />
                                <span>鼠标</span>
                            </button>
                            <button
                                onClick={() => setNavMode('trackpad')}
                                className={`p-1.5 rounded text-xs flex items-center gap-1 transition-all ${navMode === 'trackpad' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-slate-400 hover:text-slate-600'}`}
                                title="触控板模式：双指平移，左键框选"
                            >
                                <Move className="w-3.5 h-3.5" />
                                <span>触控板</span>
                            </button>
                        </div>

                        <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1" />

                        {/* Mode Toggle */}
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded transition-all
                                ${isEditMode
                                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}
                            `}
                        >
                            {isEditMode ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {isEditMode ? '编辑模式' : '查阅模式'}
                        </button>

                        <div className="w-px h-4 bg-slate-200 dark:bg-zinc-700 mx-1"></div>

                        {lastSaved && (
                            <span className="text-xs text-slate-400">
                                {lastSaved.toLocaleTimeString()}
                            </span>
                        )}

                        {/* Save Button - Only in Edit Mode */}
                        {isEditMode && (
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
                        )}
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
