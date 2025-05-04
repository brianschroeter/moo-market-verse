export const corsHeaders = {
  // IMPORTANT: In production, replace '*' with your actual frontend domain
  // e.g., 'https://your-app-domain.com'
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', // Allow common methods
}; 