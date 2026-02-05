# How to Check Logs for Promotions and Vouchers

## Check Heroku Logs

To check if promotions or vouchers were downloaded for a specific membership number (e.g., 666):

### Option 1: Using Heroku CLI (Recommended)

```bash
# Check recent logs for membership number 666
heroku logs --app loyalty-backend-demo --num 1000 | grep -i "666"

# Check for promotions specifically
heroku logs --app loyalty-backend-demo --num 1000 | grep -i "\[PROMOTIONS\].*666"

# Check for vouchers specifically  
heroku logs --app loyalty-backend-demo --num 1000 | grep -i "\[VOUCHERS\].*666"

# View all recent logs
heroku logs --app loyalty-backend-demo --tail
```

### Option 2: Using Heroku Dashboard

1. Go to https://dashboard.heroku.com/apps/loyalty-backend-demo
2. Click on "More" → "View logs"
3. Search for "666", "PROMOTIONS", or "VOUCHERS"

### Option 3: Query Specific Endpoints

You can also test the endpoints directly:

```bash
# First, get a token by logging in
curl -X POST https://loyalty-backend-demo-714241525c2e.herokuapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"membershipNumber": "666"}'

# Then use the token to check promotions
curl -X GET https://loyalty-backend-demo-714241525c2e.herokuapp.com/api/loyalty/promotions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Check vouchers
curl -X GET https://loyalty-backend-demo-714241525c2e.herokuapp.com/api/loyalty/vouchers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Log Format

The logs now include prefixes to make searching easier:
- `[PROMOTIONS]` - All promotion-related logs
- `[VOUCHERS]` - All voucher-related logs

Example log entries:
```
[PROMOTIONS] Fetching promotions for member: 666
[PROMOTIONS] Found 2 promotions for member 666
[PROMOTIONS] Promotion names: Summer Sale, Bonus Points

[VOUCHERS] Fetching vouchers for member: 666
[VOUCHERS] Found 1 vouchers for member 666
[VOUCHERS] Voucher codes: PERCENT10
[VOUCHERS] Voucher names: 10% Discount Voucher
```

## Troubleshooting

If no promotions/vouchers are found:
1. Check if the member is enrolled in the loyalty program
2. Verify vouchers have been issued to the member in Salesforce
3. Check if promotions are active and eligible for the member
4. Review the full error logs for API failures
