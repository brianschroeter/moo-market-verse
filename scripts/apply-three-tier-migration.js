const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || 'https://dlmbqojnhjsecajxltzj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = 'B445478e84Fknsd312s';

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.log('Please run: export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying three-tier YouTube sync migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250615103204_three_tier_youtube_sync.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      // Skip comment-only lines
      if (statement.trim().startsWith('--')) continue;
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          // Try direct execution if RPC fails
          console.warn(`RPC failed, statement ${i + 1} may need manual execution:`, error.message);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.warn(`⚠️  Statement ${i + 1} needs manual execution:`, err.message);
      }
    }

    console.log('\n📊 Verifying cron jobs...\n');

    // Check if cron jobs exist
    const { data: cronJobs, error: cronError } = await supabase
      .from('cron.job')
      .select('*')
      .like('jobname', 'youtube-%sync');

    if (cronJobs && cronJobs.length > 0) {
      console.log('✅ Found YouTube sync cron jobs:');
      cronJobs.forEach(job => {
        console.log(`   - ${job.jobname}: ${job.schedule}`);
      });
    } else {
      console.log('⚠️  No cron jobs found. You may need to run the migration manually in the Supabase dashboard.');
    }

    console.log('\n✨ Migration process complete!');
    console.log('\nNext steps:');
    console.log('1. Check https://supabase.com/dashboard/project/dlmbqojnhjsecajxltzj/sql/new');
    console.log('2. Run any statements that failed above');
    console.log('3. Monitor cron_history table for sync activity');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative: Direct connection info for manual execution
console.log('📝 Database connection info for manual migration:\n');
console.log('Host: aws-0-us-east-2.pooler.supabase.com');
console.log('Port: 6543');
console.log('Database: postgres');
console.log('User: postgres.dlmbqojnhjsecajxltzj');
console.log('Password: [provided]');
console.log('\nMigration file: supabase/migrations/20250615103204_three_tier_youtube_sync.sql\n');

// Note about the migration
console.log('⚠️  Note: This script attempts to apply the migration but pg_cron functions');
console.log('may need to be run directly in the Supabase SQL editor.\n');

// Don't run automatically - too risky
console.log('Since direct SQL execution requires special permissions, please:');
console.log('1. Go to https://supabase.com/dashboard/project/dlmbqojnhjsecajxltzj/sql/new');
console.log('2. Copy the contents of supabase/migrations/20250615103204_three_tier_youtube_sync.sql');
console.log('3. Paste and run in the SQL editor');
console.log('\nThis ensures the cron schedules are properly set up with the correct permissions.');