import React from 'react';
import { DollarSign } from 'lucide-react';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomSuperchatTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // Show data
    const value = payload[0].value; // Revenue amount

    return (
      <div className="bg-gray-800/90 p-3 rounded-lg border border-gray-700/50 shadow-xl text-white">
        <p className="text-sm font-semibold mb-1.5">{label}</p> {/* Show Name from label */}
        <div className="flex items-center">
          <DollarSign className="h-4 w-4 text-lolcow-red mr-2" />
          <span className="text-xs text-gray-300">Revenue:</span>
          <span className="text-xs font-medium ml-1">${(value as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  }

  return null;
};

export default CustomSuperchatTooltip; 