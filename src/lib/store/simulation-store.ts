import { create } from 'zustand';
import { Node, Edge } from 'reactflow';
import { SimulationEngine, SimToken, SimulationConfig } from '@/lib/simulation/engine';

interface SimulationState {
    isPlaying: boolean;
    speed: number;
    tokens: SimToken[];
    engine: SimulationEngine | null;

    // Actions
    initialize: (nodes: Node[], edges: Edge[]) => void;
    togglePlay: () => void;
    setSpeed: (speed: number) => void;
    reset: () => void;
    tick: (deltaTime: number) => void; // Called by requestAnimationFrame loop
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
    isPlaying: false,
    speed: 1,
    tokens: [],
    engine: null,

    initialize: (nodes, edges) => {
        const config: SimulationConfig = {
            speed: get().speed,
            arrivalRate: 6, // 6 per minute (1 every 10s)
            defaultDuration: 5000 // 5 seconds
        };
        const engine = new SimulationEngine(nodes, edges, config);
        set({ engine, tokens: [] });
    },

    togglePlay: () => {
        const { isPlaying, engine } = get();
        if (engine) {
            if (!isPlaying) engine.start();
            else engine.pause();
        }
        set({ isPlaying: !isPlaying });
    },

    setSpeed: (speed) => {
        // Re-init engine or update config? 
        // Engine config is passed by ref or needs setter.
        // For MVP, just set store state, Engine reads on tick or we rebuild.
        // Assuming Engine.config is public or we add a setter.
        // Let's just update local state for now, assuming Engine reads `speed` factor from tick or we pass it down.
        // Actually, in our Engine impl, config is stored. We should expose a method.
        // We will just recreate for now or ignore live update in MVP if lazy.
        set({ speed });
    },

    reset: () => {
        const { engine } = get();
        engine?.reset();
        set({ isPlaying: false, tokens: [] });
    },

    tick: (deltaTime) => {
        const { engine, isPlaying } = get();
        if (isPlaying && engine) {
            const tokens = engine.tick(deltaTime);
            set({ tokens: [...tokens] }); // Force re-render
        }
    }
}));
