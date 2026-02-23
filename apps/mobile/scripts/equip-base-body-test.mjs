#!/usr/bin/env node
/**
 * One-off: set base_body_url for user "Test" to the first available base_body from shop_items.
 * Run: node scripts/equip-base-body-test.mjs
 * (Ensure EXPO_PUBLIC_SUPABASE_* are set, e.g. from .env)
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  // 1) Find profile for user "Test" (profiles usually use hunter_name for display name)
  const { data: allProfiles, error: listErr } = await supabase
    .from('profiles')
    .select('id, hunter_name, base_body_url');
  if (listErr) {
    console.error('Profile lookup error:', listErr.message);
    process.exit(1);
  }
  const testProfile = (allProfiles || []).find(
    p => (p.hunter_name || '').toLowerCase().trim() === 'test'
  ) || (allProfiles || []).find(
    p => (p.hunter_name || '').toLowerCase().includes('test')
  );
  if (!testProfile) {
    console.error('No profile found with hunter_name "Test". Available hunter_names (first 10):',
      (allProfiles || []).slice(0, 10).map(p => p.hunter_name || p.id));
    process.exit(1);
  }
  console.log('Found profile:', testProfile.id, 'hunter_name:', testProfile.hunter_name, 'current base_body_url:', testProfile.base_body_url || '(empty)');

  // 2) Get first base_body shop_item image_url
  const { data: baseBodies, error: shopError } = await supabase
    .from('shop_items')
    .select('id, name, image_url')
    .eq('slot', 'base_body')
    .eq('is_active', true)
    .limit(1);

  if (shopError || !baseBodies?.length) {
    console.error('No base_body shop item found:', shopError?.message || 'empty result');
    process.exit(1);
  }
  const firstBase = baseBodies[0];
  const imageUrl = firstBase.image_url;
  if (!imageUrl) {
    console.error('Base body item has no image_url:', firstBase.id);
    process.exit(1);
  }
  console.log('Using base_body:', firstBase.name, 'image_url:', imageUrl);

  // 3) Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ base_body_url: imageUrl })
    .eq('id', testProfile.id);

  if (updateError) {
    console.error('Update error:', updateError.message);
    process.exit(1);
  }
  console.log('Done. base_body_url set for user Test.');
}

main();
