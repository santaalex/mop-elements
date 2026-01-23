import { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { GripVertical } from 'lucide-react';

// Map abstract color names to premium Tailwind gradient classes
const colorSchemes: Record<string, { sidebar: string, content: string, border: string, dragIcon: string, handle: string }> = {
    blue: {
        sidebar: 'bg-blue-50/90 dark:bg-blue-950/40 border-r-blue-200 dark:border-r-blue-800',
        content: 'bg-gradient-to-r from-blue-50/50 to-white/20 dark:from-blue-900/10 dark:to-transparent',
        border: 'border-blue-200 dark:border-blue-800',
        dragIcon: 'text-blue-400 dark:text-blue-500',
        handle: 'bg-blue-500'
    },
    violet: {
        sidebar: 'bg-violet-50/90 dark:bg-violet-950/40 border-r-violet-200 dark:border-r-violet-800',
        content: 'bg-gradient-to-r from-violet-50/50 to-white/20 dark:from-violet-900/10 dark:to-transparent',
        border: 'border-violet-200 dark:border-violet-800',
        dragIcon: 'text-violet-400 dark:text-violet-500',
        handle: 'bg-violet-500'
    },
    indigo: {
        sidebar: 'bg-indigo-50/90 dark:bg-indigo-950/40 border-r-indigo-200 dark:border-r-indigo-800',
        content: 'bg-gradient-to-r from-indigo-50/50 to-white/20 dark:from-indigo-900/10 dark:to-transparent',
        border: 'border-indigo-200 dark:border-indigo-800',
        dragIcon: 'text-indigo-400 dark:text-indigo-500',
        handle: 'bg-indigo-500'
    },
    slate: {
        sidebar: 'bg-slate-50/90 dark:bg-zinc-900/80 border-r-slate-200 dark:border-r-zinc-700',
        content: 'bg-gradient-to-r from-slate-50/50 to-white/20 dark:from-zinc-900/10 dark:to-transparent',
        border: 'border-slate-200 dark:border-zinc-700',
        dragIcon: 'text-slate-400 dark:text-slate-500',
        handle: 'bg-slate-500'
    },
    emerald: {
        sidebar: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-r-emerald-200 dark:border-r-emerald-800',
        content: 'bg-gradient-to-r from-emerald-50/50 to-white/20 dark:from-emerald-900/10 dark:to-transparent',
        border: 'border-emerald-200 dark:border-emerald-800',
        dragIcon: 'text-emerald-400 dark:text-emerald-500',
        handle: 'bg-emerald-500'
    },
};

const GroupNode = ({ id, data, selected, width, height }: NodeProps & { width?: number; height?: number }) => {
    const theme = colorSchemes[data.color as string] || colorSchemes.slate;

    // Call shared resize handler if available
    const onResize = (evt: any, params: { width: number; height: number; x: number; y: number }) => {
        if (data.onResize && typeof data.onResize === 'function') {
            (data.onResize as Function)(id, params);
        }
    };

    return (
        <>
            {data.isEditMode && (
                <NodeResizer
                    minWidth={200}
                    minHeight={100}
                    isVisible={selected}
                    onResize={onResize}
                    lineClassName="border-indigo-500 opacity-50"
                    handleClassName={`h-3 w-3 rounded-full border-2 border-white shadow-md ${theme.handle}`}
                />
            )}

            <div className={`
        relative h-full w-full flex rounded-lg overflow-hidden
        transition-all duration-300 border
        ${theme.border}
        ${selected
                    ? 'shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] ring-1 ring-indigo-500/50'
                    : 'shadow-sm hover:shadow-md'
                }
      `}>
                {/* Left Sidebar Header */}
                <div className={`
            flex flex-col items-center justify-center
            w-16 h-full shrink-0
            backdrop-blur-md transition-colors duration-200 group
            ${theme.sidebar}
        `}>
                    <div
                        className="writing-vertical-lr text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wider select-none flex items-center justify-center gap-4 py-4"
                        style={{ writingMode: 'vertical-lr' }}
                    >
                        <GripVertical className={`w-4 h-4 mb-2 opacity-50 group-hover:opacity-100 transition-opacity ${theme.dragIcon}`} />
                        <span>{data.label as string}</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className={`
            flex-1 h-full relative
            backdrop-blur-sm
            ${theme.content}
        `}>
                    {selected && (
                        <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-400 bg-white/50 px-1.5 py-0.5 rounded border border-slate-100">
                            {Math.round(width || 0)} x {Math.round(height || 0)}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default memo(GroupNode);
