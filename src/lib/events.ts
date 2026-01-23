import { EventEmitter } from 'events';

// Use a global singleton to ensure we share the same emitter instance across route handlers in development.
// Note: In a serverless production environment (like Vercel), this in-memory approach won't work reliably across different lambdas.
// For production, we would use Redis Pub/Sub or a service like Pusher.

const globalForEvents = global as unknown as { eventEmitter: EventEmitter };

export const eventEmitter = globalForEvents.eventEmitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') globalForEvents.eventEmitter = eventEmitter;

// Event Types
export const EVENTS = {
    NODE_UPDATE: 'node-update',
};
