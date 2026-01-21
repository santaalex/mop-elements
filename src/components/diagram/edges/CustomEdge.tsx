import React, { useState, useRef, useEffect } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getSmoothStepPath,
    useReactFlow,
} from '@xyflow/react';

export default function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    selected,
}: EdgeProps) {
    // 1. Calculate the path string for a smoothstep edge
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // 2. State for editing label
    const [isEditing, setIsEditing] = useState(false);
    const [labelText, setLabelText] = useState((data?.label as string) || '');
    const inputRef = useRef<HTMLInputElement>(null);
    const { setEdges } = useReactFlow();

    // Sync internal state if data changes externally
    useEffect(() => {
        setLabelText((data?.label as string) || '');
    }, [data?.label]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef) {
            inputRef.current?.focus();
        }
    }, [isEditing]);

    const onScanLabel = () => {
        // If label is empty, we default to no label visually, but we keep the state
        setIsEditing(false);
        // Update global state
        setEdges((edges) =>
            edges.map((e) =>
                e.id === id
                    ? { ...e, data: { ...e.data, label: labelText } }
                    : e
            )
        );
    };

    const handleKeyDown = (evt: React.KeyboardEvent) => {
        if (evt.key === 'Enter') {
            evt.preventDefault();
            onScanLabel();
        }
    };

    // If no label and not editing, show a small interactive area or nothing?
    // User asked for "Double click to edit". 
    // We need a hit area. The edge itself is the hit area for selection.
    // But how to trigger "Edit Label" if there is NO label yet? 
    // Usually double clicking the EDGE PATH triggers it.

    // Strategy:
    // 1. Double click on the PATH -> Start Editing (handled by onEdgeDoubleClick in parent? Or generic listener?)
    //    React Flow `onEdgeDoubleClick` is on the Flow component.
    //    But we want encapsulated logic.
    //    Actually, we can put a pointer-events-all div at the label position as a "Label Placeholder".

    const edgeStyle = {
        ...style,
        stroke: selected ? '#f59e0b' : (style.stroke || '#b1b1b7'), // Amber for selection
        strokeWidth: selected ? 3 : (style.strokeWidth || 2),
        filter: selected ? 'drop-shadow(0 0 3px rgba(245, 158, 11, 0.4))' : undefined,
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        fontSize: 12,
                        // everything inside EdgeLabelRenderer has no pointer events by default
                        // if you want to interact with the label, set pointerEvents: all
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={labelText}
                            onChange={(e) => setLabelText(e.target.value)}
                            onBlur={onScanLabel}
                            onKeyDown={handleKeyDown}
                            className="text-xs border border-indigo-500 rounded px-1 py-0.5 bg-white text-slate-800 outline-none shadow-sm min-w-[60px] text-center"
                        />
                    ) : (
                        <div
                            onDoubleClick={() => setIsEditing(true)}
                            className={`
                        px-2 py-0.5 rounded cursor-pointer transition-all
                        ${labelText
                                    ? 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-sm text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                                    : 'w-6 h-6 bg-transparent hover:bg-slate-200/50 rounded-full flex items-center justify-center group'
                                }
                    `}
                            title="双击添加标签"
                        >
                            {labelText || (
                                // Invisible hit target that reveals on hover (or if selected)
                                <span className={`text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 ${selected ? 'opacity-50' : ''}`}>
                                    T
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
