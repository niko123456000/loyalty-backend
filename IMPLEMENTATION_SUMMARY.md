# Loyalty Store - Implementation Summary

## Overview for AI Agents

This document provides specific bug fixes and implementation patterns for building a loyalty store (web + Android) integrated with the backend at `https://tstar-backend-929231-09db75fda58c.herokuapp.com`. 

**CRITICAL:** When implementing a loyalty store, you MUST apply all fixes listed in the "Critical Bug Fixes" section below. These are not optional - they solve known issues that will break the application.

**Product Theming:** Backend products must be remapped to brand-specific merchandise. Create a complete mapping utility covering ALL backend products.

**Voucher Filtering:** Backend returns expired vouchers - you MUST filter them on the frontend using date comparison.

**Version Compatibility (Android):** You MUST use the exact version matrix specified for Compose compatibility.

---

## Web Application Updates

### 1. Product Theming (Complete Remapping)
**File:** `src/utils/productThemes.ts`

Mapped **ALL** backend products to branded merchandise:
- **Accommodation** → Jerseys & Apparel (Home, Away, Special Editions, Retro)
- **Dining** → Training Wear (Hoodies, Jackets, Pants, Shorts, Polos, Pullovers, T-Shirts)
- **Experiences** → Accessories (Supporters Packs, Signed Items, Backpacks, Scarves, Caps, Mugs, Gym Bags, Beanies, Heritage Collections)
- **Retail** → Premium Merchandise (Watches, Clocks, Gift Cards, Electronics, Bottles, Bags, Phone Cases, Sunglasses, Photos, Wallets)

### 2. Voucher Functionality Enhancement
**Files:** `src/pages/Loyalty.tsx`, `src/pages/Cart.tsx`, `src/App.tsx`

**Added:**
- Copy voucher code button
- "Apply to Cart" button on voucher cards - navigates to cart with code pre-filled
- Auto-apply voucher when navigating from Loyalty page
- Discount amount display on vouchers
- Visual improvements with icons and hover effects
- Expired voucher filtering (only show active vouchers where `expiryDate > now` and `status === 'AVAILABLE'`)
- "Expiring Soon" badges for vouchers within 7 days

**Fixed:**
- Apply button using `useCallback` to prevent stale closures
- Error state handling
- Discount calculation in cart total

### 3. Visual Enhancements
**Files:** Multiple page components

**Added:**
- Hero banners with background imagery on all pages
- Enhanced product cards with larger images, gradient overlays, stock indicators
- Improved loyalty dashboard cards with gradients and icon overlays
- Better cart item display with larger images and descriptions
- Enhanced voucher input styling
- Background images on hero sections (stadium, sports imagery)

### 4. Technology Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- Context API (Auth, Cart)
- Backend: `https://tstar-backend-929231-09db75fda58c.herokuapp.com`

---

## Android Application (New)

### 1. Project Structure
**Location:** `/[brand]-android-app/`

```
app/src/main/java/com/[brand]/loyalty/
├── MainActivity.kt
├── data/
│   ├── api/
│   │   ├── LoyaltyApi.kt
│   │   └── ApiClient.kt
│   └── model/
│       └── Models.kt
├── ui/
│   ├── screens/
│   │   ├── LoginScreen.kt
│   │   ├── StoreScreen.kt
│   │   ├── CartScreen.kt
│   │   └── LoyaltyScreen.kt
│   └── theme/
│       ├── Color.kt
│       ├── Theme.kt
│       └── Type.kt
├── viewmodel/
│   └── LoyaltyViewModel.kt
└── utils/
    └── ProductTheming.kt
```

### 2. Technology Stack
- Kotlin
- Jetpack Compose + Material3
- Retrofit + OkHttp (networking)
- Coil (image loading)
- Coroutines + Flow (async)
- ViewModel (MVVM architecture)
- Navigation Compose

### 3. Key Features Implemented
- JWT authentication with token management
- Product catalog with category filtering
- Shopping cart with quantity controls
- Voucher validation and redemption
- Loyalty dashboard (points, tier, transactions)
- Product theming (same mapping as web)
- Expired voucher filtering
- Bottom navigation bar with cart badge

### 4. Configuration Fixes
**build.gradle.kts:**
- Kotlin: 1.9.22
- Compose Compiler: 1.5.10
- Compose BOM: 2024.02.00
- Android Gradle Plugin: 8.2.0

**settings.gradle.kts:**
- Added proper plugin management with Google and Maven repos

### 5. Navigation System
**File:** `MainActivity.kt`

Added Material3 Bottom Navigation Bar:
- Store tab (home icon)
- Cart tab (cart icon with badge showing item count)
- Account tab (person icon)
- State preservation on navigation
- Active tab highlighting

---

## Backend Configuration

**API Base URL:** `https://tstar-backend-929231-09db75fda58c.herokuapp.com`

**Test Account:**
- Membership Number: `666`

**Authentication:**
- Login endpoint: `POST /api/auth/login`
- Send: `{ "membershipNumber": "666" }`
- Receive JWT token
- Use as Bearer token: `Authorization: Bearer {token}`

**Voucher Codes:**
- Fetch from: `GET /api/loyalty/vouchers` (requires auth)
- Validate with: `POST /api/loyalty/vouchers/validate`

---

## File Locations

### Web App
- Repository root: `/[brand]-loyalty/`
- Product theming: `src/utils/productThemes.ts`
- API client: `src/api/client.ts`
- Contexts: `src/context/`
- Pages: `src/pages/`
- Components: `src/components/`

### Android App
- Repository root: `/[brand]-android-app/`
- Package: `com.[brand].loyalty`
- Product theming: `app/src/main/java/com/[brand]/loyalty/utils/ProductTheming.kt`
- API client: `app/src/main/java/com/[brand]/loyalty/data/api/ApiClient.kt`
- API interface: `app/src/main/java/com/[brand]/loyalty/data/api/LoyaltyApi.kt`
- Models: `app/src/main/java/com/[brand]/loyalty/data/model/Models.kt`
- Screens: `app/src/main/java/com/[brand]/loyalty/ui/screens/`
  - `LoginScreen.kt`
  - `StoreScreen.kt`
  - `CartScreen.kt`
  - `LoyaltyScreen.kt`
- ViewModel: `app/src/main/java/com/[brand]/loyalty/viewmodel/LoyaltyViewModel.kt`
- MainActivity: `app/src/main/java/com/[brand]/loyalty/MainActivity.kt`
- Theme files: `app/src/main/java/com/[brand]/loyalty/ui/theme/`
  - `Color.kt`
  - `Theme.kt`
  - `Type.kt`

---

## Implementation Checklist for AI Agents

When building this app, follow this exact sequence:

### Web App Setup
1. Create React + Vite + TypeScript project
2. Install: `tailwindcss`, `react-router-dom`
3. **IMMEDIATELY** create `src/utils/productThemes.ts` with complete product mapping
4. Create contexts: `AuthContext.tsx`, `CartContext.tsx`
5. Implement API client with Bearer token auth in `src/api/client.ts`
6. Create pages: Login, Store, Loyalty, Cart
7. **CRITICAL:** Apply voucher fixes from bug fix section
8. **CRITICAL:** Apply expired voucher filtering in Loyalty page
9. Add auto-apply voucher flow between Loyalty → Cart pages

### Android App Setup
1. Create new Android project with Empty Activity (Compose)
2. **FIRST STEP:** Configure `settings.gradle.kts` with plugin management (see bug fix #1)
3. **SECOND STEP:** Set exact versions in `build.gradle.kts`:
   - Kotlin: 1.9.22
   - Compose Compiler: 1.5.10
   - Compose BOM: 2024.02.00
4. **THIRD STEP:** Fix Compose dependency notation (use dots not colons)
5. Create package structure under `com.[brand].loyalty`
6. Implement API client with Retrofit + OkHttp
7. Create all data models matching API responses
8. Create ViewModel with StateFlow for reactive state
9. **CRITICAL:** Apply voucher filtering in ViewModel
10. Create all screens (Login, Store, Cart, Loyalty)
11. **CRITICAL:** Implement bottom navigation in MainActivity

---

## Critical Bug Fixes & Implementation Notes

### Web App - Required Fixes

#### 1. Voucher Apply Button Not Working
**Problem:** Apply button click has no effect due to stale closure in event handler.
**Solution:** Wrap handler in `useCallback` with proper dependencies.
```typescript
// src/pages/Cart.tsx
const handleApplyVoucher = useCallback(async (code?: string) => {
  const codeToApply = code || voucherCode;
  if (!codeToApply) {
    setVoucherError('Please enter a voucher code');
    return;
  }
  // validation logic
}, [voucherCode, total]); // Add all dependencies
```

#### 2. Expired Vouchers Displaying
**Problem:** Backend returns all vouchers regardless of expiry date.
**Solution:** Filter on frontend before displaying.
```typescript
// src/pages/Loyalty.tsx
const now = new Date();
const activeVouchers = vouchersData.vouchers.filter(voucher => {
  const expiryDate = new Date(voucher.expiryDate);
  return expiryDate > now && voucher.status === 'AVAILABLE';
});
```

#### 3. Discount Not Applied to Cart Total
**Problem:** Discount state not properly integrated into total calculation.
**Solution:** Apply discount in total calculation and update state management.
```typescript
// src/pages/Cart.tsx
const finalTotal = discount > 0 ? Math.max(0, total - discount) : total;
```

#### 4. Product Theming Incomplete
**Problem:** Backend products don't match brand merchandise.
**Solution:** Create complete mapping in `src/utils/productThemes.ts` covering ALL products.
```typescript
const PRODUCT_THEME_MAP: Record<string, ProductTheme> = {
  'Backend Product Name': {
    name: 'Branded Product Name',
    description: 'Brand-specific description',
    image: 'image-url'
  }
  // Map ALL backend products
};
```

### Android App - Required Fixes

#### 1. Gradle Plugin Not Found Error
**Problem:** `Plugin [id: 'com.android.application'] was not found`
**Solution:** Add plugin management to `settings.gradle.kts`:
```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
```

#### 2. Compose Dependency Resolution Error
**Problem:** `Could not find androidx.compose:ui:ui-tooling`
**Solution:** Fix artifact notation in `build.gradle.kts`:
```kotlin
// WRONG:
implementation("androidx.compose:ui:ui-tooling")

// CORRECT:
implementation("androidx.compose.ui:ui-tooling")
```

#### 3. CircularProgressIndicator NoSuchMethodError Crash
**Problem:** Version incompatibility causing runtime crash on login screen.
**Solution:** Use compatible version matrix in `build.gradle.kts`:
```kotlin
// Critical version compatibility:
kotlin("android") version "1.9.22"

composeOptions {
    kotlinCompilerExtensionVersion = "1.5.10"
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)
}
```

#### 4. Expired Vouchers Displaying (Android)
**Problem:** Same as web - backend returns all vouchers.
**Solution:** Filter in ViewModel before updating state:
```kotlin
// viewmodel/LoyaltyViewModel.kt
val now = Date()
val activeVouchers = vouchersResponse.vouchers.filter { voucher ->
    val expiryDate = parseDate(voucher.expiryDate)
    expiryDate.after(now) && voucher.status == "AVAILABLE"
}
_vouchers.value = activeVouchers
```

#### 5. Missing Bottom Navigation
**Problem:** No intuitive way to navigate between screens.
**Solution:** Implement Material3 NavigationBar in `MainActivity.kt`:
```kotlin
sealed class Screen(val route: String, val title: String, val icon: ImageVector)

NavigationBar {
    screens.forEach { screen ->
        NavigationBarItem(
            selected = currentRoute == screen.route,
            onClick = { navController.navigate(screen.route) },
            icon = { 
                if (screen == Screen.Cart) {
                    BadgedBox(badge = { Badge { Text("$cartCount") } }) {
                        Icon(screen.icon, screen.title)
                    }
                } else {
                    Icon(screen.icon, screen.title)
                }
            }
        )
    }
}
```

---

## Deployment Notes

### Web App
```bash
npm install
npm run dev    # Development
npm run build  # Production
```

### Android App
```bash
# In Android Studio:
Build → Clean Project
Build → Rebuild Project
Run ▶️
```

**Minimum Requirements:**
- Android 7.0 (API 24+)
- 50MB storage
- Internet connection

---

## API Endpoints Used

All endpoints from backend:
- `POST /api/auth/login`
- `GET /api/products`
- `GET /api/products/categories`
- `GET /api/loyalty/profile`
- `GET /api/loyalty/transactions`
- `GET /api/loyalty/vouchers`
- `POST /api/loyalty/vouchers/validate`
- `POST /api/loyalty/purchase`

---

## Design System

**Colors:**
- Primary: Brand color (configurable)
- Secondary: Brand secondary color
- Background: White/Light Gray
- Success: Green
- Error: Red

**Typography:**
- Web: Customizable display font (headers), body font
- Android: Customizable font (headers), Default (body)

**Layout:**
- Card-based design
- Diagonal cut hero sections
- Grid product layout (2-4 columns responsive)
- Bottom navigation (Android)

---

## Future Enhancements

Potential additions:
- Push notifications for voucher expiry
- Wishlist functionality
- Product search
- Order history details
- Social sharing
- Biometric login (mobile)
- Offline mode (mobile)
