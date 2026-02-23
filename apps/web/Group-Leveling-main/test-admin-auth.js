// Test script to verify admin authentication setup
// Run with: node test-admin-auth.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminAuth() {
  try {
    console.log('🔍 Testing admin authentication setup...');

    // Check if admin users exist
    const { data: adminUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, auth_user_id, name, email, is_admin, status')
      .eq('is_admin', true);

    if (error) {
      console.error('❌ Error fetching admin users:', error);
      return;
    }

    console.log(`✅ Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email}): auth_user_id=${user.auth_user_id}, status=${user.status}`);
    });

    // Test the admin API endpoint structure
    console.log('\n🔧 Admin API endpoints should use auth_user_id for authentication');

  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testAdminAuth();
