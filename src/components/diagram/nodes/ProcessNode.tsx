import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { Plus, Loader2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getOrCreateL2Diagram } from '@/actions/diagram';

const ProcessNode = ({ id, data, selected }: NodeProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [label, setLabel] = useState((data.label as string) || '新的流程');
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    // Read View/Edit mode from data
    const isEditMode = data.isEditMode as boolean;
    const hasDrillDown = data.hasDrillDown as boolean;

    useEffect(() => {
        setLabel((data.label as string) || '新的流程');
    }, [data.label]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            const val = inputRef.current.value;
            inputRef.current.setSelectionRange(val.length, val.length);
        }
    }, [isEditing]);

    const handleSubmit = () => {
        setIsEditing(false);
        data.label = label;
    };

    // ... (keep useEffects and existing logic unchanged)

    const handleDrillDown = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLoading) return;

        setIsLoading(true);
        try {
            const projectId = data.projectId as string;
            if (!projectId) {
                console.error('No projectId found in node data');
                // Only alert in edit mode to be less intrusive? Or standard error handling.
                alert('无法获取项目信息，请刷新页面重试');
                return;
            }

            const result = await getOrCreateL2Diagram(projectId, id, label);

            if (result.success && result.id) {
                router.push(`/project/${projectId}/process/${result.id}`);
            } else {
                alert('进入子流程失败，请重试');
            }
        } catch (error) {
            console.error(error);
            alert('发生错误');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStyle = "w-3 h-3 bg-slate-300 hover:bg-indigo-500 border-2 border-white transition-colors z-50";

    return (
        <div
            className="relative group h-full"
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (isEditMode) {
                    setIsEditing(true);
                }
            }}
        >
            <NodeResizer
                minWidth={180}
                minHeight={80}
                isVisible={selected && isEditMode}
                lineClassName="border-indigo-400 opacity-50"
                handleClassName="h-2.5 w-2.5 bg-indigo-500 border-none rounded shadow-sm"
            />

            {/* Handles only visible/interactive in Edit Mode if desired, OR keep them but maybe hide if not editing? 
                Actually, usually View Mode hides handles to look cleaner.            {/* HANDLES - Always render (don't use hidden) to preserve edges, just hide visually in View Mode */}
            <Handle type="target" position={Position.Top} id="target-top" className={`!${handleStyle} -mt-1.5 z-50 ${!isEditMode ? '!opacity-0 !pointer-events-none' : 'opacity-100'}`} />
            <Handle type="source" position={Position.Top} id="source-top" className={`!${handleStyle} -mt-1.5 z-50 ${!isEditMode ? '!opacity-0 !pointer-events-none' : 'opacity-100'}`} />

            <Handle type="target" position={Position.Bottom} id="target-bottom" className={`!${handleStyle} -mb-1.5 z-50 ${!isEditMode ? '!opacity-0 !pointer-events-none' : 'opacity-100'}`} />
            <Handle type="source" position={Position.Bottom} id="source-bottom" className={`!${handleStyle} -mb-1.5 z-50 ${!isEditMode ? '!opacity-0 !pointer-events-none' : 'opacity-100'}`} />

            <Handle type="target" position={Position.Left} id="target-left" className={`!${handleStyle} -ml-1.5 z-50 ${!isEditMode ? '!opacity-0 !pointer-events-none' : 'opacity-100'}`} />
            <Handle type="source" position={Position.Left} id="source-left" className={`!${handleStyle} -ml-1.5 z-50 ${!isEditMode ? '!opacity-0 !pointer-events-none' : 'opacity-100'}`} />

            <Handle type="target" position={Position.Right} id="target-right" className={`!${handleStyle} -mr-1.5 z-50 ${!isEditMode ? '!opacity-0 !pointer-events-none' : 'opacity-100'}`} />
            <Handle type="source" position={Position.Right} id="source-right" className={`!${handleStyle} -mr-1.5 z-50 ${!isEditMode ? '!opacity-0 !pointer-events-none' : 'opacity-100'}`} />

            {/* Main Card Content */}
            <div className={`
                min-w-[180px] min-h-[80px] px-4 py-2 rounded-xl h-full
                bg-white dark:bg-zinc-900
                border-2 transition-all duration-200
                flex items-center justify-center text-center
                ${selected && isEditMode
                    ? 'border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.15)]'
                    : 'border-slate-200 dark:border-zinc-700 shadow-sm'
                }
                ${!isEditMode && 'hover:border-slate-300 dark:hover:border-zinc-600'}
                ${isEditMode && 'hover:border-indigo-300 hover:shadow-md'}
            `}>
                {isEditing ? (
                    <textarea
                        ref={inputRef}
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onBlur={handleSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        className="w-full h-full text-center bg-transparent border-none outline-none text-sm font-bold text-slate-800 dark:text-slate-100 resize-none overflow-hidden py-2 leading-relaxed"
                    />
                ) : (
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 pointer-events-none select-none break-words whitespace-pre-wrap max-w-full leading-relaxed">
                        {label}
                    </span>
                )}
            </div>

            {/* Drill Down Button */}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 z-20 w-5 h-5">
                <button
                    className={`
                        flex items-center justify-center
                        w-full h-full rounded-full
                        bg-white dark:bg-zinc-800
                        border 
                        shadow-sm transition-transform hover:scale-110
                        ${isLoading ? 'cursor-wait opacity-80' : ''}
                        
                        ${isEditMode
                            ? 'border-slate-300 dark:border-zinc-600 text-slate-500 hover:text-indigo-600 hover:border-indigo-400'
                            : hasDrillDown
                                ? 'border-sky-500 text-sky-600 hover:bg-sky-50 dark:border-sky-400 dark:text-sky-400 dark:hover:bg-sky-900/30'
                                : 'border-slate-300 dark:border-zinc-600 text-slate-400 hover:text-indigo-600 hover:border-indigo-400'
                        }
                    `}
                    onClick={handleDrillDown}
                    disabled={isLoading}
                    title={isEditMode ? "点击展开/创建下级" : (hasDrillDown ? "查看详情" : "暂无内容")}
                >
                    {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Plus className={`w-3.5 h-3.5 ${!isEditMode && hasDrillDown ? 'text-sky-600 dark:text-sky-400' : ''}`} strokeWidth={3} />
                    )}
                </button>
            </div>
        </div>
    );
};

export default memo(ProcessNode);
