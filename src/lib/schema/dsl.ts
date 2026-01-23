import { z } from 'zod';

// --- Resources (Shared Definitions) ---

export const roleSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
});

export const kpiDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    unit: z.string(),
    thresholds: z.object({
        warning: z.number().optional(),
        critical: z.number().optional(),
    }).optional(),
});

export const dataSourceSchema = z.object({
    id: z.string(),
    type: z.enum(['webhook', 'api_poll', 'websocket']),
    endpoint: z.string(),
    config: z.record(z.any()).optional(),
});

export const resourcesSchema = z.object({
    roles: z.array(roleSchema).default([]),
    kpi_definitions: z.array(kpiDefinitionSchema).default([]),
    data_sources: z.array(dataSourceSchema).default([]),
});

// --- Layout & Common ---

export const layoutSchema = z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    w: z.number().optional(),
    h: z.number().optional(),
    zIndex: z.number().optional(),
});

// --- L1 Graph (Macro) ---

export const l1LayerSchema = z.object({
    id: z.string(),
    name: z.string(),
    order: z.number(),
});

export const l1NodeSchema = z.object({
    id: z.string(),
    type: z.enum(['process_node', 'group_node']), // Expand types as needed
    layer_id: z.string(),
    name: z.string(),
    drill_down_ref: z.string().optional(), // Points to L2 ID
    layout: layoutSchema,
});

export const l1EdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional().nullable(),
    targetHandle: z.string().optional().nullable(),
    label: z.string().optional(),
    type: z.string().optional(),
});

export const l1GraphSchema = z.object({
    layers: z.array(l1LayerSchema).default([]),
    nodes: z.array(l1NodeSchema).default([]),
    edges: z.array(l1EdgeSchema).default([]),
});

// --- L2 Graph (Micro) ---

export const laneSchema = z.object({
    id: z.string(),
    role_ref: z.string().optional(), // References resources.roles.id
    name: z.string().optional(),
    layout: z.object({
        y: z.number(),
        h: z.number(),
    }),
});

export const metricInstanceSchema = z.object({
    id: z.string(),
    definition_id: z.string(),
    target: z.string().optional(),
    unit: z.string().optional(),
    thresholds: z.object({
        warning: z.number().optional(),
        critical: z.number().optional(),
    }).optional(),
});

export const runtimeBindingSchema = z.object({
    source_ref: z.string().optional(), // References resources.data_sources.id, made optional for partial binding
    external_id: z.string().optional(), // Unique Key in External System
    metrics: z.array(metricInstanceSchema).default([]),
});

export const l2NodeSchema = z.object({
    id: z.string(),
    type: z.enum(['activity', 'start', 'end', 'gateway', 'event']), // Expand as needed
    lane_id: z.string().optional(),
    name: z.string(),
    layout: layoutSchema,
    runtime_binding: runtimeBindingSchema.optional(),
});

export const l2EdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional().nullable(),
    targetHandle: z.string().optional().nullable(),
    label: z.string().optional(),
    type: z.string().optional(),
});

export const l2GraphSchema = z.object({
    meta: z.object({
        parent_node_id: z.string().optional(), // Links back to L1 node
    }).optional(),
    lanes: z.array(laneSchema).default([]),
    nodes: z.array(l2NodeSchema).default([]),
    edges: z.array(l2EdgeSchema).default([]),
});

// --- Root DSL ---

export const mopDslSchema = z.object({
    version: z.string().default('1.0.0'),
    meta: z.object({
        project_id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        owner: z.string().optional(),
        created_at: z.string().optional(), // ISO timestamp
        updated_at: z.string().optional(), // ISO timestamp
    }),
    config: z.object({
        theme: z.enum(['industrial_dark', 'light', 'custom']).default('industrial_dark'),
        refresh_rate: z.number().default(5000), // ms
    }).optional(),
    resources: resourcesSchema,
    l1_graph: l1GraphSchema.optional(),
    l2_graphs: z.record(l2GraphSchema).default({}), // Key is L2 Graph ID (e.g. l2_order_fulfillment)
});

// Type inference
export type MopDsl = z.infer<typeof mopDslSchema>;
export type ResourceRole = z.infer<typeof roleSchema>;
export type ResourceKpi = z.infer<typeof kpiDefinitionSchema>;
export type ResourceDataSource = z.infer<typeof dataSourceSchema>;
export type L1Node = z.infer<typeof l1NodeSchema>;
export type L2Node = z.infer<typeof l2NodeSchema>;
export type RuntimeBinding = z.infer<typeof runtimeBindingSchema>;
export type L1Graph = z.infer<typeof l1GraphSchema>;
export type L1Layer = z.infer<typeof l1LayerSchema>;
export type L1Edge = z.infer<typeof l1EdgeSchema>;
export type L2Graph = z.infer<typeof l2GraphSchema>;
export type L2Edge = z.infer<typeof l2EdgeSchema>;
export type Lane = z.infer<typeof laneSchema>;
