import { Handle, Position } from 'reactflow';

export const OctopusHandles = () => {
    // Base styles without the '!' prefix hack
    const baseStyle = "w-3 h-3 bg-slate-300 hover:bg-indigo-500 border-2 border-white transition-colors z-[100] shadow-sm rounded-full";

    // Explicit positioning overrides relative to the node border (0px)
    // We want them floating OUTSIDE.
    // Top handle: Top = -12px
    // Bottom handle: Bottom = -12px
    // Left handle: Left = -12px
    // Right handle: Right = -12px

    // Note: React Flow handles are absolute positioned. 
    // Passing 'top' / 'bottom' / 'left' / 'right' in style prop will override default positioning if specificity allows, 
    // but inline styles usually win.

    const offset = '-12px';

    return (
        <>
            {/* Top */}
            <Handle
                type="target"
                position={Position.Top}
                id="target-top"
                className={baseStyle}
                style={{ top: offset, transform: 'translate(-50%, 0)' }}
            />
            <Handle
                type="source"
                position={Position.Top}
                id="source-top"
                className={`${baseStyle} opacity-0 hover:opacity-100`}
                style={{ top: offset, transform: 'translate(-50%, 0)' }}
            />

            {/* Bottom */}
            <Handle
                type="target"
                position={Position.Bottom}
                id="target-bottom"
                className={baseStyle}
                style={{ bottom: offset, top: 'auto', transform: 'translate(-50%, 0)' }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="source-bottom"
                className={`${baseStyle} opacity-0 hover:opacity-100`}
                style={{ bottom: offset, top: 'auto', transform: 'translate(-50%, 0)' }}
            />

            {/* Left */}
            <Handle
                type="target"
                position={Position.Left}
                id="target-left"
                className={baseStyle}
                style={{ left: offset, transform: 'translate(0, -50%)' }}
            />
            <Handle
                type="source"
                position={Position.Left}
                id="source-left"
                className={`${baseStyle} opacity-0 hover:opacity-100`}
                style={{ left: offset, transform: 'translate(0, -50%)' }}
            />

            {/* Right */}
            <Handle
                type="target"
                position={Position.Right}
                id="target-right"
                className={baseStyle}
                style={{ right: offset, left: 'auto', transform: 'translate(0, -50%)' }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="source-right"
                className={`${baseStyle} opacity-0 hover:opacity-100`}
                style={{ right: offset, left: 'auto', transform: 'translate(0, -50%)' }}
            />
        </>
    );
};
