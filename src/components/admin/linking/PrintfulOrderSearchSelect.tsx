import React, { useState, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming Shadcn UI project structure
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from '@/integrations/supabase/client'; // Corrected Supabase client import path

export interface PrintfulOrderSearchResult {
  printful_internal_id: number;
  printful_external_id: string | null;
  recipient_name: string;
  status: string;
  printful_created_at: string; // ISO date string
  item_count: number;
}

interface PrintfulOrderSearchSelectProps {
  selectedOrderId: number | null;
  onOrderSelect: (orderId: number | null) => void;
  disabled?: boolean;
}

// Debounce utility
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
}


export function PrintfulOrderSearchSelect({
  selectedOrderId,
  onOrderSelect,
  disabled = false,
}: PrintfulOrderSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PrintfulOrderSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrderDisplay, setSelectedOrderDisplay] = useState<string | null>(null);

  const fetchPrintfulOrders = useCallback(async (currentSearchTerm: string) => {
    if (!currentSearchTerm && !selectedOrderId) { // Don't fetch if search is empty unless an order is already selected (to load its details)
        setSearchResults([]);
        return;
    }
    setIsLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        console.error("User not authenticated", sessionError);
        // Handle not authenticated error
        setIsLoading(false);
        return;
      }
      const token = sessionData.session.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/order-linking`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: "search-printful-orders",
            searchTerm: currentSearchTerm,
            limit: 20,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error fetching Printful orders: ${response.statusText}`);
      }
      const data = await response.json();
      setSearchResults(data.orders || []);
    } catch (error) {
      console.error("Failed to fetch Printful orders:", error);
      setSearchResults([]); // Clear results on error
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrderId]);

  const debouncedFetch = useCallback(debounce(fetchPrintfulOrders, 500), [fetchPrintfulOrders]);

  useEffect(() => {
    if (searchTerm.length > 0 || !selectedOrderId) { // Fetch on search term change, or if no order is selected (to allow initial empty search)
        debouncedFetch(searchTerm);
    }
  }, [searchTerm, debouncedFetch, selectedOrderId]);

  // Effect to load display for an initially selected order
   useEffect(() => {
    if (selectedOrderId && searchResults.length === 0) {
      // If an order is selected but not in current search results (e.g. initial load)
      // fetch its details to display
      const loadSelectedOrder = async () => {
        setIsLoading(true);
        try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) {
                console.error("User not authenticated for loading selected order", sessionError);
                setIsLoading(false);
                return;
            }
            const token = sessionData.session.access_token;
            const response = await fetch(
                `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/order-linking`,
                {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                    action: "search-printful-orders",
                    searchTerm: String(selectedOrderId), // Search by ID
                    limit: 1,
                }),
                }
            );
            if (!response.ok) throw new Error("Failed to fetch selected order details");
            const data = await response.json();
            if (data.orders && data.orders.length > 0) {
                const order = data.orders[0];
                setSelectedOrderDisplay(`PF ID: ${order.printful_internal_id} - ${order.recipient_name} (${order.item_count} items)`);
                // Optionally add to searchResults if not already there, or handle display separately
                if (!searchResults.find(r => r.printful_internal_id === order.printful_internal_id)) {
                    setSearchResults(prev => [order, ...prev.filter(r => r.printful_internal_id !== order.printful_internal_id)]);
                }
            } else {
                setSelectedOrderDisplay(null); // Not found
            }
        } catch (error) {
            console.error("Error loading selected Printful order:", error);
            setSelectedOrderDisplay(null);
        } finally {
            setIsLoading(false);
        }
      };
      loadSelectedOrder();
    } else if (selectedOrderId) {
        const orderInResults = searchResults.find(o => o.printful_internal_id === selectedOrderId);
        if (orderInResults) {
            setSelectedOrderDisplay(`PF ID: ${orderInResults.printful_internal_id} - ${orderInResults.recipient_name} (${orderInResults.item_count} items)`);
        } else {
            // It might have been cleared from searchResults by a new search, re-fetch if necessary or rely on initial load
            setSelectedOrderDisplay(null); // Or a placeholder like "Loading selected..."
        }
    }
    else {
        setSelectedOrderDisplay(null);
    }
  }, [selectedOrderId, searchResults]);


  const handleSelect = (order: PrintfulOrderSearchResult) => {
    onOrderSelect(order.printful_internal_id);
    setSelectedOrderDisplay(`PF ID: ${order.printful_internal_id} - ${order.recipient_name} (${order.item_count} items)`);
    setOpen(false);
    setSearchTerm(""); // Clear search term after selection
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedOrderId
            ? selectedOrderDisplay || `PF ID: ${selectedOrderId}`
            : "Select Printful Order..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}> {/* We handle filtering via API */}
          <CommandInput
            placeholder="Search Printful Order ID, Name, External ID..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            disabled={disabled}
          />
          <CommandList>
            {isLoading && <CommandEmpty>Loading...</CommandEmpty>}
            {!isLoading && searchResults.length === 0 && searchTerm && (
              <CommandEmpty>No Printful orders found.</CommandEmpty>
            )}
            {!isLoading && searchResults.length === 0 && !searchTerm && (
              <CommandEmpty>Type to search for Printful orders.</CommandEmpty>
            )}
            <CommandGroup>
              {searchResults.map((order) => (
                <CommandItem
                  key={order.printful_internal_id}
                  value={String(order.printful_internal_id)} // Value for Command's internal mechanics
                  onSelect={() => handleSelect(order)}
                  className="group aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedOrderId === order.printful_internal_id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div>
                    <div className="font-medium">PF ID: {order.printful_internal_id} ({order.printful_external_id || 'N/A'})</div>
                    <div className={cn("text-sm text-muted-foreground", "group-aria-selected:text-accent-foreground")}>
                      {order.recipient_name} - {new Date(order.printful_created_at).toLocaleDateString()} - {order.item_count} items
                    </div>
                    <div className={cn("text-xs text-muted-foreground", "group-aria-selected:text-accent-foreground")}>Status: {order.status}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}