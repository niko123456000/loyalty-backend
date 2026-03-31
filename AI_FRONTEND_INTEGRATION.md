# AI Frontend Integration Guide

This document is for an AI coding agent building a brand-new frontend against this backend.

Goal: build a working frontend experience without changing backend behavior.

## 1) Backend Base URL and Auth Model

- Base URL: `https://<backend-host>`
- Authentication model:
  - Frontend logs in with membership number.
  - Backend returns a JWT token.
  - Frontend sends `Authorization: Bearer <token>` for all protected endpoints.
- JWT lifetime is currently 24h.

## 2) Required Frontend Flow (Do This In Order)

1. Build login screen.
2. Call `POST /api/auth/login`.
3. Store returned `token` securely (web: localStorage/sessionStorage; mobile: secure storage).
4. Attach `Authorization` header on protected routes.
5. On `401`, clear token and return user to login.
6. Build app pages using protected endpoints:
   - Profile/Loyalty
   - Store/Products
   - Cart/Checkout
   - Promotions
   - Vouchers

## 3) Endpoint Contract (Frontend-Facing)

## Public Auth Endpoints

### POST `/api/auth/login`
Request:
```json
{
  "membershipNumber": "666"
}
```

Success response:
```json
{
  "token": "<jwt>",
  "member": {
    "id": "0lM...",
    "membershipNumber": "666",
    "name": "Member Name",
    "email": "member@example.com",
    "status": "Active",
    "enrollmentDate": "2026-01-01",
    "programName": "Cirrus Loyalty"
  }
}
```

Failure:
- `400` missing membership number
- `404` member not found
- `403` member not active
- `503` Salesforce disconnected

### POST `/api/auth/signup`
Request:
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "membershipNumber": "12345"
}
```

Success:
- `201` with `{ token, member, message }`

### POST `/api/auth/verify`
Headers: `Authorization: Bearer <jwt>`

Response:
```json
{
  "valid": true,
  "memberId": "0lM..."
}
```

Use this at app startup to validate cached session.

---

## Protected Endpoints (Require JWT)

### GET `/api/products/categories`
Response:
```json
{
  "categories": ["Accommodation", "Dining", "Experiences", "Retail"]
}
```

### GET `/api/products`
Query params (optional):
- `category`
- `search`

Response:
```json
{
  "products": [
    {
      "id": "acc-1",
      "name": "The Darling Hotel",
      "description": "...",
      "price": 450,
      "category": "Accommodation",
      "imageUrl": "data:image/svg+xml;base64,...",
      "inStock": true
    }
  ],
  "total": 1,
  "categories": ["Accommodation", "Dining", "Experiences", "Retail"]
}
```

### GET `/api/products/:id`
Response: one product object.

### GET `/api/loyalty/profile`
Response (shape may contain additional fields):
```json
{
  "memberId": "0lM...",
  "membershipNumber": "666",
  "memberStatus": "Active",
  "enrollmentDate": "2026-01-01",
  "contactId": "003...",
  "programId": "0lN...",
  "pointsBalance": 14834.27,
  "coinsBalance": 960,
  "lastAccrualDate": "2026-03-29T22:22:35.000+0000",
  "tier": {
    "name": "Gold Tier",
    "level": 3,
    "expirationDate": null
  },
  "email": "member@example.com",
  "phone": null,
  "name": "Member Name"
}
```

### GET `/api/loyalty/transactions?limit=10`
Response: array of transaction journals with backend-enhanced fields:
- `pointsEarned`
- `coinsEarned`

### GET `/api/loyalty/promotions`
Response:
```json
{
  "promotions": [ ... ],
  "total": 0
}
```

### GET `/api/loyalty/vouchers`
Response:
```json
{
  "vouchers": [
    {
      "id": "0v...",
      "code": "BUCKSXXXXFREE",
      "name": "Free Bucks",
      "description": "...",
      "discountAmount": 100,
      "discountPercentage": null,
      "discountType": "FIXED_AMOUNT",
      "expiryDate": "2026-12-31",
      "status": "AVAILABLE",
      "minimumPurchase": 0
    }
  ],
  "total": 1
}
```

### POST `/api/loyalty/vouchers/validate`
Request:
```json
{
  "voucherCode": "BUCKSXXXXFREE",
  "cartTotal": 500
}
```

Response:
```json
{
  "valid": true,
  "voucher": { "...": "..." },
  "discountAmount": 100
}
```

### POST `/api/loyalty/purchase`
Request:
```json
{
  "lineItems": [
    { "productName": "The Darling Hotel", "price": 450, "quantity": 1 }
  ],
  "voucherCode": "BUCKSXXXXFREE",
  "promotionId": null
}
```

Response:
```json
{
  "success": true,
  "message": "Purchase processed and voucher redeemed successfully",
  "voucherRedeemed": true,
  "pointsEarned": 450,
  "coinsEarned": 450,
  "result": { "...": "..." }
}
```

## 4) Frontend State Rules

- Always treat backend as source of truth for:
  - profile balances
  - vouchers
  - transaction history
- Re-fetch profile + vouchers + transactions after successful checkout.
- Voucher flow:
  1. validate voucher
  2. apply client-side discount preview
  3. pass `voucherCode` again during purchase
- If purchase fails, do not mutate cart permanently.

## 5) Error Handling Contract

- `401`: token invalid/expired -> logout + go to login
- `403`: authenticated but not allowed (inactive member)
- `404`: missing member or resource
- `503`: Salesforce backend unavailable
- Any `5xx`: show retry UX and preserve user context

## 6) CORS and Environment

- Backend currently allows broad CORS (`origin: true`) and credentials.
- For production frontend, set `VITE_API_BASE_URL` (or equivalent) to backend host.
- Do not call Salesforce directly from frontend.

## 7) Health + Ops Endpoints (for Setup UIs and Agents)

- `GET /health`
  - includes `salesforce` status and OAuth helper URLs
- `GET /auth/storage-status`
  - reports whether auth persistence is production-grade
  - expected production state:
    - Redis mode: `redis`
    - Postgres mode: `postgres`
    - `productionReady: true`

## 8) Minimal Frontend Implementation Checklist

- [ ] Login screen with membership number
- [ ] JWT storage and auth context/provider
- [ ] API client with bearer token interceptor
- [ ] 401 interceptor -> clear session and redirect login
- [ ] Store page (`/products`, `/products/categories`)
- [ ] Loyalty page (`/loyalty/profile`, `/loyalty/transactions`, `/loyalty/vouchers`)
- [ ] Voucher validation + checkout (`/loyalty/vouchers/validate`, `/loyalty/purchase`)
- [ ] Loading, empty, and error states for each data source

## 9) Important: Do Not Change These Backend Expectations

- Keep `Authorization: Bearer <token>` format.
- Keep request field names exactly:
  - `membershipNumber`
  - `lineItems[]` with `productName`, `price`, `quantity`
  - `voucherCode`, `cartTotal`
- Keep token verification via `/api/auth/verify`.

If you need additional frontend data, prefer deriving from existing payloads before proposing backend schema changes.
