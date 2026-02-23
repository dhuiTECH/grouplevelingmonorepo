#!/usr/bin/env node

/**
 * Cron job script to regenerate HP/MP for all users every minute
 * Run this with: node cron-regenerate.js
 * Or set up as a cron job: * * * * * /usr/bin/node /path/to/cron-regenerate.js
 */

const https = require('https');

const API_URL = process.env.API_URL || 'http://localhost:3005'; // Adjust port as needed
const ADMIN_SECRET = process.env.ADMIN_SECRET; // You might need to add authentication

async function regenerateAllUsers() {
  try {
    const url = `${API_URL}/api/admin/regenerate`;

    console.log(`[${new Date().toISOString()}] Starting HP/MP regeneration for all users...`);

    // Make HTTP request to the regeneration endpoint
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers if needed
        // 'Authorization': `Bearer ${ADMIN_SECRET}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[${new Date().toISOString()}] ✅ Successfully regenerated HP/MP for ${result.usersUpdated} users`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Regeneration failed:`, error.message);
  }
}

// Run regeneration immediately
regenerateAllUsers();

// If running as a standalone script (not cron), also run every minute
if (require.main === module) {
  setInterval(regenerateAllUsers, 60 * 1000); // Every 60 seconds
}

module.exports = { regenerateAllUsers };