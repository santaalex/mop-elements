import { Node, Edge } from 'reactflow';

// Types for the Simulation
export type TokenType = 'standard' | 'error';

export interface SimToken {
    id: string;
    currentElementId: string; // Node ID or Edge ID
    status: 'moving' | 'processing' | 'waiting' | 'completed';
    startTime: number;
    progress: number; // 0 to 1 (for animation)
    position?: { x: number; y: number }; // For visual sync
}

export interface SimEvent {
    time: number;
    type: 'TOKEN_ARRIVE' | 'TOKEN_START_PROCESS' | 'TOKEN_FINISH_PROCESS' | 'TOKEN_DEPART' | 'TOKEN_MOVE_END';
    tokenId: string;
    targetId: string; // Node or Edge ID
    payload?: any;
}

export interface SimulationConfig {
    speed: number; // 1x, 5x, 10x
    arrivalRate: number; // Tokens per minute
    defaultDuration: number; // Default activity duration in ms
}

export class SimulationEngine {
    private currentTime: number = 0;
    private eventQueue: SimEvent[] = [];
    private tokens: Map<string, SimToken> = new Map();
    private nodes: Node[] = [];
    private edges: Edge[] = [];
    private isRunning: boolean = false;
    private config: SimulationConfig;

    constructor(nodes: Node[], edges: Edge[], config: SimulationConfig) {
        this.nodes = nodes;
        this.edges = edges;
        this.config = config;
        this.reset();
    }

    public reset() {
        this.currentTime = 0;
        this.eventQueue = [];
        this.tokens.clear();
        this.isRunning = false;
    }

    public start() {
        this.isRunning = true;
        // Seed initial events if empty
        if (this.eventQueue.length === 0) {
            this.scheduleNextArrival();
        }
    }

    public pause() {
        this.isRunning = false;
    }

    // Main Loop: Process events up to `tickTime`
    // tickTime is the "Wall Clock" time delta passed from the UI loop
    public tick(deltaTimeMs: number): SimToken[] {
        if (!this.isRunning) return Array.from(this.tokens.values());

        // Convert Wall Clock delta to Virtual Time delta
        const virtualDelta = deltaTimeMs * this.config.speed;
        const targetTime = this.currentTime + virtualDelta;

        // Process all events that happen between currentTime and targetTime
        while (this.eventQueue.length > 0 && this.eventQueue[0].time <= targetTime) {
            const event = this.eventQueue.shift();
            if (event) {
                this.currentTime = event.time; // Advance clock to event time
                this.handleEvent(event);
            }
        }

        // Catch up current time exactly to target if no more events
        this.currentTime = targetTime;

        // Interpolate Token Positions (for smooth animation)
        this.updateTokenStates(deltaTimeMs); // Pass wall clock delta for smooth lerping if needed

        return Array.from(this.tokens.values());
    }

    private scheduleNextArrival() {
        // Simple Poisson-like or fixed interval
        // For MVP, just spawn one every X virtual seconds
        const nextTime = this.currentTime + (60000 / this.config.arrivalRate);
        const startNodes = this.nodes.filter(n => n.type === 'start' || (n.data && n.data.type === 'start'));

        startNodes.forEach(node => {
            const tokenId = `token-${Math.random().toString(36).substr(2, 9)}`;
            this.scheduleEvent({
                time: nextTime,
                type: 'TOKEN_ARRIVE',
                tokenId,
                targetId: node.id
            });
        });

        // Schedule the NEXT arrival after this one (recursive scheduling)
        this.scheduleEvent({
            time: nextTime, // This schedule event itself doesn't need to be in queue, but the EFFECT is.
            // Actually, we usually just set a timer. 
            // In DES, we push a "SYSTEM_SPAWN" event. 
            // Simplification: We'll just call this recursively inside handleEvent if we had a SPAWN event type.
            // For now, let's just hack it: The Tick loop or a specific "Generator" handles injection.
            // Let's stick to the Event architecture:
            // We need a 'SYSTEM_GENERATE' event.
            type: 'TOKEN_ARRIVE', // reusing this for now implies external injection.
            tokenId: 'PENDING',
            targetId: 'SYSTEM'
        });
    }

    // Priority Queue Insert
    private scheduleEvent(event: SimEvent) {
        // Binary insertion to keep sorted by time
        // (For MVP, simple push+sort is fine for low volume)
        this.eventQueue.push(event);
        this.eventQueue.sort((a, b) => a.time - b.time);
    }

    private handleEvent(event: SimEvent) {
        if (event.targetId === 'SYSTEM') {
            this.scheduleNextArrival();
            return;
        }

        switch (event.type) {
            case 'TOKEN_ARRIVE':
                this.createToken(event.tokenId, event.targetId);
                // Immediately start processing or move
                this.scheduleEvent({
                    time: this.currentTime, // Zero delay entry
                    type: 'TOKEN_START_PROCESS',
                    tokenId: event.tokenId,
                    targetId: event.targetId
                });
                break;

            case 'TOKEN_START_PROCESS':
                this.updateTokenStatus(event.tokenId, 'processing');
                // Calculate duration
                const duration = this.config.defaultDuration; // Placeholder
                this.scheduleEvent({
                    time: this.currentTime + duration,
                    type: 'TOKEN_FINISH_PROCESS',
                    tokenId: event.tokenId,
                    targetId: event.targetId
                });
                break;

            case 'TOKEN_FINISH_PROCESS':
                // Find next path
                const nextEdge = this.findNextEdge(event.targetId);
                if (nextEdge) {
                    this.updateTokenStatus(event.tokenId, 'moving');
                    // Move duration (simulated travel time, e.g., 2000ms virtual)
                    const travelTime = 2000;
                    this.scheduleEvent({
                        time: this.currentTime + travelTime,
                        type: 'TOKEN_MOVE_END',
                        tokenId: event.tokenId,
                        targetId: nextEdge.id, // Moving ON edge
                        payload: { toNodeId: nextEdge.target }
                    });
                } else {
                    this.updateTokenStatus(event.tokenId, 'completed');
                    this.scheduleEvent({
                        time: this.currentTime,
                        type: 'TOKEN_DEPART',
                        tokenId: event.tokenId,
                        targetId: event.targetId
                    });
                }
                break;

            case 'TOKEN_MOVE_END':
                // Arrived at next node
                const toNodeId = event.payload.toNodeId;
                this.scheduleEvent({
                    time: this.currentTime,
                    type: 'TOKEN_ARRIVE',
                    tokenId: event.tokenId,
                    targetId: toNodeId
                });
                break;

            case 'TOKEN_DEPART':
                this.tokens.delete(event.tokenId);
                break;
        }
    }

    private createToken(id: string, nodeId: string) {
        this.tokens.set(id, {
            id,
            currentElementId: nodeId,
            status: 'waiting',
            startTime: this.currentTime,
            progress: 0
        });
    }

    private updateTokenStatus(id: string, status: SimToken['status']) {
        const t = this.tokens.get(id);
        if (t) t.status = status;
    }

    // Logic to find outgoing edge (handling gateways later)
    private findNextEdge(nodeId: string): Edge | undefined {
        const outgoing = this.edges.filter(e => e.source === nodeId);
        if (outgoing.length === 0) return undefined;
        // Simple random choice for now (Gateway logic goes here)
        return outgoing[Math.floor(Math.random() * outgoing.length)];
    }

    // Lightweight visual update (progress interpolation)
    private updateTokenStates(deltaTime: number) {
        // This is purely for smooth UI interpolation between events
        // Real state change happens in handleEvent
    }
}
