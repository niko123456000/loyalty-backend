# Changelog - Loyalty Store

## [1.0.0] - 2026-04-09

### Web Application

#### Added
- Complete product theming system mapping all backend products to branded merchandise
- "Apply to Cart" button on voucher cards with auto-navigation
- Auto-apply voucher functionality when navigating from Loyalty to Cart
- Copy voucher code to clipboard feature
- Expired voucher filtering (only show active, non-expired vouchers)
- "Expiring Soon" badges for vouchers within 7 days of expiry
- Hero banner background images on all pages
- Enhanced product cards with hover effects and gradient overlays
- Stock indicators on product cards
- Improved cart item display with larger images
- Points earned preview on checkout
- Enhanced voucher input styling with better UX

#### Fixed
- Voucher Apply button not working (useCallback implementation)
- Discount not calculating correctly in cart total
- Voucher state management issues
- Error handling for invalid voucher codes

#### Changed
- Product catalog now displays 100% branded merchandise
- Enhanced visual design with brand imagery
- Improved card layouts across all pages
- Better mobile responsiveness

---

### Android Application

#### Added - New Native App
- Complete native Android application built with Jetpack Compose
- Material3 Bottom Navigation Bar (Store, Cart, Account)
- Cart badge showing real-time item count
- Product catalog with grid layout and category filtering
- Shopping cart with quantity controls
- Voucher validation and application
- Loyalty dashboard with points, tier, and transactions
- Image loading with Coil
- JWT authentication
- Product theming (matches web app)
- Expired voucher filtering
- Pull-to-refresh support
- Success dialogs for checkout

#### Technical
- Kotlin 1.9.22
- Jetpack Compose with Material3
- Retrofit + OkHttp for API
- MVVM architecture with ViewModel
- Coroutines + Flow for async operations
- Navigation Compose
- Min SDK: API 24 (Android 7.0)

---

### Documentation

#### Added
- `IMPLEMENTATION_SUMMARY.md` - Complete technical overview
- `CHANGELOG.md` - Version history
- `README.md` - Web app setup guide
- `QUICKSTART.md` - Android app quick start
- `VERSION_FIX.md` - Android version compatibility guide
- `NAVIGATION_UPDATE.md` - Navigation system documentation
- `SETUP_INSTRUCTIONS.md` - Android complete setup

---

## Product Theming Details

### Accommodation → Jerseys & Apparel
- Backend products mapped to Home Jerseys, Away Jerseys, Special Editions, Retro Jerseys

### Dining → Training Wear
- Backend products mapped to Hoodies, Jackets, Track Pants, Training Shorts, Polos

### Experiences → Accessories
- Backend products mapped to Supporters Packs, Signed Items, Backpacks, Scarves, Caps, Beanies

### Retail → Premium Merchandise
- Backend products mapped to Watches, Gift Cards, Electronics, Water Bottles, Phone Cases

[See full mapping implementation in IMPLEMENTATION_SUMMARY.md]

---

## API Endpoints

Base URL: `https://tstar-backend-929231-09db75fda58c.herokuapp.com`

### Authentication
- `POST /api/auth/login` - Login with membership number
- `POST /api/auth/verify` - Verify JWT token

### Products
- `GET /api/products` - Get product catalog
- `GET /api/products/categories` - Get categories
- `GET /api/products/:id` - Get single product

### Loyalty
- `GET /api/loyalty/profile` - Get member profile
- `GET /api/loyalty/transactions` - Get transaction history
- `GET /api/loyalty/vouchers` - Get available vouchers
- `POST /api/loyalty/vouchers/validate` - Validate voucher code
- `POST /api/loyalty/purchase` - Complete purchase

---

## Breaking Changes

None - This is the initial release

---

## Migration Guide

### For Web App Users
No migration needed. The app is backward compatible with existing backend.

### For Android App Users
New installation:
1. Download APK or build from source
2. Install on Android 7.0+
3. Login with existing membership number

---

## Known Issues

None at release

---

## Dependencies

### Web (package.json)
- react: ^18.2.0
- typescript: ^5.0.0
- vite: ^5.0.0
- tailwindcss: ^4.0.0

### Android (build.gradle.kts)
- Kotlin: 1.9.22
- Compose BOM: 2024.02.00
- Retrofit: 2.9.0
- Coil: 2.5.0

---

## Contributors

- Development: Claude (Anthropic)
- Product Owner: @niko123456000
- Backend: Existing Salesforce Loyalty Management System

---

## License

[Add your license]

---

## Support

For issues or questions:
- GitHub Issues: [your-repo]/issues
- Test Account: Membership 666
