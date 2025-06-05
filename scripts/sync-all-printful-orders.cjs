const https = require('https');

// Support both production and local development
const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://dlmbqojnhjsecajxltzj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
    console.error('Please set the service role key for admin access to Supabase');
    console.error('You can find this in your Supabase project settings under API > service_role key');
    process.exit(1);
}

/**
 * Calls the sync-printful-orders edge function with full sync mode
 */
async function syncAllPrintfulOrders() {
    const functionUrl = `${SUPABASE_URL}/functions/v1/sync-printful-orders`;
    
    console.log('Starting full Printful orders sync...');
    console.log('Function URL:', functionUrl);
    
    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                fullSync: true,
                forceAllOrders: true 
            })
        });

        const responseText = await response.text();
        
        if (!response.ok) {
            console.error(`HTTP ${response.status}: ${response.statusText}`);
            console.error('Response body:', responseText);
            throw new Error(`Function call failed: ${response.status} ${response.statusText}`);
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse response as JSON:', parseError);
            console.error('Raw response:', responseText);
            throw new Error('Invalid JSON response from function');
        }

        console.log('Sync completed successfully!');
        console.log('Result:', result);
        
        return result;
    } catch (error) {
        console.error('Error during sync:', error.message);
        throw error;
    }
}

// Execute the sync
if (require.main === module) {
    syncAllPrintfulOrders()
        .then(() => {
            console.log('Full Printful sync completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Full Printful sync failed:', error);
            process.exit(1);
        });
}

module.exports = { syncAllPrintfulOrders };