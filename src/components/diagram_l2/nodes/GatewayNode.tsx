import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { X, Plus, Circle } from 'lucide-react';
import { OctopusHandles } from './OctopusHandles';

// data.gatewayType can be 'XOR', 'AND', 'OR'
const GatewayNode = ({ data, selected }: NodeProps) => {
    const type = (data.gatewayType as string) || 'XOR';

    const renderIcon = () => {
        switch (type) {
            case 'AND': return <Plus className="w-8 h-8 text-slate-800 dark:text-slate-100" strokeWidth={2.5} />; // +
            case 'OR': return <Circle className="w-7 h-7 text-slate-800 dark:text-slate-100" strokeWidth={2.5} />; // O
            case 'XOR':
            default: return <X className="w-8 h-8 text-slate-800 dark:text-slate-100" strokeWidth={2.5} />; // X
        }
    };

    return (
        <div className="relative group w-12 h-12 flex items-center justify-center">
            {/* Rhombus Shape using rotation */}
            <div className={`
        absolute inset-0 
        bg-white dark:bg-zinc-900 
        border-[1.5px] transition-all duration-200
        rotate-45
        ${selected
                    ? 'border-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.2)]'
                    : 'border-slate-800 dark:border-slate-200 hover:border-orange-500'
                }
      `}>
            </div>

            {/* Icon (Not rotated) */}
            <div className="relative z-10 pointer-events-none">
                {renderIcon()}
            </div>

            {/* Handles need to be positioned on the points of the diamond */}
            {/* Using OctopusHandles for standardized styling and floating offset */}
            <OctopusHandles />

            {/* Label */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-slate-500">
                {type}
            </div>
        </div>
    );
};

export default memo(GatewayNode);
