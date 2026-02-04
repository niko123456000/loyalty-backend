# Heroku Deployment Guide

## Prerequisites

1. **Install Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli
   ```bash
   brew tap heroku/brew && brew install heroku
   ```

2. **Login to Heroku**:
   ```bash
   heroku login
   ```

## Deployment Steps

### 1. Initialize Git Repository (if not already done)

```bash
cd /Users/nmanojlovic/AndroidStudioProjects/Loyalty/loyalty-backend
git init
git add .
git commit -m "Initial commit"
```

### 2. Create Heroku App

```bash
heroku create loyalty-backend-demo
```

This will create an app with a URL like: `https://loyalty-backend-demo-abc123.herokuapp.com`

### 3. Add Salesforce Callback URL to Connected App

Before deploying, you need to add the Heroku callback URL to your Salesforce Connected App:

1. Go to Salesforce Setup → App Manager
2. Find your Connected App
3. Edit → Add callback URL:
   ```
   https://YOUR-HEROKU-APP-NAME.herokuapp.com/oauth/callback
   ```
   (Replace YOUR-HEROKU-APP-NAME with your actual Heroku app name)

### 4. Set Environment Variables on Heroku

```bash
# Salesforce Credentials
heroku config:set SF_USERNAME=storm.27662cb4528247@salesforce.com
heroku config:set SF_PASSWORD=demo1234
heroku config:set SF_LOGIN_URL=https://storm-27662cb4528247.my.salesforce.com
heroku config:set SF_INSTANCE_URL=https://storm-27662cb4528247.my.salesforce.com

# Connected App Credentials
heroku config:set SF_CLIENT_ID=3MVG9Xl3BC6VHB.bhoZgXwec9uhjvNe.9N1AiMlGvtOqf3O2A6jrGke2TROhHGXOAlvDlHmOWUQiTBSf5IxbC
heroku config:set SF_CLIENT_SECRET=C7468AA08ED0847A25538CE5DCD7FDB901A04F012BFD8AF201F0B8DA3E30E3AF

# Loyalty Program Config
heroku config:set LOYALTY_PROGRAM_NAME="Cirrus Loyalty"
heroku config:set LOYALTY_CURRENCY_NAME="Cirrus Bucks"

# JWT Secret (IMPORTANT: Use a strong random value in production)
heroku config:set JWT_SECRET=$(openssl rand -base64 32)

# Environment
heroku config:set NODE_ENV=production
```

### 5. Deploy to Heroku

```bash
git push heroku main
```

Or if you're on master branch:
```bash
git push heroku master
```

### 6. Check Deployment Status

```bash
# View logs
heroku logs --tail

# Check if app is running
heroku ps

# Open app in browser
heroku open
```

### 7. Authorize the Backend

Once deployed, you need to authorize the backend to access Salesforce:

1. Open: `https://YOUR-APP-NAME.herokuapp.com/oauth/login`
2. Log in with your Salesforce admin credentials
3. Authorize the app
4. The backend will save the tokens

### 8. Test the API

```bash
# Get your Heroku app URL
HEROKU_URL=$(heroku info -s | grep web_url | cut -d= -f2)

# Test health endpoint
curl $HEROKU_URL/health

# Test login
curl -X POST $HEROKU_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"membershipNumber":"666"}'
```

## Update Android App to Use Heroku Backend

After successful deployment, update the Android app configuration:

1. Open `BackendConfig.kt`
2. Change `BASE_URL` to your Heroku URL:
   ```kotlin
   const val BASE_URL = "https://your-app-name.herokuapp.com"
   ```
3. Rebuild and run the app

## Troubleshooting

### Check Logs
```bash
heroku logs --tail
```

### View Environment Variables
```bash
heroku config
```

### Restart App
```bash
heroku restart
```

### Scale Up (if needed)
```bash
heroku ps:scale web=1
```

### If Authorization Fails

Make sure the callback URL is added to your Salesforce Connected App:
```
https://your-app-name.herokuapp.com/oauth/callback
```

## Security Notes

- Never commit `.env` file to git
- Use strong JWT_SECRET in production
- Consider adding rate limiting for production
- Monitor Heroku logs for suspicious activity
- Use HTTPS only (Heroku provides this by default)

## Free Tier Limitations

Heroku's free tier has some limitations:
- App sleeps after 30 minutes of inactivity (wakes on first request)
- Limited monthly dyno hours
- Limited memory (512 MB)

For production, consider upgrading to a paid dyno.
