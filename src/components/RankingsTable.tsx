import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import React from "react";

interface RankingsTableProps {
  data: any[];
  columns: string[];
  valueFormatter?: Record<string, (value: any) => string>;
  highlightColor?: string;
}

const RankingsTable: React.FC<RankingsTableProps> = ({ data, columns, valueFormatter, highlightColor = "bg-blue-500/10" }) => {
  const formatValue = (column: string, value: any) => {
    if (valueFormatter && valueFormatter[column]) {
      return valueFormatter[column](value);
    }
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value); 
    }
    return '';
  };

  const getHeaderLabel = (column: string) => {
    const labels: Record<string, string | React.ReactNode> = {
      rank: "#",
      show: "Show",
      amount: "Amount",
      gifts: "Total Gifts",
      crown: "👑 Crown",
      pig: "🐷 Pay Pig",
      cow: "🐮 Cash Cow",
      crownCount:  "👑",
      paypigCount: "🐷",
      cashCowCount:"🐮",
    };
    
    return labels[column] || column.charAt(0).toUpperCase() + column.slice(1);
  };

  const getRankDisplay = (rank: any, index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-400" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-700" />;
    return `#${rank}`;
  };

  if (!data || data.length === 0) {
    return <div className="text-center py-4 text-gray-500">No data to display.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700/50">
            {columns.map((column) => (
              <th 
                key={column} 
                className={cn(
                  "py-3 px-3 text-left font-medium text-sm",
                  column === "rank" && "w-12 text-center",
                  (column === "amount" || column === "gifts") && "text-right",
                  (column === "crownCount" || column === "paypigCount" || column === "cashCowCount" || column === "crown" || column === "pig" || column === "cow") && "text-center"
                )}
              >
                {getHeaderLabel(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr 
              key={row.id || index}
              className={cn(
                "border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors",
                index < 3 && highlightColor
              )}
            >
              {columns.map((column) => (
                <td 
                  key={`${row.id || index}-${column}`} 
                  className={cn(
                    "py-3 px-3",
                    column === "rank" && index < 3 ? "font-bold flex justify-center items-center h-full" : "",
                    column === "rank" && index >= 3 && "font-medium text-gray-500 text-center",
                    column === "show" && "text-white font-medium",
                    column === "amount" && "text-blue-400 font-medium text-right",
                    column === "gifts" && "text-green-400 font-medium text-right",
                    (column === "crownCount" || column === "crown") && "text-yellow-400 font-medium text-center",
                    (column === "paypigCount" || column === "pig") && "text-pink-400 font-medium text-center",
                    (column === "cashCowCount" || column === "cow") && "text-sky-400 font-medium text-center"
                  )}
                >
                  {column === "rank" ? getRankDisplay(row[column], index) : formatValue(column, row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RankingsTable; 