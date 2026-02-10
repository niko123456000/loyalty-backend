# Loyalty Backend Service

Backend proxy service for the Salesforce Loyalty Management mobile app. This service handles authentication, API proxying, and business logic between the mobile app and Salesforce.

## Architecture

```
Mobile App → Backend API → Salesforce
```

- **Mobile App**: Users log in with their membership number
- **Backend**: Authenticates to Salesforce with admin credentials, provides REST API
- **Salesforce**: Loyalty data source

## Features

- ✅ Membership number authentication (no Salesforce credentials in app)
- ✅ JWT token-based sessions
- ✅ Automatic Salesforce connection management
- ✅ Loyalty profile and points balance retrieval
- ✅ Transaction processing and point accrual
- ✅ Product catalog API
- ✅ Transaction history

## Setup

### 1. Install Dependencies

```bash
cd loyalty-backend
npm install
```

### 2. Configure Environment

Edit `.env` file with your Salesforce credentials:

```env
SF_USERNAME=your-salesforce-username
SF_PASSWORD=your-salesforce-password
SF_LOGIN_URL=https://your-domain.my.salesforce.com
LOYALTY_PROGRAM_NAME=The Star Club
JWT_SECRET=change-this-to-a-random-secret-key
PORT=3000
```

### 3. Start Server

```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:3000`

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Login with membership number

**Request:**
```json
{
  "membershipNumber": "666"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "member": {
    "id": "0lM...",
    "membershipNumber": "666",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "Active",
    "enrollmentDate": "2024-01-01",
    "programName": "The Star Club"
  }
}
```

#### POST `/api/auth/verify`
Verify token is valid

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "memberId": "0lM..."
}
```

### Loyalty

All loyalty endpoints require `Authorization: Bearer <token>` header.

#### GET `/api/loyalty/profile`
Get member's loyalty profile with points balance

**Response:**
```json
{
  "memberId": "0lM...",
  "membershipNumber": "666",
  "memberStatus": "Active",
  "enrollmentDate": "2024-01-01",
  "pointsBalance": 100.00,
  "lastAccrualDate": "2024-02-04T12:00:00Z",
  "tier": {
    "name": "Gold",
    "level": 2,
    "expirationDate": "2025-01-01"
  }
}
```

#### GET `/api/loyalty/transactions?limit=10`
Get member's recent transactions

**Response:**
```json
[
  {
    "Id": "0lJ...",
    "ActivityDate": "2024-02-04T12:00:00Z",
    "TransactionAmount": 199.99,
    "Status": "Processed",
    "JournalType": { "Name": "Accrual" },
    "JournalSubType": { "Name": "Purchase" }
  }
]
```

#### POST `/api/loyalty/purchase`
Process a purchase and award points

**Request:**
```json
{
  "lineItems": [
    {
      "productName": "Premium Coffee",
      "price": 24.99,
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase processed successfully",
  "result": [
    {
      "transactionJournalId": "0lJ...",
      "status": "Success",
      "message": "Transaction created and points awarded"
    }
  ]
}
```

### Products

#### GET `/api/products?category=Beverages&search=coffee`
Get all products with optional filters

**Response:**
```json
{
  "products": [
    {
      "id": "1",
      "name": "Premium Coffee",
      "description": "Artisan roasted coffee beans",
      "price": 24.99,
      "category": "Beverages",
      "imageUrl": "https://..."
    }
  ],
  "total": 1
}
```

#### GET `/api/products/:id`
Get a specific product

**Response:**
```json
{
  "id": "1",
  "name": "Premium Coffee",
  "description": "Artisan roasted coffee beans",
  "price": 24.99,
  "category": "Beverages",
  "imageUrl": "https://..."
}
```

### Health Check

#### GET `/health`
Check if server is running

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-02-04T12:00:00Z",
  "salesforce": "connected"
}
```

## Security

- Admin Salesforce credentials stored only on backend (never exposed to mobile app)
- JWT tokens for customer sessions (24-hour expiration)
- CORS enabled for mobile app requests
- All sensitive operations require authentication

## Error Handling

All errors return JSON with the following format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `400`: Bad request (missing required fields)
- `401`: Unauthorized (invalid/expired token)
- `403`: Forbidden (inactive member account)
- `404`: Not found (member/product not found)
- `500`: Server error

## Development

### Add New Endpoints

1. Create route file in `routes/`
2. Add business logic in `services/salesforce.js`
3. Register route in `server.js`

### Testing

```bash
# Test health check
curl http://localhost:3000/health

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"membershipNumber":"666"}'

# Test profile (replace TOKEN)
curl http://localhost:3000/api/loyalty/profile \
  -H "Authorization: Bearer TOKEN"
```

## Production Deployment

### Heroku Deployment

1. **Create Heroku App**:
   ```bash
   heroku create the-star-backend
   ```

2. **Set Environment Variables**:
   ```bash
   heroku config:set SF_USERNAME=your-username
   heroku config:set SF_PASSWORD=your-password
   heroku config:set SF_LOGIN_URL=https://your-domain.my.salesforce.com
   heroku config:set SF_CLIENT_ID=your-client-id
   heroku config:set SF_CLIENT_SECRET=your-client-secret
   heroku config:set LOYALTY_PROGRAM_NAME="The Star Club"
   heroku config:set JWT_SECRET=$(openssl rand -base64 32)
   heroku config:set NODE_ENV=production
   ```

3. **Add Callback URL to Salesforce Connected App**:
   - Add `https://your-app-name.herokuapp.com/oauth/callback` to Connected App callback URLs

4. **Deploy**:
   ```bash
   git push heroku main
   ```

5. **Authorize Backend**:
   - Visit `https://your-app-name.herokuapp.com/oauth/login`
   - Log in with Salesforce credentials

### Checking Logs

View Heroku logs:
```bash
heroku logs --tail --app the-star-backend
```

Search for specific member:
```bash
heroku logs --app the-star-backend --num 1000 | grep -i "666"
```

Log prefixes for easier searching:
- `[PROMOTIONS]` - Promotion-related logs
- `[VOUCHERS]` - Voucher-related logs
- `[TRANSACTION]` - Transaction processing logs
- `[COINS]` - Casino Dollars logs
- `[MEMBER]` - Member profile logs
- `[TIER]` - Tier-related logs

### General Production Checklist

1. Set strong `JWT_SECRET` value
2. Use environment variables (don't commit `.env`)
3. Enable HTTPS
4. Set `NODE_ENV=production`
5. Use a process manager (PM2, systemd)
6. Set up logging and monitoring
7. Configure firewall rules
8. Use a reverse proxy (nginx, Apache)

## Next Steps

To connect the Android app to this backend:
1. Update Android app to remove direct Salesforce OAuth
2. Add backend API service layer
3. Implement membership number login UI
4. Store JWT token instead of Salesforce tokens
5. Update all API calls to use backend endpoints
