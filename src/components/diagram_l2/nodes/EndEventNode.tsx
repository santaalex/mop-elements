import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { OctopusHandles } from './OctopusHandles';

const EndEventNode = ({ selected }: NodeProps) => {
    return (
        <div className="relative group">
            {/* Circle Shape - Thick Border */}
            <div className={`
        w-10 h-10 rounded-full 
        bg-white dark:bg-zinc-900 
        border-[4px] transition-all duration-200
        flex items-center justify-center
        ${selected
                    ? 'border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]'
                    : 'border-slate-800 dark:border-slate-200 hover:border-red-500'
                }
      `}>
            </div>

            {/* Label */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-slate-500">
                结束
            </div>

            <OctopusHandles />
        </div>
    );
};

export default memo(EndEventNode);
