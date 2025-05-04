
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TicketFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  totalTickets: number;
}

const TicketFilters: React.FC<TicketFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalTickets,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search tickets..."
          className="pl-9 bg-lolcow-lightgray text-white"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <div className="text-gray-400 mr-2">Filter:</div>
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusFilterChange("all")}
          className={statusFilter === "all" ? "bg-lolcow-blue" : ""}
        >
          All
        </Button>
        <Button
          variant={statusFilter === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusFilterChange("open")}
          className={statusFilter === "open" ? "bg-green-500" : ""}
        >
          Open
        </Button>
        <Button
          variant={statusFilter === "awaiting_support" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusFilterChange("awaiting_support")}
          className={statusFilter === "awaiting_support" ? "bg-blue-500" : ""}
        >
          Awaiting Support
        </Button>
        <Button
          variant={statusFilter === "awaiting_user" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusFilterChange("awaiting_user")}
          className={statusFilter === "awaiting_user" ? "bg-yellow-500" : ""}
        >
          Awaiting User
        </Button>
        <Button
          variant={statusFilter === "closed" ? "default" : "outline"}
          size="sm"
          onClick={() => onStatusFilterChange("closed")}
          className={statusFilter === "closed" ? "bg-gray-500 text-white" : ""}
        >
          Closed
        </Button>
      </div>
      
      <div className="text-white whitespace-nowrap">
        Total: {totalTickets}
      </div>
    </div>
  );
};

export default TicketFilters;
