/// <reference lib="deno.ns" />
import { serve } from "std/http/server.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts"; // Assuming a shared CORS config

// Define ENUM types based on the SQL schema
type LinkType = "automatic" | "manual_system" | "manual_user_override";
type LinkStatus =
  | "active"
  | "archived"
  | "broken_printful_deleted"
  | "broken_shopify_deleted"
  | "pending_verification";

interface ShopifyPrintfulOrderLink {
  id: string; // UUID
  shopify_order_id: number; // BIGINT
  printful_order_internal_id: number | null; // BIGINT
  link_type: LinkType;
  link_status: LinkStatus;
  link_timestamp: string; // TIMESTAMPTZ
  linked_by_user_id?: string | null; // UUID
  notes?: string | null;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

// --- Request Payload Types ---
interface BasePayload {
  action: string;
}

interface AutomaticMatchPayload extends BasePayload {
  action: "automatic-match";
  // Potentially, criteria or a batch of Shopify orders could be passed here
  // For now, we'll mock fetching Shopify orders within the function
}

interface CreateManualLinkPayload extends BasePayload {
  action: "create-manual-link";
  shopify_order_id: number;
  printful_order_internal_id: number;
  // linked_by_user_id will be extracted from JWT
}

interface GetLinkStatusPayload extends BasePayload {
  action: "get-link-status";
  shopify_order_id: number;
}

interface UpdateLinkPayload extends BasePayload {
  action: "update-link";
  link_id: string; // UUID of the link record
  new_printful_order_internal_id?: number;
  new_link_status?: LinkStatus;
  notes?: string;
  // updated_by_user_id will be extracted from JWT
}

interface RemoveLinkPayload extends BasePayload {
  action: "remove-link";
  link_id: string; // UUID of the link record
  // removed_by_user_id will be extracted from JWT (and possibly stored in notes)
}

interface SearchPrintfulOrdersPayload extends BasePayload {
  action: "search-printful-orders";
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

type OrderLinkingPayload =
  | AutomaticMatchPayload
  | CreateManualLinkPayload
  | GetLinkStatusPayload
  | UpdateLinkPayload
  | RemoveLinkPayload
  | SearchPrintfulOrdersPayload;

// --- Shopify Order Fetching for Matching ---
interface ShopifyOrderForMatching {
  shopifyNumericId: number; // Represents the ID from your shopify_orders table
  // other details if needed by the matching logic later
}

async function fetchShopifyOrdersForMatching(
  supabaseClient: SupabaseClient,
): Promise<ShopifyOrderForMatching[]> {
  console.log("Fetching Shopify orders for automatic matching...");

  // Assuming your 'shopify_orders' table has a numeric 'id' column
  // that printful_orders.printful_external_id refers to (as text).
  const { data: shopifyOrdersData, error: shopifyOrdersError } = await supabaseClient
    .from("shopify_orders")
    .select("id"); // Adjust "id" if your Shopify order ID column is named differently

  if (shopifyOrdersError) {
    console.error("Error fetching Shopify orders from database:", shopifyOrdersError);
    return [];
  }

  if (!shopifyOrdersData || shopifyOrdersData.length === 0) {
    console.log("No Shopify orders found in the database to process for matching.");
    return [];
  }

  const ordersToMatch = shopifyOrdersData.map(order => ({
    shopifyNumericId: order.id, // Ensure 'id' is the correct column name
  }));

  console.log(`Found ${ordersToMatch.length} Shopify orders to check for matching.`);
  return ordersToMatch;
}

// Helper to get user ID from JWT
const getUserIdFromJWT = (req: Request): string | null => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  try {
    const jwt = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return payload.sub || null; // 'sub' usually holds the user ID
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let supabaseClient: SupabaseClient;
  try {
    supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
  } catch (error) {
    console.error("Error creating Supabase client:", error);
    return new Response(JSON.stringify({ error: "Failed to initialize Supabase client" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = getUserIdFromJWT(req);

  let payload: OrderLinkingPayload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error("Error parsing request body:", error);
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Received action: ${payload.action} by user: ${userId || 'anonymous/service'}`);

  try {
    switch (payload.action) {
      case "automatic-match": {
        // This action might be run by a cron job, not necessarily a user
        const shopifyOrders = await fetchShopifyOrdersForMatching(supabaseClient);
        const results: Array<{ shopify_order_id: number; status: string; message?: string; link?: ShopifyPrintfulOrderLink | null; printful_order_id?: number | null }> = [];

        for (const shopifyOrder of shopifyOrders) {
          // Find Printful orders where printful_external_id matches shopifyNumericId
          // and not already linked to this specific Shopify order.
          const { data: printfulOrders, error: pfError } = await supabaseClient
            .from("printful_orders")
            .select("printful_internal_id, printful_external_id")
            .eq("printful_external_id", String(shopifyOrder.shopifyNumericId)) // Ensure type match
            // Check if not already linked (more complex query might be needed if one Shopify order can link to multiple Printful orders via external_id)
            // For simplicity, assume we link if a match is found and no 'active' link exists for this shopify_order_id and the found printful_internal_id
            // A more robust check would involve a subquery or join with shopify_printful_order_links
            // For now, we'll just attempt to insert and let unique constraint handle duplicates if any.

          if (pfError) {
            console.error(`Error fetching Printful orders for Shopify ID ${shopifyOrder.shopifyNumericId}:`, pfError);
            results.push({ shopify_order_id: shopifyOrder.shopifyNumericId, status: "error", message: pfError.message });
            continue;
          }

          if (printfulOrders && printfulOrders.length > 0) {
            for (const pfOrder of printfulOrders) {
              // Check if this specific link already exists and is active
              const { data: existingLink, error: existingLinkError } = await supabaseClient
                .from("shopify_printful_order_links")
                .select("id")
                .eq("shopify_order_id", shopifyOrder.shopifyNumericId)
                .eq("printful_order_internal_id", pfOrder.printful_internal_id)
                .eq("link_status", "active") // Only care about active links for duplication
                .maybeSingle();

              if (existingLinkError) {
                 console.error(`Error checking existing link for Shopify ID ${shopifyOrder.shopifyNumericId} and Printful ID ${pfOrder.printful_internal_id}:`, existingLinkError);
                 results.push({ shopify_order_id: shopifyOrder.shopifyNumericId, printful_order_id: pfOrder.printful_internal_id, status: "error", message: "Failed to check existing link: " + existingLinkError.message });
                 continue;
              }

              if (existingLink) {
                results.push({ shopify_order_id: shopifyOrder.shopifyNumericId, printful_order_id: pfOrder.printful_internal_id, status: "skipped", message: "Active link already exists." });
                continue;
              }

              const { data: newLink, error: insertError } = await supabaseClient
                .from("shopify_printful_order_links")
                .insert({
                  shopify_order_id: shopifyOrder.shopifyNumericId,
                  printful_order_internal_id: pfOrder.printful_internal_id,
                  link_type: "automatic",
                  link_status: "active", // Default to active
                  // linked_by_user_id is NULL for automatic
                })
                .select()
                .single();

              if (insertError) {
                console.error(`Error creating automatic link for Shopify ID ${shopifyOrder.shopifyNumericId} to Printful ID ${pfOrder.printful_internal_id}:`, insertError);
                results.push({ shopify_order_id: shopifyOrder.shopifyNumericId, printful_order_id: pfOrder.printful_internal_id, status: "error", message: insertError.message });
              } else {
                results.push({ shopify_order_id: shopifyOrder.shopifyNumericId, printful_order_id: pfOrder.printful_internal_id, status: "created", link: newLink });
              }
            }
          } else {
            results.push({ shopify_order_id: shopifyOrder.shopifyNumericId, status: "no_match", message: "No matching Printful order found based on external_id." });
          }
        }
        return new Response(JSON.stringify({ message: "Automatic matching process completed.", results }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create-manual-link": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "User authentication required." }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const params = payload as CreateManualLinkPayload;
        if (!params.shopify_order_id || !params.printful_order_internal_id) {
          return new Response(JSON.stringify({ error: "Missing shopify_order_id or printful_order_internal_id." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Optional: Check if Printful order exists
        const { data: pfOrderExists, error: pfCheckError } = await supabaseClient
          .from("printful_orders")
          .select("printful_internal_id")
          .eq("printful_internal_id", params.printful_order_internal_id)
          .maybeSingle();

        if (pfCheckError || !pfOrderExists) {
          return new Response(JSON.stringify({ error: `Printful order ID ${params.printful_order_internal_id} not found or error checking. ${pfCheckError?.message || ''}` }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Check if this exact link already exists and is active to avoid duplicates.
        // If an archived/broken link exists for the same pair, this new manual link might be intended to supersede it.
        // For now, we'll allow creating a new link; the UNIQUE constraint on (shopify_order_id, printful_order_internal_id)
        // might prevent this if not handled carefully (e.g., if old links aren't 'archived' first).
        // The schema allows multiple links for one Shopify order to *different* Printful orders.
        // The UNIQUE constraint is on the *pair*.
        // Let's assume 'manual_user_override' implies it might replace a previous link, or be a new one.
        // If a link for this pair exists, we might want to update it to 'manual_user_override' and 'active'
        // instead of inserting a new one, to avoid violating UNIQUE constraint.

        const { data: existingLink, error: existingError } = await supabaseClient
          .from("shopify_printful_order_links")
          .select("*")
          .eq("shopify_order_id", params.shopify_order_id)
          .eq("printful_order_internal_id", params.printful_order_internal_id)
          .maybeSingle();

        if (existingError) {
            console.error("Error checking for existing manual link:", existingError);
            return new Response(JSON.stringify({ error: "Database error checking for existing link." }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (existingLink) {
            // Link already exists, update it to reflect manual override
            const { data: updatedLink, error: updateError } = await supabaseClient
                .from("shopify_printful_order_links")
                .update({
                    link_type: "manual_user_override",
                    link_status: "active",
                    linked_by_user_id: userId,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existingLink.id)
                .select()
                .single();
            if (updateError) {
                console.error("Error updating existing link to manual_user_override:", updateError);
                return new Response(JSON.stringify({ error: "Failed to update existing link: " + updateError.message }), {
                    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            return new Response(JSON.stringify({ message: "Link updated to manual_user_override.", link: updatedLink }), {
                status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        } else {
            // No existing link for this pair, create a new one
            const { data: newLink, error: insertError } = await supabaseClient
                .from("shopify_printful_order_links")
                .insert({
                  shopify_order_id: params.shopify_order_id,
                  printful_order_internal_id: params.printful_order_internal_id,
                  link_type: "manual_user_override", // or 'manual_system' if an admin tool makes a non-override choice
                  link_status: "active",
                  linked_by_user_id: userId,
                })
                .select()
                .single();

            if (insertError) {
              console.error("Error creating manual link:", insertError);
              // Check for unique constraint violation (code 23505 for PostgreSQL)
              if (insertError.code === "23505") {
                 return new Response(JSON.stringify({ error: "A link between this Shopify order and Printful order already exists." }), {
                    status: 409, // Conflict
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }
              return new Response(JSON.stringify({ error: "Failed to create manual link: " + insertError.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
            return new Response(JSON.stringify({ message: "Manual link created successfully.", link: newLink }), {
              status: 201,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
      }

      case "get-link-status": {
        const params = payload as GetLinkStatusPayload;
        if (!params.shopify_order_id) {
          return new Response(JSON.stringify({ error: "Missing shopify_order_id." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // First, identify links where printful_order_internal_id IS NULL but status is not 'broken_printful_deleted'
        // This handles the ON DELETE SET NULL scenario
        const { data: brokenLinks, error: brokenCheckError } = await supabaseClient
          .from("shopify_printful_order_links")
          .select("id")
          .eq("shopify_order_id", params.shopify_order_id)
          .is("printful_order_internal_id", null)
          .not("link_status", "eq", "broken_printful_deleted");

        if (brokenCheckError) {
          console.error("Error checking for broken Printful links:", brokenCheckError);
          // Proceed, but log the error
        }

        if (brokenLinks && brokenLinks.length > 0) {
          const idsToUpdate = brokenLinks.map(link => link.id);
          const { error: updateBrokenError } = await supabaseClient
            .from("shopify_printful_order_links")
            .update({ link_status: "broken_printful_deleted", updated_at: new Date().toISOString() })
            .in("id", idsToUpdate);
          if (updateBrokenError) {
            console.error("Error updating status for broken Printful links:", updateBrokenError);
            // Proceed, but log the error
          } else {
            console.log(`Updated ${idsToUpdate.length} links to 'broken_printful_deleted' for Shopify order ${params.shopify_order_id}`);
          }
        }

        // Then, fetch all links for the Shopify order
        const { data: links, error } = await supabaseClient
          .from("shopify_printful_order_links")
          .select("id, shopify_order_id, printful_order_internal_id, link_type, link_status, link_timestamp, notes, created_at, updated_at")
          .eq("shopify_order_id", params.shopify_order_id);

        if (error) {
          console.error("Error fetching link status:", error);
          return new Response(JSON.stringify({ error: "Failed to fetch link status: " + error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(links || []), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update-link": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "User authentication required." }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const params = payload as UpdateLinkPayload;
        if (!params.link_id) {
          return new Response(JSON.stringify({ error: "Missing link_id." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const updates: Partial<ShopifyPrintfulOrderLink> & { updated_at: string, linked_by_user_id?: string } = {
          updated_at: new Date().toISOString(),
        };

        let linkTypeUpdateNeeded = false;

        if (params.new_printful_order_internal_id !== undefined) {
          // Check if the new Printful order ID exists
           const { data: pfOrderExists, error: pfCheckError } = await supabaseClient
            .from("printful_orders")
            .select("printful_internal_id")
            .eq("printful_internal_id", params.new_printful_order_internal_id)
            .maybeSingle();

          if (pfCheckError || !pfOrderExists) {
            return new Response(JSON.stringify({ error: `New Printful order ID ${params.new_printful_order_internal_id} not found or error checking. ${pfCheckError?.message || ''}` }), {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          updates.printful_order_internal_id = params.new_printful_order_internal_id;
          linkTypeUpdateNeeded = true;
        }
        if (params.new_link_status) {
          updates.link_status = params.new_link_status;
          linkTypeUpdateNeeded = true; // Changing status might also imply manual override
        }
        if (params.notes !== undefined) {
          updates.notes = params.notes;
        }
        if (linkTypeUpdateNeeded) {
            updates.link_type = "manual_user_override";
            updates.linked_by_user_id = userId; // Track who made the change
        }


        const { data: updatedLink, error } = await supabaseClient
          .from("shopify_printful_order_links")
          .update(updates)
          .eq("id", params.link_id)
          .select()
          .single();

        if (error) {
          console.error("Error updating link:", error);
           if (error.code === "23505") { // Unique constraint violation
            return new Response(JSON.stringify({ error: "Update failed: This change would create a duplicate link (Shopify Order ID + Printful Order ID pair already exists)." }), {
                status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "Failed to update link: " + error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!updatedLink) {
             return new Response(JSON.stringify({ error: "Link not found or no changes made." }), {
                status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ message: "Link updated successfully.", link: updatedLink }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "remove-link": {
        if (!userId) {
          return new Response(JSON.stringify({ error: "User authentication required." }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const params = payload as RemoveLinkPayload;
        if (!params.link_id) {
          return new Response(JSON.stringify({ error: "Missing link_id." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: archivedLink, error } = await supabaseClient
          .from("shopify_printful_order_links")
          .update({
            link_status: "archived",
            updated_at: new Date().toISOString(),
            // Consider adding removed_by_user_id to notes or a dedicated field if it existed
            notes: `Archived by user ${userId} on ${new Date().toISOString()}. Previous notes: ${(await supabaseClient.from("shopify_printful_order_links").select("notes").eq("id", params.link_id).single()).data?.notes || ''}`.trim(),
            linked_by_user_id: userId, // Record who archived it
          })
          .eq("id", params.link_id)
          .select()
          .single();

        if (error) {
          console.error("Error archiving link:", error);
          return new Response(JSON.stringify({ error: "Failed to archive link: " + error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
         if (!archivedLink) {
             return new Response(JSON.stringify({ error: "Link not found." }), {
                status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ message: "Link archived successfully.", link: archivedLink }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

case "search-printful-orders": {
        // No strict user auth needed for searching, could be open or restricted by role later if needed.
        const params = payload as SearchPrintfulOrdersPayload;
        const searchTerm = params.searchTerm?.trim() || "";
        const limit = params.limit || 20;
        const offset = params.offset || 0;

        let queryBuilder = supabaseClient
          .from("printful_orders")
          .select(
            `
            printful_internal_id,
            printful_external_id,
            recipient_name,
            status,
            printful_created_at,
            printful_order_items ( count )
          `,
            { count: "exact" },
          );

        if (searchTerm) {
          // Check if searchTerm is a number (potential ID search)
          const searchNumber = parseInt(searchTerm);
          if (!isNaN(searchNumber)) {
            queryBuilder = queryBuilder.or(
              `printful_internal_id.eq.${searchNumber},recipient_name.ilike.%${searchTerm}%,printful_external_id.ilike.%${searchTerm}%`,
            );
          } else {
            queryBuilder = queryBuilder.or(
              `recipient_name.ilike.%${searchTerm}%,printful_external_id.ilike.%${searchTerm}%`,
            );
          }
        }

        // Apply pagination and ordering after filters
        queryBuilder = queryBuilder
          .range(offset, offset + limit - 1)
          .order("printful_created_at", { ascending: false });

        const { data: orders, error, count } = await queryBuilder;

        if (error) {
          console.error("Error searching Printful orders:", error);
          return new Response(JSON.stringify({ error: "Failed to search Printful orders: " + error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const result = orders.map((o: any) => ({
          printful_internal_id: o.printful_internal_id,
          printful_external_id: o.printful_external_id,
          recipient_name: o.recipient_name,
          status: o.status,
          printful_created_at: o.printful_created_at,
          item_count: o.printful_order_items[0]?.count || 0, // Supabase returns count as an array
        }));

        return new Response(JSON.stringify({ orders: result, count }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid action specified." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (e) {
    console.error("Unhandled error in request handler:", e);
    return new Response(JSON.stringify({ error: e.message || "An unexpected error occurred." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});