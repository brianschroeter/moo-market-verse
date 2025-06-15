export default async function handler(req, res) {
  // This endpoint can be called manually without cron authentication
  // But we should still have some basic protection
  
  const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL || 'https://dlmbqojnhjsecajxltzj.supabase.co';
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing configuration' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Manual YouTube sync triggered...');
    
    // Call the sync functions using anon key (they have verify_jwt = false)
    const results = {};

    // 1. Full sync with forceRefresh to bypass cache
    const fullSyncResponse = await fetch(`${SUPABASE_URL}/functions/v1/sync-youtube-streams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ forceRefresh: true })
    });
    results.fullSync = await fullSyncResponse.json();

    // 2. Active sync
    const activeSyncResponse = await fetch(`${SUPABASE_URL}/functions/v1/sync-youtube-active`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    results.activeSync = await activeSyncResponse.json();

    return res.status(200).json({
      success: true,
      message: 'Manual sync completed',
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    return res.status(500).json({ 
      error: 'Manual sync failed', 
      message: error.message 
    });
  }
}