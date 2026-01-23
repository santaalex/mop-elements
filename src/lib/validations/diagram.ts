import { z } from 'zod';

// --- Basic React Flow Node Schema ---
export const nodeSchema = z.object({
    id: z.string(),
    position: z.object({
        x: z.number(),
        y: z.number(),
    }),
    data: z.record(z.string(), z.any()).optional(), // Allow flexible data for now, can be tightened later
    type: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    selected: z.boolean().optional(),
    positionAbsolute: z.object({
        x: z.number(),
        y: z.number(),
    }).optional(),
    dragging: z.boolean().optional(),
}).passthrough(); // Allow other React Flow internal props

// --- Basic React Flow Edge Schema ---
export const edgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().nullable().optional(),
    targetHandle: z.string().nullable().optional(),
    type: z.string().optional(),
    animated: z.boolean().optional(),
    data: z.record(z.string(), z.any()).optional(),
    selected: z.boolean().optional(),
}).passthrough();

// --- Main Diagram Data Schema ---
export const diagramDataSchema = z.object({
    nodes: z.array(nodeSchema),
    edges: z.array(edgeSchema),
    viewport: z.object({
        x: z.number(),
        y: z.number(),
        zoom: z.number(),
    }).optional(),
});

// Type inference
export type DiagramData = z.infer<typeof diagramDataSchema>;
