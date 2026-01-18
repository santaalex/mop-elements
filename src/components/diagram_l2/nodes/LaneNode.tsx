import { memo, useState, useRef, useEffect } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { X } from 'lucide-react';

const LaneNode = ({ id, data, selected }: NodeProps) => {
    const [label, setLabel] = useState((data.label as string) || '新泳道');
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Call external delete handler if provided in data
    const onDelete = data.onDelete as () => void;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSubmit = () => {
        setIsEditing(false);
        data.label = label;
    };

    return (
        <div className="h-full w-full relative group">
            <NodeResizer
                minWidth={600}
                minHeight={150}
                isVisible={selected}
                lineClassName="border-indigo-300 opacity-50"
                handleClassName="h-2.5 w-2.5 bg-indigo-400 border-none rounded"
            />

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
                ">
                    {/* Rotated Text */}
                    <div className="transform -rotate-90 whitespace-nowrap">
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                onBlur={handleSubmit}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                className="w-32 text-center bg-white border border-indigo-300 text-xs px-1 py-0.5 outline-none"
                            />
                        ) : (
                            <span
                                className="text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-indigo-600"
                                onDoubleClick={() => setIsEditing(true)}
                            >
                                {label}
                            </span>
                        )}
                    </div>

                    {/* Delete Button (Visible on Hover of Header) */}
                    {onDelete && selected && (
                        <button
                            className="absolute top-1 left-1/2 -translate-x-1/2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
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
