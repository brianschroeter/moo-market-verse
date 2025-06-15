import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TestYouTubeEdgeFunction = () => {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testVerifyYouTube = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Environment variables:');
      console.log('import.meta.env.DEV:', import.meta.env.DEV);
      console.log('import.meta.env.VITE_DEVMODE:', import.meta.env.VITE_DEVMODE);
      console.log('Dev mode active:', import.meta.env.DEV && import.meta.env.VITE_DEVMODE === 'true');

      // Test direct fetch with dev-access-token
      if (import.meta.env.DEV && import.meta.env.VITE_DEVMODE === 'true') {
        console.log('Using dev mode with direct fetch');
        const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/verify-youtube`, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer dev-access-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            youtubeChannelId: 'test-channel-id',
            youtubeChannelName: 'Test Channel',
            youtubeAvatar: null
          })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, data: ${JSON.stringify(data)}`);
        }

        setResult({ method: 'direct fetch', data });
      } else {
        console.log('Using supabase.functions.invoke');
        // Test with supabase.functions.invoke
        const { data, error: invokeError } = await supabase.functions.invoke('verify-youtube', {
          body: {
            youtubeChannelId: 'test-channel-id',
            youtubeChannelName: 'Test Channel',
            youtubeAvatar: null
          }
        });

        if (invokeError) {
          throw invokeError;
        }

        setResult({ method: 'supabase.functions.invoke', data });
      }
    } catch (err) {
      console.error('Error calling edge function:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Test YouTube Edge Function</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p><strong>Environment:</strong></p>
            <ul className="list-disc list-inside text-sm">
              <li>import.meta.env.DEV: {String(import.meta.env.DEV)}</li>
              <li>import.meta.env.VITE_DEVMODE: {String(import.meta.env.VITE_DEVMODE)}</li>
              <li>Dev mode active: {String(import.meta.env.DEV && import.meta.env.VITE_DEVMODE === 'true')}</li>
              <li>Supabase URL: {import.meta.env.VITE_PUBLIC_SUPABASE_URL}</li>
            </ul>
          </div>

          <Button onClick={testVerifyYouTube} disabled={loading}>
            {loading ? 'Testing...' : 'Test verify-youtube Edge Function'}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-bold text-green-800">Success!</h3>
              <p className="text-sm">Method: {result.method}</p>
              <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-bold text-red-800">Error!</h3>
              <pre className="mt-2 text-xs overflow-auto">{String(error)}</pre>
              {error.stack && (
                <pre className="mt-2 text-xs overflow-auto">{error.stack}</pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestYouTubeEdgeFunction;