# AI Frontend Quickstart Prompt

Copy/paste this into an AI coding agent (Cursor/Claude) when starting a new frontend project that must integrate with this backend.

## Prompt

```text
You are building a brand-new frontend for a loyalty commerce experience.

Use this backend as the single source of truth:
- Base URL: <SET_BACKEND_URL>
- Backend integration contract file: AI_FRONTEND_INTEGRATION.md

Your task:
Create a production-ready frontend app that fully integrates with the backend APIs described in AI_FRONTEND_INTEGRATION.md.

Requirements:
1) Implement authentication flow
- Login screen with membership number
- POST /api/auth/login
- Persist JWT securely
- Attach Authorization: Bearer <token> on protected calls
- Validate existing token at startup via POST /api/auth/verify
- On 401, clear session and redirect to login

2) Implement main pages
- Store page:
  - GET /api/products/categories
  - GET /api/products (category + search filtering)
- Loyalty page:
  - GET /api/loyalty/profile
  - GET /api/loyalty/transactions
  - GET /api/loyalty/promotions
  - GET /api/loyalty/vouchers
- Cart/Checkout page:
  - POST /api/loyalty/vouchers/validate
  - POST /api/loyalty/purchase
  - Re-fetch profile/vouchers/transactions after successful purchase

3) Data and state handling
- Backend is source of truth for balances, vouchers, and transactions
- Keep loading, empty, and error states for each API data source
- Preserve cart state on transient API failure
- Do not invent or rename backend fields

4) Engineering quality
- Use reusable API client layer with interceptors/middleware
- Centralized auth/session state
- Clear typed models/interfaces for API payloads
- Keep code modular and easy to theme/reskin
- Add concise README section with setup + run instructions

5) Constraints
- Follow exact request/response contracts from AI_FRONTEND_INTEGRATION.md
- Do not change backend
- Do not call Salesforce directly from frontend
- Use environment variable for API base URL

Execution instructions:
- First, output a short implementation plan.
- Then implement end-to-end.
- After implementation, run build/tests/lint.
- Finally output:
  1) what was implemented
  2) any assumptions
  3) verification steps and commands
  4) known gaps (if any)
```

## Usage Notes

- Replace `<SET_BACKEND_URL>` before running the prompt.
- Keep `AI_FRONTEND_INTEGRATION.md` in the same repository/workspace so the agent can follow exact backend contracts.
- If your target stack is known, prepend one line before the prompt, for example:
  - `Use React + Vite + TypeScript + Tailwind.`
  - `Use Next.js App Router + TypeScript.`
  - `Use Flutter web + mobile with shared API client.`
