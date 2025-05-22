import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PrintfulOrderSearchSelect, PrintfulOrderSearchResult } from './PrintfulOrderSearchSelect';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit3, Link2, RefreshCw } from 'lucide-react';

type LinkType = "automatic" | "manual_system" | "manual_user_override";
type LinkStatus = "active" | "archived" | "broken_printful_deleted" | "broken_shopify_deleted" | "pending_verification";

export interface ShopifyPrintfulLink {
  id: string; // UUID
  shopify_order_id: number;
  printful_order_internal_id: number | null;
  link_type: LinkType;
  link_status: LinkStatus;
  link_timestamp: string; // TIMESTAMPTZ
  linked_by_user_id?: string | null;
  notes?: string | null;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
  // Optional: Include Printful order details if fetched together
  printful_order?: PrintfulOrderSearchResult;
}

interface ShopifyPrintfulLinkerProps {
  shopifyOrderId: number;
  // shopifyOrderGid?: string; // If needed for other operations
}

export function ShopifyPrintfulLinker({ shopifyOrderId }: ShopifyPrintfulLinkerProps) {
  const [linkedPrintfulOrders, setLinkedPrintfulOrders] = useState<ShopifyPrintfulLink[]>([]);
  const [selectedPrintfulOrderId, setSelectedPrintfulOrderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false); // To show the search select
  const [currentLinkToUpdate, setCurrentLinkToUpdate] = useState<ShopifyPrintfulLink | null>(null);

  const fetchLinkStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("User not authenticated");
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
            action: "get-link-status",
            shopify_order_id: shopifyOrderId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error fetching link status: ${response.statusText}`);
      }
      const data: ShopifyPrintfulLink[] = await response.json();
      setLinkedPrintfulOrders(data);
    } catch (err: any) {
      console.error("Failed to fetch link status:", err);
      setError(err.message || "An unknown error occurred while fetching link status.");
      setLinkedPrintfulOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [shopifyOrderId]);

  useEffect(() => {
    if (shopifyOrderId) {
      fetchLinkStatus();
    }
  }, [shopifyOrderId, fetchLinkStatus]);

  const handleApiCall = async (action: string, payload: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("User not authenticated");
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
          body: JSON.stringify({ action, ...payload }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API call failed: ${response.statusText}`);
      }
      await fetchLinkStatus(); // Refresh links
      setIsEditing(false);
      setSelectedPrintfulOrderId(null);
      setCurrentLinkToUpdate(null);
      return await response.json();
    } catch (err: any) {
      console.error(`Failed to ${action}:`, err);
      setError(err.message || `An unknown error occurred during ${action}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLink = () => {
    if (!selectedPrintfulOrderId) {
      setError("Please select a Printful order to link.");
      return;
    }
    handleApiCall("create-manual-link", {
      shopify_order_id: shopifyOrderId,
      printful_order_internal_id: selectedPrintfulOrderId,
    });
  };

  const handleUpdateLink = () => {
    if (!selectedPrintfulOrderId || !currentLinkToUpdate) {
      setError("Please select a Printful order and ensure a link is being edited.");
      return;
    }
    handleApiCall("update-link", {
      link_id: currentLinkToUpdate.id,
      new_printful_order_internal_id: selectedPrintfulOrderId,
      // Optionally add notes or status changes here if needed
    });
  };

  const handleRemoveLink = (linkId: string) => {
    if (window.confirm("Are you sure you want to remove (archive) this link?")) {
      handleApiCall("remove-link", { link_id: linkId });
    }
  };

  const openEditorForNewLink = () => {
    setCurrentLinkToUpdate(null);
    setSelectedPrintfulOrderId(null);
    setIsEditing(true);
  };

  const openEditorForExistingLink = (link: ShopifyPrintfulLink) => {
    setCurrentLinkToUpdate(link);
    setSelectedPrintfulOrderId(link.printful_order_internal_id);
    setIsEditing(true);
  };

  const getBadgeVariant = (status: LinkStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "active": return "default";
      case "archived": return "secondary";
      case "broken_printful_deleted":
      case "broken_shopify_deleted": return "destructive";
      case "pending_verification": return "outline";
      default: return "secondary";
    }
  };

  const activeLinks = useMemo(() => {
    return linkedPrintfulOrders.filter(link => link.link_status !== 'archived');
  }, [linkedPrintfulOrders]);


  if (isLoading && linkedPrintfulOrders.length === 0 && !isEditing) {
    return <p>Loading link status...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Printful Order Links
          <Button variant="ghost" size="sm" onClick={fetchLinkStatus} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Manage links between this Shopify order (ID: {shopifyOrderId}) and Printful orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {activeLinks.length > 0 && !isEditing && (
          <ul className="space-y-3">
            {activeLinks.map((link) => (
              <li key={link.id} className="p-3 border rounded-md flex justify-between items-center">
                <div>
                  <p className="font-semibold">
                    Printful Order ID: {link.printful_order_internal_id || <span className="text-muted-foreground">Not Set</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Type: {link.link_type} | Linked: {new Date(link.link_timestamp).toLocaleString()}
                  </p>
                  {link.notes && <p className="text-xs text-muted-foreground">Notes: {link.notes}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getBadgeVariant(link.link_status)}>{link.link_status}</Badge>
                  <Button variant="outline" size="icon" onClick={() => openEditorForExistingLink(link)} disabled={isLoading}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  {/* The remove button is already correctly hidden for archived links by the condition below */}
                  {link.link_status !== 'archived' && (
                    <Button variant="destructive" size="icon" onClick={() => handleRemoveLink(link.id)} disabled={isLoading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {activeLinks.length === 0 && !isEditing && !isLoading && (
          <p className="text-muted-foreground">No active Printful orders are currently linked to this Shopify order.</p>
        )}

        {isEditing && (
          <div className="space-y-4 mt-4">
            <h3 className="text-lg font-semibold">
              {currentLinkToUpdate ? `Correcting Link for PF ID: ${currentLinkToUpdate.printful_order_internal_id}` : 'Link to a New Printful Order'}
            </h3>
            <PrintfulOrderSearchSelect
              selectedOrderId={selectedPrintfulOrderId}
              onOrderSelect={setSelectedPrintfulOrderId}
              disabled={isLoading}
            />
            <div className="flex space-x-2">
              <Button onClick={currentLinkToUpdate ? handleUpdateLink : handleCreateLink} disabled={isLoading || !selectedPrintfulOrderId}>
                {isLoading ? 'Saving...' : (currentLinkToUpdate ? 'Save Correction' : 'Create Link')}
              </Button>
              <Button variant="outline" onClick={() => { setIsEditing(false); setCurrentLinkToUpdate(null); setSelectedPrintfulOrderId(null); }} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      {!isEditing && (
        <CardFooter>
          <Button onClick={openEditorForNewLink} disabled={isLoading}>
            <Link2 className="mr-2 h-4 w-4" /> Link to Printful Order
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}