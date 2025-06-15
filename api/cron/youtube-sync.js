export default async function handler(req, res) {
  // Verify this is a Vercel Cron job
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL || 'https://dlmbqojnhjsecajxltzj.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });
  }

  try {
    console.log('Starting YouTube sync cron job...');
    
    // 1. Full sync (all channels, 10-day window)
    const fullSyncResponse = await fetch(`${SUPABASE_URL}/functions/v1/sync-youtube-streams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const fullSyncResult = await fullSyncResponse.json();
    console.log('Full sync result:', fullSyncResult);

    // 2. Today's schedule sync
    const todaySyncResponse = await fetch(`${SUPABASE_URL}/functions/v1/sync-youtube-today`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const todaySyncResult = await todaySyncResponse.json();
    console.log('Today sync result:', todaySyncResult);

    // 3. Refresh avatars
    const avatarResponse = await fetch(`${SUPABASE_URL}/functions/v1/refresh-youtube-avatars`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const avatarResult = await avatarResponse.json();
    console.log('Avatar refresh result:', avatarResult);

    return res.status(200).json({
      success: true,
      message: 'YouTube sync completed',
      results: {
        fullSync: fullSyncResult,
        todaySync: todaySyncResult,
        avatarRefresh: avatarResult
      }
    });

  } catch (error) {
    console.error('YouTube sync error:', error);
    return res.status(500).json({ 
      error: 'Sync failed', 
      message: error.message 
    });
  }
}