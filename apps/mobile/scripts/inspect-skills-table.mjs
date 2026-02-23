#!/usr/bin/env node
/**
 * One-off script to inspect the skills table schema and sample rows.
 * Run: node scripts/inspect-skills-table.mjs
 * Uses EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from .env
 */
import { createClient } from '@supabase/supabase-js';
// Load .env manually if needed: run with: export $(grep -v '^#' .env | xargs) && node scripts/inspect-skills-table.mjs
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);
const { data: rows, error } = await supabase.from('skills').select('*').limit(5);

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

console.log('=== skills table: column names (from first row) ===');
if (rows?.length) {
  console.log(Object.keys(rows[0]).sort().join(', '));
  console.log('\n=== sample row (first) ===');
  console.log(JSON.stringify(rows[0], null, 2));
  console.log('\n=== distinct class-like values (class_key, class, character_class) in first 50 rows ===');
  const { data: more } = await supabase.from('skills').select('*').limit(50);
  const classes = new Set();
  for (const r of more || []) {
    if (r.class_key != null) classes.add('class_key=' + r.class_key);
    if (r.class != null) classes.add('class=' + r.class);
    if (r.character_class != null) classes.add('character_class=' + r.character_class);
  }
  console.log([...classes].join(', ') || '(none of class_key, class, character_class present)');
} else {
  console.log('(no rows)');
}
