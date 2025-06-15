import { cn } from "@/lib/utils";
import { Star, Users, BarChart } from "lucide-react";
import React from "react";

interface LeaderboardTabsProps {
  activeTab: "superchats" | "gifted" | "breakdown";
  onTabChange: (tab: "superchats" | "gifted" | "breakdown") => void;
}

const LeaderboardTabs = ({ activeTab, onTabChange }: LeaderboardTabsProps) => {
  return (
    <div className="relative border-b border-gray-700/50 mb-4 sm:mb-6">
      <div className="flex flex-row overflow-x-auto scrollbar-hide">
        <TabButton 
          isActive={activeTab === "superchats"}
          onClick={() => onTabChange("superchats")}
          icon={<Star className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", "text-white")} />}
          label="Superchats"
          color={activeTab === "superchats" ? "from-red-600 to-red-500" : "from-blue-600 to-blue-400"}
          textColor={activeTab === "superchats" ? "text-lolcow-red" : "text-white"}
          indicator={activeTab === "superchats" ? "bg-lolcow-red" : "bg-blue-500"}
        />
        
        <TabButton 
          isActive={activeTab === "gifted"}
          onClick={() => onTabChange("gifted")}
          icon={<Users className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", activeTab === "gifted" ? "text-white" : "text-white")} />}
          label="Gifted"
          labelMobile="Gifted"
          labelDesktop="Gifted Members"
          color="from-green-600 to-green-400" 
          textColor={activeTab === "gifted" ? "text-white" : "text-gray-400"}
          indicator="bg-green-500"
        />
        
        <TabButton 
          isActive={activeTab === "breakdown"}
          onClick={() => onTabChange("breakdown")}
          icon={<BarChart className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", activeTab === "breakdown" ? "text-white" : "text-white")} />}
          label="Breakdown"
          color="from-yellow-600 to-yellow-400"
          textColor={activeTab === "breakdown" ? "text-white" : "text-gray-400"}
          indicator="bg-yellow-500"
        />
      </div>
    </div>
  );
};

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  labelMobile?: string;
  labelDesktop?: string;
  color: string;
  textColor: string;
  indicator: string;
}

const TabButton = ({ isActive, onClick, icon, label, labelMobile, labelDesktop, color, textColor, indicator }: TabButtonProps) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-3 sm:px-6 transition-all duration-200 font-medium relative min-w-fit",
        isActive 
          ? textColor
          : "text-gray-400 hover:text-white"
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className={cn(
          "flex items-center justify-center p-0.5 sm:p-1 rounded-full",
          isActive ? `bg-gradient-to-r ${color}` : "bg-gray-700/50"
        )}>
          {icon}
        </span>
        <span className="text-sm sm:text-base">
          <span className="inline sm:hidden">{labelMobile || label}</span>
          <span className="hidden sm:inline">{labelDesktop || label}</span>
        </span>
      </div>
      
      {isActive && (
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${indicator}`}>
          {/* Optional: Pulse animation elements - can be kept or removed based on preference */}
          {/* <div className="absolute bottom-0 -left-2 w-2 h-2 rounded-full animate-pulse" style={{background: indicator.slice(3)}}></div> */}
          {/* <div className="absolute bottom-0 -right-2 w-2 h-2 rounded-full animate-pulse" style={{background: indicator.slice(3)}}></div> */}
        </div>
      )}
    </button>
  );
};

export default LeaderboardTabs; 