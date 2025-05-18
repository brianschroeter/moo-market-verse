import React from 'react';
import { cn } from '@/lib/utils';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const MembershipBreakdownTooltipContent: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={cn(
        "min-w-[10rem] rounded-lg border border-yellow-500 bg-yellow-300/95 p-3 text-sm text-black shadow-lg",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
      )}>
        <p className="mb-1 font-bold">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex justify-between items-center">
            <div className="flex items-center">
              <span 
                className="mr-2 h-2.5 w-2.5 rounded-[2px]"
                style={{ backgroundColor: entry.color || entry.payload.fill }}
              />
              <span>{entry.name}:</span>
            </div>
            <span className="font-semibold">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default MembershipBreakdownTooltipContent; 