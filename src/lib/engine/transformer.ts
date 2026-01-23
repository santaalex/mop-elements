// Decoupled types to avoid importing 'reactflow' in shared logic
export interface RFNode<T = any> {
    id: string;
    type?: string;
    data: T;
    position: { x: number; y: number };
    style?: React.CSSProperties;
    className?: string;
    sourcePosition?: string;
    targetPosition?: string;
    hidden?: boolean;
    selected?: boolean;
    draggable?: boolean;
    selectable?: boolean;
    connectable?: boolean;
    dragHandle?: string;
    width?: number | null;
    height?: number | null;
    parentId?: string;
    zIndex?: number;
    extent?: 'parent' | undefined;
    expandParent?: boolean;
    ariaLabel?: string;
    origin?: [number, number];
}

export interface RFEdge<T = any> {
    id: string;
    type?: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    data?: T;
    style?: React.CSSProperties;
    animated?: boolean;
    hidden?: boolean;
    deletable?: boolean;
    className?: string;
    selected?: boolean;
    markerStart?: any;
    markerEnd?: any;
    zIndex?: number;
    ariaLabel?: string;
    interactionWidth?: number;
    label?: string | any; // ReactFlow edges can have labels
}

import {
    MopDsl,
    L1Graph,
    L2Graph,
    L2Node,
    L2Edge,
    Lane,
    RuntimeBinding
} from '@/lib/schema/dsl';
// removed uuid import

