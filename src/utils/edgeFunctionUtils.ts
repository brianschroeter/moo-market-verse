import { supabase } from "@/integrations/supabase/client";

/**
 * Wrapper for edge function calls that handles dev mode
 * In dev mode with VITE_DEVMODE=true, it uses direct fetch with dev-access-token
 * Otherwise, it uses the normal supabase.functions.invoke
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options?: {
    body?: Record<string, any>;
    headers?: Record<string, string>;
  }
): Promise<{ data: T | null; error: any | null }> {
  try {
    // In dev mode with VITE_DEVMODE=true, use direct fetch with dev-access-token
    if (import.meta.env.DEV && import.meta.env.VITE_DEVMODE === 'true') {
      console.log(`[invokeEdgeFunction] Using dev mode for ${functionName}`);
      
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer dev-access-token',
            'Content-Type': 'application/json',
            ...(options?.headers || {})
          },
          body: options?.body ? JSON.stringify(options.body) : undefined
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: data.error || `HTTP error! status: ${response.status}`,
            status: response.status,
            context: data
          }
        };
      }

      return { data, error: null };
    } else {
      // Use normal supabase.functions.invoke
      return await supabase.functions.invoke<T>(functionName, options);
    }
  } catch (error) {
    console.error(`[invokeEdgeFunction] Error calling ${functionName}:`, error);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : String(error),
        context: error
      }
    };
  }
}