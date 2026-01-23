import { memo, useState, useRef, useEffect } from 'react';
import { NodeProps, NodeResizer, useReactFlow } from 'reactflow';
import { X, Pencil } from 'lucide-react';

const LaneNode = ({ id, data, selected }: NodeProps) => {
    const { setNodes } = useReactFlow();
    const [label, setLabel] = useState((data.label as string) || '新泳道');
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Call external delete handler if provided in data
    const onDelete = data.onDelete as () => void;

    // Call shared resize handler if available
    const onResize = (evt: any, params: { width: number; height: number; x: number; y: number }) => {
        if (data.onResize && typeof data.onResize === 'function') {
            (data.onResize as Function)(id, params);
        }
    };

    // Sync local state if data.label changes (e.g. via Sidebar)
    useEffect(() => {
        console.log('[LaneNode] data.label changed to:', data.label, 'Id:', id);
        setLabel((data.label as string) || '新泳道');
    }, [data.label, id]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSubmit = () => {
        setIsEditing(false);
        // Update via React Flow state to trigger change events and history
        setNodes((nodes) => nodes.map(n =>
            n.id === id ? { ...n, data: { ...n.data, label } } : n
        ));
    };

    return (
        <div className="h-full w-full relative group">
            {!!data.isEditMode && (
                <NodeResizer
                    minWidth={600}
                    minHeight={150}
                    isVisible={selected}
                    onResize={onResize}
                    lineClassName="border-indigo-300 opacity-50"
                    handleClassName="h-2.5 w-2.5 bg-indigo-400 border-none rounded"
                />
            )}

            {/* Lane Container */}
            <div className={`
                w-full h-full 
                bg-white/50 dark:bg-zinc-900/30 
                border-t border-b border-r border-slate-300 dark:border-zinc-700
                flex flex-row
                ${selected ? 'bg-indigo-50/30' : ''}
            `}>
                {/* Lane Header (Left) */}
                <div className="
                    w-12 h-full 
                    border-r border-slate-300 dark:border-zinc-700 
                    bg-slate-100 dark:bg-zinc-800/50
                    flex items-center justify-center
                    relative
                    group/header
                ">
                    {/* Rotated Text */}
                    <div className="transform -rotate-90 whitespace-nowrap flex items-center gap-2">
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                type="text"
                                id="lane-label-input"
                                name="lane-label"
                                autoComplete="off"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                onBlur={handleSubmit}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                className="w-32 text-center bg-white border border-indigo-300 text-xs px-1 py-0.5 outline-none text-slate-900"
                            />
                        ) : (
                            <div
                                className="flex items-center gap-2 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 px-2 py-1 rounded transition-colors"
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (data.isEditMode) setIsEditing(true);
                                }}
                            >
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 select-none">
                                    {label}
                                </span>
                                {/* Pencil Icon - Visible on Header Hover */}
                                {!!data.isEditMode && (
                                    <Pencil
                                        className="w-3 h-3 text-slate-400 opacity-0 group-hover/header:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditing(true);
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Delete Button (Visible on Hover of Header) */}
                    {!!data.isEditMode && onDelete && selected && (
                        <button
                            className="absolute top-1 left-1/2 -translate-x-1/2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('确定删除此泳道及其内容吗？')) onDelete();
                            }}
                            title="删除泳道"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Lane Content Area (Drop Zone) */}
                <div className="flex-1 h-full min-w-0 relative">
                    <div className="absolute top-1 right-2 text-[10px] text-slate-300 select-none pointer-events-none">
                        Swimlane Content
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(LaneNode);