// Helper to generate a default DSL structure if starting from scratch
export const createDefaultDsl = (projectId: string): MopDsl => ({
    version: '1.0.0',
    meta: {
        project_id: projectId,
        name: 'New Project',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    resources: {
        roles: [],
        kpi_definitions: [],
        data_sources: []
    },
    l2_graphs: {}
});

/**
 * Transform DSL L2 Graph to ReactFlow Nodes & Edges
 */
export function dslToReactFlow(
    l2Graph: L2Graph,
    resources: MopDsl['resources']
): { nodes: RFNode[], edges: RFEdge[] } {
    const nodes: RFNode[] = [];
    const edges: RFEdge[] = [];

    // 1. Lanes -> Nodes
    if (l2Graph.lanes) {
        l2Graph.lanes.forEach(lane => {
            nodes.push({
                id: lane.id,
                type: 'lane',
                data: {
                    label: lane.name || 'New Lane',
                    roleId: lane.role_ref
                },
                position: { x: 0, y: lane.layout.y },
                style: {
                    width: (lane.layout as any).w || 800, // Default to 800 if not set, allow casting if schema lags
                    height: lane.layout.h,
                    zIndex: -1
                },
                zIndex: -1,
                selectable: true, // Allow selection for RightSidebar editing
                draggable: false, // Keep locked
                connectable: false
            });
        });
    }

    // 2. Nodes
    if (l2Graph.nodes) {
        l2Graph.nodes.forEach(node => {
            let type: string = node.type;
            if (type === 'start') type = 'startEvent';
            if (type === 'end') type = 'endEvent';

            const data: any = {
                label: node.name,
                laneId: node.lane_id, // Store lane_id for easy saving later
            };

            // Inject Runtime Binding
            if (node.runtime_binding) {
                data.source_ref = node.runtime_binding.source_ref;
                data.external_id = node.runtime_binding.external_id;

                // Transform metrics (DSL) to kpis (ReactFlow)
                // DSL: definition_id -> RF: definitionId
                if (node.runtime_binding.metrics && Array.isArray(node.runtime_binding.metrics)) {
                    data.kpis = node.runtime_binding.metrics.map((m: any) => {
                        // Legacy string support just in case
                        if (typeof m === 'string') return { id: m, definitionId: m };
                        return {
                            id: m.id,
                            definitionId: m.definition_id,
                            name: '', // Will be hydrated from Store in UI
                            target: m.target,
                            unit: m.unit,
                            warning: m.thresholds?.warning,
                            critical: m.thresholds?.critical
                        };
                    });
                }
            }

            nodes.push({
                id: node.id,
                type: type,
                data: data,
                position: { x: node.layout.x, y: node.layout.y },
                width: node.layout.w,
                height: node.layout.h,
                zIndex: node.layout.zIndex || 10
            });
        });
    }

    // 3. Edges
    if (l2Graph.edges) {
        l2Graph.edges.forEach(edge => {
            edges.push({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle || null,
                targetHandle: edge.targetHandle || null,
                label: edge.label,
                type: edge.type || 'smoothstep',
                animated: edge.type === 'smart', // Example logic
                data: {}
            });
        });
    }

    return { nodes, edges };
}

/**
 * Transform ReactFlow Nodes & Edges back to DSL L2 Graph
 * Note: This requires existing DSL to preserve metadata (like project_id, unmapped props)
 */
export function reactFlowToDsl(
    nodes: RFNode[],
    edges: RFEdge[],
    // We strictly require parent node ID or meta context in real app, 
    // but for pure transformation we generate a partial graph
    currentMeta?: L2Graph['meta']
): L2Graph {
    const lanes: Lane[] = [];
    const dslNodes: L2Node[] = [];
    const dslEdges: L2Edge[] = [];

    // 1. Extract Lanes
    nodes.filter(n => n.type === 'lane').forEach(n => {
        lanes.push({
            id: n.id,
            role_ref: n.data.roleId, // Assuming we stored this in data
            name: n.data.label,
            layout: {
                y: n.position.y,
                h: Number(n.style?.height) || 200, // fallback
            }
        });
    });

    // 2. Extract Nodes
    nodes.filter(n => n.type !== 'lane').forEach(n => {
        let type: any = n.type;
        // Reverse Mapping
        if (type === 'startEvent') type = 'start';
        if (type === 'endEvent') type = 'end';

        // Attempt to reconstruct binding
        let binding: RuntimeBinding | undefined = undefined;

        // Transform kpis (ReactFlow) to metrics (DSL)
        let metrics: any[] = [];
        if (n.data.kpis && Array.isArray(n.data.kpis)) {
            metrics = n.data.kpis.map((k: any) => ({
                id: k.id,
                definition_id: k.definitionId || '',
                target: k.target,
                unit: k.unit,
                thresholds: {
                    warning: k.warning ? Number(k.warning) : undefined,
                    critical: k.critical ? Number(k.critical) : undefined
                }
            }));
        }

        if (n.data.source_ref || n.data.external_id || metrics.length > 0) {
            binding = {
                source_ref: n.data.source_ref,
                external_id: n.data.external_id,
                metrics: metrics
            };
        }

        // Determine Lane ID (simple geometric hit test or stored data)
        // For now, we trust the user or a separate "fix layout" pass to assign lane_id.
        // Ideally, ReactFlow nodes should know their lane, or we calculate it here.
        // Let's rely on simple Y check against lanes for "lane_id" inference if not present.
        let laneId = n.data.laneId;
        if (!laneId) {
            const centerY = n.position.y + (n.height || 0) / 2;
            const foundLane = lanes.find(l => {
                const laneY = l.layout.y;
                const laneH = l.layout.h;
                return centerY >= laneY && centerY < laneY + laneH;
            });
            if (foundLane) laneId = foundLane.id;
        }

        dslNodes.push({
            id: n.id,
            type: type,
            name: n.data.label || '',
            lane_id: laneId,
            layout: {
                x: n.position.x,
                y: n.position.y,
                w: n.width || undefined,
                h: n.height || undefined,
                zIndex: n.zIndex
            },
            runtime_binding: binding
        });
    });

    // 3. Extract Edges
    edges.forEach(e => {
        dslEdges.push({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || null,
            targetHandle: e.targetHandle || null,
            label: (e.label as string) || undefined,
            type: e.type // Keep custom type if needed
        });
    });

    return {
        meta: currentMeta,
        lanes,
        nodes: dslNodes,
        edges: dslEdges
    };
}



// --- L1 TRANSFORMER LOGIC ---

const L1_LAYERS_CONFIG = [
    { id: 'layer-customer', name: '客户 (Customer)', color: 'blue', order: 0 },
    { id: 'layer-management', name: '管理类 (Management)', color: 'violet', order: 1 },
    { id: 'layer-core', name: '主业务 (Core Business)', color: 'indigo', order: 2 },
    { id: 'layer-support', name: '支持类 (Support)', color: 'slate', order: 3 },
    { id: 'layer-supplier', name: '供应商 (Supplier)', color: 'emerald', order: 4 },
];

const LAYER_HEIGHTS = [160, 240, 450, 240, 160];
const LAYER_WIDTH = 1200;

export function l1ToReactFlow(l1Graph: L1Graph): { nodes: RFNode[], edges: RFEdge[] } {
    const nodes: RFNode[] = [];
    const edges: RFEdge[] = [];
    let currentY = 0;

    // 1. Generate Layers (Static 5-Layer Structure)
    // We ignore stored layers for now and enforce the 5-layer standard, 
    // but in future we could read from l1Graph.layers
    L1_LAYERS_CONFIG.forEach((config, index) => {
        const height = LAYER_HEIGHTS[index];
        nodes.push({
            id: config.id,
            type: 'group',
            position: { x: 0, y: currentY },
            data: { label: config.name, color: config.color },
            style: { width: LAYER_WIDTH, height },
            selectable: true,
            draggable: false,
            zIndex: -1,
        });
        currentY += height;
    });

    // 2. Process Nodes
    if (l1Graph.nodes) {
        l1Graph.nodes.forEach(node => {
            let type = 'process'; // Default
            if (node.type === 'group_node') type = 'group'; // Should not happen for L1 process nodes usually

            nodes.push({
                id: node.id,
                type, // 'process' maps to ProcessNode
                position: {
                    x: node.layout.x,
                    y: node.layout.y
                },
                data: {
                    label: node.name,
                    // Persist the actual ref so we can save it back
                    drillDownRef: node.drill_down_ref,
                    hasDrillDown: !!node.drill_down_ref
                },
                width: node.layout.w,
                height: node.layout.h,
                zIndex: node.layout.zIndex || 10,
            });
        });
    }

    // 3. Process Edges
    if (l1Graph.edges) {
        l1Graph.edges.forEach(edge => {
            edges.push({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle || null,
                targetHandle: edge.targetHandle || null,
                label: edge.label,
                type: 'custom', // Force custom edge type as per Editor
                markerEnd: { type: 'arrowclosed' as any, color: '#475569' },
                style: { strokeWidth: 1.5, stroke: '#475569' },
                animated: true,
            });
        });
    }

    return { nodes, edges };
}

export function reactFlowToL1(nodes: RFNode[], edges: RFEdge[]): L1Graph {
    const dslNodes: any[] = [];
    const dslEdges: any[] = [];

    // 1. Extract Processes
    nodes.filter(n => n.type === 'process').forEach(n => {
        // Determine Layer
        const y = n.position.y;
        let layerId = 'layer-core'; // Default
        let cumulativeH = 0;

        for (let i = 0; i < L1_LAYERS_CONFIG.length; i++) {
            const h = LAYER_HEIGHTS[i];
            if (y >= cumulativeH && y < cumulativeH + h) {
                layerId = L1_LAYERS_CONFIG[i].id;
                break;
            }
            cumulativeH += h;
        }

        dslNodes.push({
            id: n.id,
            type: 'process_node',
            layer_id: layerId,
            name: n.data.label,
            drill_down_ref: n.data.drillDownRef, // Restore from data
            layout: {
                x: n.position.x,
                y: n.position.y,
                w: n.width,
                h: n.height,
                zIndex: n.zIndex
            }
        });
    });

    // 2. Extract Edges
    edges.forEach(e => {
        dslEdges.push({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || null,
            targetHandle: e.targetHandle || null,
            label: (e.label as string) || undefined,
            type: e.type
        });
    });

    // 3. Construct Layers (Fixed)
    const layers = L1_LAYERS_CONFIG.map(c => ({
        id: c.id,
        name: c.name,
        order: c.order
    }));

    return {
        layers,
        nodes: dslNodes,
        edges: dslEdges
    };
}
