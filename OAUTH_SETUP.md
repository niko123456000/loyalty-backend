# Backend OAuth Setup Guide

## Problem
The backend is failing to authenticate with error: `invalid_grant - authentication failure`

## Root Cause
The Salesforce Connected App needs to be configured to allow the OAuth 2.0 Username-Password Flow.

## Solution: Enable OAuth Password Flow in Connected App

### Step 1: Navigate to Connected App Settings

1. Log in to Salesforce as admin
2. Go to **Setup** (gear icon → Setup)
3. In Quick Find, search for **"App Manager"**
4. Find your Connected App (the one with Client ID: `3MVG9Xl3BC6VHB...`)
5. Click the dropdown arrow → **View**
6. Click **Manage Consumer Details** (you may need to verify your identity)

### Step 2: Enable OAuth Username-Password Flow

1. Click **Edit Policies** (or **Manage** → **Edit Policies**)
2. Scroll to **OAuth Policies** section
3. Find **Permitted Users** and set to: **"All users may self-authorize"** (or "Admin approved users are pre-authorized")
4. Find **IP Relaxation** and set to: **"Relax IP restrictions"**
5. **MOST IMPORTANT**: Under **Supported OAuth Scopes**, ensure these are selected:
   - `Full access (full)`
   - `Perform requests at any time (refresh_token, offline_access)`
   - `Access and manage your data (api)`

6. Click **Save**

### Step 3: Get Your Security Token (If Needed)

If you're connecting from an IP address that's not whitelisted in Salesforce:

1. Go to **Setup** → **Personal Setup** → **My Personal Information** → **Reset My Security Token**
2. Click **Reset Security Token**
3. Check your email for the security token
4. Add it to the `.env` file:
   ```
   SF_SECURITY_TOKEN=YOUR_TOKEN_HERE
   ```

### Step 4: Verify Connected App Permissions

Back in the Connected App settings:

1. Under **OAuth Policies**, confirm:
   - ✅ **Permitted Users**: "All users may self-authorize"
   - ✅ **IP Relaxation**: "Relax IP restrictions"
   - ✅ **Refresh Token Policy**: "Refresh token is valid until revoked"

2. Under **Selected OAuth Scopes**, confirm:
   - ✅ `Full access (full)` OR `Access and manage your data (api)`
   - ✅ `Perform requests at any time (refresh_token, offline_access)`

### Step 5: Alternative - Use Session-Based Authentication

If the Password Flow still doesn't work, we can use the Web Server OAuth flow (Authorization Code) instead. This is similar to what your mobile app currently uses.

Let me know if you need help with that approach.

## Testing

Once configured, restart the Node.js server and it should connect successfully:

```bash
cd /Users/nmanojlovic/AndroidStudioProjects/Loyalty/loyalty-backend
npm run dev
```

You should see:
```
✅ Connected to Salesforce via OAuth Password Flow
Instance URL: https://storm-27662cb4528247.my.salesforce.com
```

## Troubleshooting

### Still getting "invalid_grant"?

1. **Check password**: Make sure `SF_PASSWORD` in `.env` is correct
2. **Check security token**: If you have one, it must be appended to password
3. **Check Connected App**: Verify OAuth settings above
4. **Check user permissions**: Admin user must have API access
5. **Check IP restrictions**: Try adding your IP to Salesforce Network Access or use security token

### Alternative: Use Connected App with "Admin Only" OAuth

If you want more security:

1. In Connected App, set **Permitted Users** to: "Admin approved users are pre-authorized"
2. Click **Manage**
3. Click **Manage Profiles** or **Manage Permission Sets**
4. Add your admin user's profile
5. Save

This restricts OAuth to only approved users.
