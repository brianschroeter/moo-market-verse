export default async function handler(req, res) {
  // Allow manual trigger without auth for debugging
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL || 'https://dlmbqojnhjsecajxltzj.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
  }

  try {
    console.log('Manual trigger: Starting active streams sync...');
    
    // Sync active/upcoming streams only
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-youtube-active`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    console.log('Active sync result:', result);

    return res.status(200).json({
      success: true,
      message: 'Active streams sync completed',
      timestamp: new Date().toISOString(),
      result: result
    });

  } catch (error) {
    console.error('Active sync error:', error);
    return res.status(500).json({ 
      error: 'Active sync failed', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}