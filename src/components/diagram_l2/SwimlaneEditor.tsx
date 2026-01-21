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
import { Plus, X, Circle, MousePointer2, Layers, Database, ArrowLeft, Eye, Pencil, RefreshCw, Move, Undo2, Redo2 } from 'lucide-react';
import Link from 'next/link';

import { saveL2Diagram, getL2Diagram } from '@/actions/diagram';
import { syncDiagramData } from '@/actions/sync-diagram';
import RightSidebar from './RightSidebar';
import ProjectDataTable from './ProjectDataTable';
import { useUndoRedo } from '@/hooks/useUndoRedo';

// Import our new L2 nodes
import StartEventNode from './nodes/StartEventNode';
import EndEventNode from './nodes/EndEventNode';
import ActivityNode from './nodes/ActivityNode';
import GatewayNode from './nodes/GatewayNode';
import LaneNode from './nodes/LaneNode';
import CustomEdge from '../diagram/edges/CustomEdge';
import { ActivityMatrixModal } from './ActivityMatrixModal';
import { SubActivity } from '@/types/diagram';

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
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isTableOpen, setIsTableOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); // Default to View Mode
    const [navMode, setNavMode] = useState<'mouse' | 'trackpad'>('mouse');

    // Matrix Modal State
    const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
    const [currentMatrixNodeId, setCurrentMatrixNodeId] = useState<string | null>(null);

    const handleSaveMatrixData = (newSubActivities: SubActivity[], newRoles: any[]) => {
        if (!currentMatrixNodeId) return;
        setNodes((nds) => nds.map((node) => {
            if (node.id === currentMatrixNodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        subActivities: newSubActivities,
                        roleConfigs: newRoles
                    }
                };
            }
            return node;
        }));
    };
    const { screenToFlowPosition, getNodes } = useReactFlow();

    // UNDO / REDO HOOK
    const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo({
        nodes, edges, setNodes, setEdges
    });

    const onNodeDragStart = useCallback(() => takeSnapshot(), [takeSnapshot]);

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

    // Smart Resize Logic for L2 Lanes
    const onLaneResize = useCallback((id: string, params: { width: number; height: number; x: number; y: number }) => {
        setNodes((prevNodes) => {
            const resizingNode = prevNodes.find(n => n.id === id);
            if (!resizingNode || !resizingNode.style) return prevNodes;

            const oldHeight = parseFloat(resizingNode.style.height as any);
            if (isNaN(oldHeight)) return prevNodes;

            const heightDiff = params.height - oldHeight;

            // Optimization
            if (heightDiff === 0 && params.width === parseFloat(resizingNode.style.width as any)) return prevNodes;

            return prevNodes.map(node => {
                // If standard node (activity/gateway), shift down if below resizing lane
                if (node.type !== 'lane') {
                    if (node.position.y > resizingNode.position.y + 10) {
                        return {
                            ...node,
                            position: { ...node.position, y: node.position.y + heightDiff }
                        };
                    }
                    return node;
                }

                // If Lane
                const newStyle = { ...node.style, width: params.width };
                // Update height only for the resizing node
                if (node.id === id) {
                    newStyle.height = params.height;
                }

                // Shift down if below
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
                // Inject callbacks
                const loadedNodes = (res.data.nodes || []).map((n: any) => ({
                    ...n,
                    draggable: n.type === 'lane' ? false : undefined, // Ensure locked
                    data: {
                        ...n.data,
                        projectId,
                        isEditMode,
                        onResize: onLaneResize
                    }
                }));
                setNodes(loadedNodes);
                setEdges(res.data.edges || []);
            } else {
                if (nodes.length === 0) {
                    setNodes([
                        {
                            id: 'lane-1',
                            type: 'lane',
                            position: { x: 50, y: 50 },
                            data: { label: '默认泳道 (Role A)', projectId, isEditMode, onResize: onLaneResize },
                            style: { width: 800, height: 200 },
                            zIndex: -1,
                            draggable: false,
                        }
                    ]);
                }
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [diagramId, onLaneResize]); // Added onLaneResize dep

    const onSave = useCallback(async () => {
        if (!diagramId) return;

        setIsSaving(true);
        try {
            // Sanitize nodes to remove non-serializable functions (onResize)
            const cleanNodes = nodes.map(node => {
                const { onResize, ...data } = node.data;
                return { ...node, data };
            });

            const result = await saveL2Diagram(diagramId, cleanNodes, edges);
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

    // SYNC LOGIC
    const handleSyncDiagram = useCallback(async () => {
        setIsSyncing(true);
        const currentNodes = getNodes();
        try {
            // 1. Collect all Mingdao IDs from KPIs and SOPs
            const allIds: string[] = [];
            currentNodes.forEach(node => {
                // Legacy KPIs
                if (node.data.kpis && Array.isArray(node.data.kpis)) {
                    (node.data.kpis as any[]).forEach(kpi => {
                        if (kpi.mingdaoId) allIds.push(kpi.mingdaoId);
                    });
                }
                // Legacy SOP Steps
                if (node.data.sop_steps && Array.isArray(node.data.sop_steps)) {
                    (node.data.sop_steps as any[]).forEach(step => {
                        if (step.roles && Array.isArray(step.roles)) {
                            step.roles.forEach((role: any) => {
                                if (role.mingdaoId) allIds.push(role.mingdaoId);
                            });
                        }
                    });
                }
                // NEW: SubActivity Roles (Matrix)
                if (node.data.subActivities && Array.isArray(node.data.subActivities)) {
                    (node.data.subActivities as SubActivity[]).forEach(step => {
                        if (step.roles && Array.isArray(step.roles)) {
                            step.roles.forEach(role => {
                                // Cast to any to access potentially optional or loose mingdaoId
                                const mId = (role as any).mingdaoId;
                                if (mId) allIds.push(mId);
                            });
                        }
                    });
                }
            });

            // 2. Call Server Action (Mock for now)
            const result = await syncDiagramData(diagramId, allIds);

            // 3. Update Nodes with new data
            if (result.success && result.data) {
                setNodes(nds => nds.map(node => {
                    const newData = { ...node.data };
                    let changed = false;

                    // Update Legacy KPIs
                    if (newData.kpis && Array.isArray(newData.kpis)) {
                        newData.kpis = newData.kpis.map((kpi: any) => {
                            if (kpi.mingdaoId && result.data![kpi.mingdaoId]) {
                                changed = true;
                                return { ...kpi, actual: result.data![kpi.mingdaoId] };
                            }
                            return kpi;
                        });
                    }

                    // Update Legacy SOP Roles
                    if (newData.sop_steps && Array.isArray(newData.sop_steps)) {
                        newData.sop_steps = newData.sop_steps.map((step: any) => ({
                            ...step,
                            roles: (step.roles as any[]).map((role: any) => {
                                if (role.mingdaoId && result.data![role.mingdaoId]) {
                                    changed = true;
                                    return { ...role, actual: result.data![role.mingdaoId] };
                                }
                                return role;
                            })
                        }));
                    }

                    // NEW: Update Matrix SubActivities
                    if (newData.subActivities && Array.isArray(newData.subActivities)) {
                        // We need to map over subActivities and their roles to update 'actual'
                        const updatedSubs = (newData.subActivities as SubActivity[]).map(step => {
                            let stepChanged = false;
                            const newRoles = step.roles.map(role => {
                                const mId = (role as any).mingdaoId;
                                if (mId && result.data![mId]) {
                                    stepChanged = true;
                                    changed = true; // Global change flag
                                    return { ...role, actual: result.data![mId] };
                                }
                                return role;
                            });
                            return stepChanged ? { ...step, roles: newRoles } : step;
                        });

                        if (changed) {
                            newData.subActivities = updatedSubs;
                        }
                    }

                    return changed ? { ...node, data: newData } : node;
                }));
                setLastSynced(new Date());
            }
        } catch (error) {
            console.error("Sync failed:", error);
        } finally {
            setIsSyncing(false);
        }
    }, [diagramId, getNodes, setNodes]);

    // Auto-Sync on Mount (once nodes are loaded)
    const hasSyncedRef = useRef(false);
    useEffect(() => {
        if (nodes.length > 0 && !hasSyncedRef.current) {
            // Delay slightly to let UI settle
            const timer = setTimeout(() => {
                handleSyncDiagram();
                hasSyncedRef.current = true;
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [nodes.length, handleSyncDiagram]);

    const onConnect = useCallback(
        (params: Connection) => {
            takeSnapshot();
            setEdges((eds) => addEdge(params, eds));
        },
        [setEdges, takeSnapshot],
    );

    // RECONNECT LOGIC
    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            takeSnapshot();
            setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
        },
        [setEdges, takeSnapshot],
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
                data: {
                    label: type === 'activity' ? '新活动' : '',
                    ...extraData,
                    onResize: type === 'lane' ? onLaneResize : undefined,
                    projectId,
                    isEditMode
                },
                zIndex: type === 'lane' ? -1 : 10, // Lanes are background
                draggable: type === 'lane' ? false : undefined, // Lock lanes
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
            data: { label: '新角色 (New Role)', projectId, isEditMode, onResize: onLaneResize },
            style: { width: 800, height: 200 },
            zIndex: -1,
            draggable: false, // Lock lanes
        };
        setNodes((nds) => nds.concat(newLane));
    };

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-zinc-950 relative" ref={reactFlowWrapper}>
            {/* Show Sidebar only in Edit Mode */}
            {isEditMode && <L2Sidebar onToggleTable={() => setIsTableOpen(!isTableOpen)} />}

            {/* Back to Project Button - Always Visible */}
            <Link
                href={`/project/${projectId}`}
                className="absolute top-4 left-24 z-50 w-10 h-10 flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors group"
                title="返回上一级 (Back to Project)"
            >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            </Link>

            {/* RIGHT SIDEBAR INTEGRATION - Visible when Edit Mode OR Node Selected (Inspector Mode) */}
            {selectedNode && (
                <div className="absolute top-0 right-0 h-full z-20 flex flex-col pointer-events-none">
                    <div className="pointer-events-auto h-full shadow-xl">
                        <RightSidebar
                            selectedNodeId={selectedNode.id}
                            nodes={nodes}
                            setNodes={setNodes}
                            isReadOnly={!isEditMode}
                        />
                    </div>
                </div>
            )}

            {/* GLOBAL DATA TABLE DRAWER */}
            <ProjectDataTable
                isOpen={isTableOpen}
                onClose={() => setIsTableOpen(false)}
                nodes={nodes}
                setNodes={setNodes}
            />

            {/* ACTIVITY MATRIX MODAL */}
            {currentMatrixNodeId && (
                <ActivityMatrixModal
                    isOpen={isMatrixModalOpen}
                    onClose={() => setIsMatrixModalOpen(false)}
                    activityName={nodes.find(n => n.id === currentMatrixNodeId)?.data.label as string || 'Activity'}
                    activityId={currentMatrixNodeId}
                    subActivities={(nodes.find(n => n.id === currentMatrixNodeId)?.data.subActivities as SubActivity[]) || []}
                    roleConfigs={(nodes.find(n => n.id === currentMatrixNodeId)?.data.roleConfigs as any[]) || []}
                    onSave={handleSaveMatrixData}
                    isEditMode={isEditMode}
                />
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChangeWithUndo}
                onEdgesChange={onEdgesChangeWithUndo}
                zoomOnDoubleClick={false}
                onNodeDoubleClick={(event, node) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (node.type === 'activity') {
                        setCurrentMatrixNodeId(node.id);
                        setIsMatrixModalOpen(true);
                    }
                }}
                onNodeDragStart={onNodeDragStart}
                onConnect={onConnect}
                onReconnect={onReconnect}
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
                defaultEdgeOptions={{
                    type: 'custom',
                    animated: true,
                    style: { strokeWidth: 1.5, stroke: '#475569' },
                    interactionWidth: 25,
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
                                title="触控板模式：双指平移，左键框选 (Figma Style)"
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

                        {/* Save Button - Only visible in Edit Mode */}
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

                    <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur p-2 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                        {/* Sync Button */}
                        <button
                            onClick={handleSyncDiagram}
                            disabled={isSyncing}
                            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded transition-all
                                ${isSyncing
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'}
                            `}
                            title="同步最新数据 (Sync Data)"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? '同步中...' : '刷新数据'}
                        </button>

                        {lastSynced && (
                            <span className="text-[10px] text-slate-400">
                                更新于: {lastSynced.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                </Panel>

                {/* Add Lane Button - Only in Edit Mode */}
                {isEditMode && (
                    <Panel position="top-center">
                        <button
                            onClick={addLane}
                            className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-2 rounded-full shadow-lg border border-slate-200 dark:border-zinc-700 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-medium transition-all"
                        >
                            <Layers className="w-4 h-4" />
                            添加泳道 (Add Lane)
                        </button>
                    </Panel>
                )}
            </ReactFlow>
        </div>
    );
}

export default function SwimlaneEditor({ projectId, diagramId }: { projectId: string; diagramId: string }) {
    return (
        <ReactFlowProvider>
            <EditorContent projectId={projectId} diagramId={diagramId} />
        </ReactFlowProvider>
    );
}
