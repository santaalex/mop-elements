import { NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import React, { memo, CSSProperties } from 'react';

export const MonitorLane = memo(({ data, style }: NodeProps & { style?: CSSProperties }) => {
    // Ignore incoming style (which might have white background)
    // We only respect dimensions if needed, or we rely on the parent container size
    // Actually, usually style has width/height. We should keep dimensions but override colors.

    return (
        <div
            className="w-full h-full border-2 border-slate-800 bg-slate-950/50 rounded-lg relative transition-colors"
            style={{
                width: style?.width,
                height: style?.height,
                // Force override background color to ensure dark mode
                backgroundColor: 'rgba(2, 6, 23, 0.5)'
            }}
        >
            {/* Folder Tab / Label Area */}
            <div className="absolute top-0 right-0 px-4 py-1 bg-slate-900 border-b border-l border-slate-800 rounded-bl-lg">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                    {data.label as string}
                </span>
            </div>

            {/* Subtle Grid Pattern inside lane for techy feel */}
            <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff),linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff)] bg-[length:20px_20px] bg-[position:0_0,10px_10px]" />
        </div>
    );
});

MonitorLane.displayName = 'MonitorLane';
