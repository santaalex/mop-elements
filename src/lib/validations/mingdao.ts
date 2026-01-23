import { z } from 'zod';

// According to the "Mingdao Schema Contract" in design_proposal.md
// | Trace ID | Node Key | Action | Timestamp | Operator | Payload |

export const mingdaoWebhookSchema = z.object({
    traceId: z.string().min(1, 'Trace ID is required'),
    nodeKey: z.string().min(1, 'Node Key is required'),
    action: z.enum(['ENTER', 'LEAVE', 'SUSPEND', 'RESUME']),
    timestamp: z.string().datetime().or(z.number()), // Support ISO string or unix timestamp
    operator: z.string().optional(),
    payload: z.record(z.any()).optional(), // Optional JSON payload
});

export type MingdaoWebhookData = z.infer<typeof mingdaoWebhookSchema>;
