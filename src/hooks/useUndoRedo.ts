import { useState, useCallback, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';

type HistoryItem = {
    nodes: Node[];
    edges: Edge[];
};

/**
 * A custom hook for managing Undo/Redo history in React Flow.
 * Features:
 * - Snapshots full state (nodes + edges)
 * - Keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
 * - Max history limit (optional, set to 50 for now)
 */
export const useUndoRedo = ({
    nodes,
    edges,
    setNodes,
    setEdges,
    maxHistory = 50,
}: {
    nodes: Node[];
    edges: Edge[];
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
    setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
    maxHistory?: number;
}) => {
    const [past, setPast] = useState<HistoryItem[]>([]);
    const [future, setFuture] = useState<HistoryItem[]>([]);

    // Take a snapshot of the CURRENT state (before changes happen or immediately)
    // IMPORTANT: Call this BEFORE applying a destructive change (drag start, delete start)
    const takeSnapshot = useCallback(() => {
        setPast((old) => {
            const newPast = [...old, { nodes, edges }];
            if (newPast.length > maxHistory) newPast.shift(); // Limit history
            return newPast;
        });
        setFuture([]); // Clear future on new action
    }, [nodes, edges, maxHistory]);

    const undo = useCallback(() => {
        if (past.length === 0) return;

        const newPast = [...past];
        const previousState = newPast.pop();

        if (previousState) {
            // Push CURRENT state to future before restoring old state
            setFuture((old) => [...old, { nodes, edges }]);

            // Restore OLD state
            setNodes(previousState.nodes);
            setEdges(previousState.edges);

            setPast(newPast);
        }
    }, [nodes, edges, past, setNodes, setEdges]);

    const redo = useCallback(() => {
        if (future.length === 0) return;

        const newFuture = [...future];
        const nextState = newFuture.pop();

        if (nextState) {
            // Push CURRENT state to past before restoring future state
            setPast((old) => [...old, { nodes, edges }]);

            // Restore FUTURE state
            setNodes(nextState.nodes);
            setEdges(nextState.edges);

            setFuture(newFuture);
        }
    }, [nodes, edges, future, setNodes, setEdges]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check for Ctrl (Windows) or Command (Mac)
            const isCtrl = event.ctrlKey || event.metaKey;

            if (isCtrl && event.key === 'z') {
                if (event.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                event.preventDefault();
            }

            // Windows/Linux Redo: Ctrl+Y
            if (isCtrl && event.key === 'y') {
                redo();
                event.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    return { undo, redo, takeSnapshot, canUndo: past.length > 0, canRedo: future.length > 0 };
};
