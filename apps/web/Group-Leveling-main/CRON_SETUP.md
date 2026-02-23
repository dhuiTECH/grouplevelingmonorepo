# HP/MP Regeneration Cron Job Setup

This document explains how to set up continuous HP/MP regeneration for all users, even when they're not logged in.

## Overview

The regeneration system uses:
- Supabase RPC function `regenerate_all_hp_mp()` to regenerate HP/MP for all users
- API endpoint `/api/admin/regenerate` to trigger regeneration
- Cron script `cron-regenerate.js` to call the API every minute

## Setup Instructions

### 1. Environment Variables

Set the following environment variable if needed:
```bash
export API_URL="http://your-domain.com"  # or http://localhost:3005 for local development
```

### 2. Manual Testing

Test the regeneration system:
```bash
# Test the API endpoint directly
curl -X POST http://localhost:3005/api/admin/regenerate

# Test the cron script
node cron-regenerate.js
```

### 3. Set Up Cron Job

#### On Linux/Mac:
```bash
# Edit crontab
crontab -e

# Add this line to run every minute:
* * * * * /usr/bin/node /path/to/your/project/cron-regenerate.js >> /path/to/logs/cron-regenerate.log 2>&1
```

#### On Windows (using Task Scheduler):
1. Open Task Scheduler
2. Create a new task
3. Set trigger to run every minute
4. Set action to run: `node C:\path\to\your\project\cron-regenerate.js`

### 4. Alternative: Vercel Cron Jobs (if deployed on Vercel)

If your app is deployed on Vercel, add this to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/admin/regenerate",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 5. Alternative: Supabase Edge Functions

You can also create a Supabase Edge Function that runs on a schedule:
```typescript
// supabase/functions/regenerate/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('regenerate_all_hp_mp')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, usersUpdated: data }))
})
```

Then configure it to run every minute in Supabase dashboard.

## Verification

Check that regeneration is working:

1. Log in as a user and damage their HP/MP
2. Log out
3. Wait 1-2 minutes
4. Check the database - HP/MP should be regenerating
5. Or check the cron logs for success messages

## Troubleshooting

- Make sure the app is running and accessible at the API_URL
- Check that the `regenerate_all_hp_mp` RPC function exists in Supabase
- Verify database permissions for the regeneration function
- Check server logs for any errors