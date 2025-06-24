import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use local Supabase instance
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createBestSellingFunction() {
  console.log('Creating get_best_selling_products function...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250623000001_add_best_selling_products_function.sql');
    const sql = await fs.readFile(migrationPath, 'utf8');

    console.log('Executing SQL:\n', sql.substring(0, 200), '...\n');

    // Execute the SQL using the Supabase client
    const { data, error } = await supabase.rpc('query', { query: sql });

    if (error && !error.message.includes('already exists')) {
      throw error;
    }

    console.log('Function created successfully!');

    // Test the function
    console.log('\nTesting the function...');
    const { data: testData, error: testError } = await supabase.rpc('get_best_selling_products', { limit_count: 6 });

    if (testError) {
      console.error('Test error:', testError);
    } else {
      console.log(`Function returned ${testData?.length || 0} products`);
      if (testData && testData.length > 0) {
        console.log('\nFirst product:', JSON.stringify(testData[0], null, 2));
      }
    }

  } catch (error) {
    console.error('Error creating function:', error);
    
    // If direct execution fails, try using psql
    console.log('\nTrying alternative approach with psql...');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250623000001_add_best_selling_products_function.sql');
      const command = `psql -h localhost -p 54322 -U postgres -d postgres -f "${migrationPath}"`;
      
      const { stdout, stderr } = await execAsync(command, { env: { ...process.env, PGPASSWORD: 'postgres' } });
      console.log('Output:', stdout);
      if (stderr) console.error('Error output:', stderr);
    } catch (psqlError) {
      console.error('PSQL error:', psqlError);
    }
  }
}

createBestSellingFunction().catch(console.error);