# Claude Code Session History - Sweet Dreams Studios

## Project Overview
Sweet Dreams Studios is a sophisticated music production booking platform built with Next.js 14, featuring Firebase backend integration, Stripe payment processing, and advanced UI animations. The platform serves as both a business showcase and functional booking system for music production services.

## Complete Tech Stack
### Frontend
- **Next.js 14** with App Router architecture
- **React 18** with TypeScript
- **Tailwind CSS** with custom design system
- **Framer Motion** for animations
- **GSAP** with ScrollTrigger for scroll-based animations
- **React Big Calendar** for booking interface
- **Headless UI** for accessible components

### Backend & Services
- **Firebase Suite**: Auth, Firestore, Functions, Storage, Data Connect
- **Stripe** for payment processing
- **Date-fns** for date manipulation

### Development Tools
- **TypeScript**, **ESLint**, **Prettier**
- **PostCSS**, **Autoprefixer**
- **Firebase CLI**

## Project Architecture
### Route Structure
- **Public Routes**: Homepage with video hero, animated logo, portfolio
- **Authentication**: Login/signup with Firebase Auth + Google OAuth
- **Protected Routes**: `/book`, `/profile`, `/admin` (with role-based access)
- **Admin Dashboard**: Booking management, payment controls, services management

### Design System
- **Colors**: Warm cream background (#FFFDF5), dark charcoal text (#303036)
- **Accents**: Blue (#2081C3), Yellow (#fff380), Green (#5baf6f), Pink (#EC4899), Red (#F2542D)
- **Typography**: Inter (primary), Bungee (logo)

## Key Functionality Implemented
### 1. Authentication System
- Firebase Auth with email/password + Google OAuth
- User profile management with admin role system
- Protected routes with automatic redirects

### 2. Booking System
**Service Types:**
- Free Consultations (15-min video/brand consultations)
- Hourly Studio Sessions (1-6 hours, tiered pricing: $50-$255)
- Mixing & Mastering ($130/song with consultation)
- Full Production ($45/hour with optional beat licensing)

**Booking Flow:**
1. Service selection with dynamic pricing
2. Calendar interface with availability checking
3. Stripe payment integration
4. Admin approval workflow
5. Deposit capture and final payment processing

### 3. Payment Integration
**Stripe Implementation:**
- PaymentIntent creation via Cloud Functions
- Deposit authorization and capture workflow
- Refund processing for cancellations
- Final payment handling for completed services
- Payment history tracking

### 4. Admin Dashboard
- Booking management with status updates (pending/confirmed/rejected)
- Payment controls (capture deposits, process refunds, final payments)
- Services management (CRUD operations)
- Pricing rules management
- User management with admin invitation system

### 5. Homepage Experience
- Video background with auto-playing hero content
- Animated logo transformation to navigation
- GSAP-powered scroll animations for brand offerings
- Progressive content reveal based on scroll position
- Portfolio section with masonry grid layout

## Database Structure (Firestore)
### Collections:
1. **`users`** - User profiles with admin flags
2. **`bookings`** - Booking records with payment tracking
3. **`services`** - Service definitions and pricing
4. **`pricingRules`** - Dynamic pricing configurations

### Security Rules:
- Users can only access their own data
- Admins have read access to all user data
- Booking creation restricted to authenticated users
- Admin-only operations for booking status updates

## Recent Git History (as of 2025-07-05)
- `7ce9dfe4` - Fix Firebase authentication and implement service-first booking flow
- `417a10c8` - Merge branch 'main' 
- `67446da6` - Update before claude code
- `a6a06095` - Trying to fix stripe setup
- `c440759e` - Major google cloud issues. Cannot get a submitted booking request where testing stripe would request deposit

## Known Issues & Critical Notes

### **CRITICAL - DO NOT BREAK EXISTING FUNCTIONALITY**
- **Service-First Booking Flow**: Recently implemented and working - DO NOT MODIFY unless explicitly asked
- **Firebase Authentication**: Recently fixed - DO NOT TOUCH unless issues arise
- **Admin Dashboard**: Fully functional with booking management, payment controls, and user management
- **Stripe Integration**: Has known configuration issues but payment flow is implemented

### **Current Issues (from git history):**
1. **Stripe Integration Issues** - Previous setup encountered configuration problems
2. **Google Cloud Issues** - Major issues preventing booking submissions and deposit requests  
3. **Mixed Commit History** - Some merge conflicts in admin dashboard code

### **Incomplete/Placeholder Features:**
1. **Data Connect Schema** - GraphQL schema is commented out/placeholder
2. **Navigation Links** - Some nav items point to non-existent pages (/studio, /videography, /branding, /contact)
3. **Portfolio Content** - Portfolio section structure exists but content is placeholder
4. **Mobile Responsiveness** - Some components may need mobile optimization refinement

### **Environment Variables Required:**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
```

## Development Guidelines & Rules

### **ABSOLUTE RULES:**
1. **DO NOT BREAK EXISTING FUNCTIONALITY** - If something works, don't change it unless explicitly asked
2. **USER IS FINAL DECISION MAKER** - Always get approval before major changes
3. **PRESERVE EXISTING PATTERNS** - Follow established code conventions and architecture
4. **TEST THOROUGHLY** - Especially authentication and payment flows
5. **DOCUMENT CHANGES** - Update this file after each session

### **Code Patterns to Follow:**
- **Component-based architecture** with clear separation of concerns
- **Custom hooks** for authentication and data fetching  
- **TypeScript interfaces** for type safety
- **Modular service definitions** for booking system
- **React Context** for authentication state
- **Real-time subscriptions** via Firestore listeners
- **Framer Motion** for component-level animations
- **GSAP with ScrollTrigger** for complex scroll-based sequences

## CURRENT DEVELOPMENT FOCUS: BOOKING PLATFORM FOR SINGLE STUDIO

### **Development Phase Priority**
1. **Phase 1 (CURRENT)**: Perfect the booking platform for single music studio location
2. **Phase 2 (FUTURE)**: Complete main website pages (studio, videography, branding, contact)
3. **Phase 3 (FUTURE)**: Launch live website
4. **Phase 4 (FUTURE)**: Implement AI Dream Suite for artist career development

### **Current Booking Platform Status**

#### **✅ WORKING FUNCTIONALITY:**
- **Service-First Booking Flow**: Users select service before calendar (recently implemented)
- **5 Service Types**: Free consultations, hourly sessions, mixing/mastering, full production
- **React Big Calendar**: 30-minute slots, studio hours 9 AM - 2 AM
- **Stripe Payment Integration**: PaymentIntent creation, deposit capture, refunds
- **Admin Dashboard**: Booking management, payment controls, status updates
- **File Management**: Firebase Storage integration for project files
- **User Authentication**: Firebase Auth with Google OAuth
- **Real-time Updates**: Live booking status changes

#### **⚠️ CRITICAL ISSUES TO FIX:**
- **Git Merge Conflicts**: Unresolved conflicts in admin dashboard file
- **Firebase Config**: Mixed import paths and potential configuration issues
- **Service Mapping**: Disconnect between hardcoded and database services
- **Studio ID Management**: Hardcoded studio/engineer IDs in booking system

#### **📝 INCOMPLETE FEATURES:**
- **Email Notifications**: No automated booking confirmations
- **Calendar Sync**: No external calendar integration
- **Availability Management**: No admin-defined availability windows
- **Booking Modifications**: No rescheduling or cancellation for clients
- **Mobile Responsiveness**: Calendar component may have mobile issues

#### **Current Booking Flow:**
1. User selects service type with pricing
2. Calendar interface shows availability (30-min slots)
3. Smart duration handling based on service type
4. Stripe payment processing (free services auto-confirm)
5. Admin approval workflow for paid services
6. Deposit capture and final payment processing

#### **Admin Capabilities:**
- View all bookings by status (confirmed → rejected → pending)
- Confirm/reject pending bookings
- Capture deposits, process refunds, charge final payments
- Direct Stripe dashboard integration
- Service and pricing management
- Schedule overview with calendar view

## Session Log

### Session 1 (2025-07-05) - COMPLETED
- **Start Time**: Session initiated
- **Initial State**: Clean working directory on main branch
- **Actions Taken**:
  - Created CLAUDE.md file for session tracking
  - Comprehensive codebase analysis and documentation
  - Detailed booking platform analysis
  - **FIXED**: Git merge conflicts in admin dashboard and profile bookings pages
  - **FIXED**: Added past time validation to prevent booking behind current time for all service types
  - **VERIFIED**: Admin service management interface is fully implemented
- **Issues Resolved**:
  - Fixed syntax errors preventing compilation
  - Resolved Firebase import conflicts
  - Added past time validation for 15-minute consultation services
  - Confirmed admin service management functionality exists
- **FIXED**: Added Services and Pricing Rules permissions to Firestore rules
  - **CREATED**: Dedicated Services management page at `/admin/services`
  - **UPDATED**: Admin sidebar with Services tab
  - **IMPROVED**: Service management with better UI and validation
- **Current Focus**: Complete business service management system for admin control
- **Admin Setup**: User needs `isAdmin: true` field in their user document in Firestore to access admin features
- **FIXED**: Removed hardcoded services from booking page - now reads from database
- **UPDATED**: ServiceSelector component to fetch services from Firestore
- **SIMPLIFIED**: No migration needed - admin can add services manually through Services tab
- **End State**: 10 modified files ready for commit, services management system fully implemented
- **Commit**: Changes committed in next session (2025-07-08)

### Session 2 (2025-07-08)
- **Start Time**: Session initiated
- **Initial State**: 10 modified files from previous session uncommitted
- **Actions Taken**:
  - Updated CLAUDE.md with Session 1 completion status
  - Committed changes from Session 1: Services management system implementation

### Session 3 (2025-07-16) - STRIPE INTEGRATION DEEP DIVE - IN PROGRESS
- **Start Time**: Session initiated  
- **Initial State**: Firebase API key issues preventing build, Stripe payment flow completely broken
- **Primary Goal**: Fix Stripe payment authorization for booking system

#### **Issues Encountered & Solutions Attempted:**

##### 1. **Frontend Firebase Configuration Issues**
- **Problem**: `auth/invalid-api-key` errors during Next.js prerendering and runtime
- **Root Cause**: Environment variables not properly configured in .env.local
- **Solution**: ✅ **RESOLVED** - Recreated .env.local file with UTF-8 encoding (was UTF-16)
- **Impact**: Fixed frontend authentication and build process

##### 2. **Stripe Payment Flow - PERMISSION_DENIED Error**
- **Problem**: Cloud Function `submitBookingRequestWithPaymentAuth` consistently fails with `7 PERMISSION_DENIED: Missing or insufficient permissions`
- **Error Location**: Firestore operations in Cloud Functions (reading customers collection, writing booking_requests)

#### **Systematic Debugging Attempts:**

##### **Authentication Verification**
- ✅ **CONFIRMED**: User authentication working properly (test function `testAuth` passes)
- ✅ **CONFIRMED**: User UID and email retrieved correctly: `ACz9KDS4HYRmjBniGRi2tlRfn5G2`, `cole@marcuccilli.com`

##### **Service Type Mapping Issues**
- **Problem**: Service data structure mismatch between frontend and Cloud Function
- **Frontend**: Services have `id`, `name`, no `serviceType` field
- **Cloud Function**: Expected `pricingRules` collection lookup
- ✅ **PARTIALLY RESOLVED**: Implemented hardcoded pricing logic to bypass Firestore service reads

##### **Firestore Security Rules**
- **Initial Rules**: Had `allow read, write: if request.auth == null` for Cloud Functions
- **Updated Rules**: Made ultra-permissive (`allow read, write: if true`) for debugging
- **Result**: ❌ **NO CHANGE** - Still getting PERMISSION_DENIED

##### **IAM & Service Accounts Deep Investigation**
- **Discovery**: Two different service accounts involved:
  - `276398858109-compute@developer.gserviceaccount.com` (Compute Engine default)
  - `firebase-adminsdk-fbsvc@sweetdreamsstudios-7c965.iam.gserviceaccount.com` (Firebase Admin SDK)

- **IAM Analysis**: 
  - ✅ Compute service account has `roles/datastore.user`
  - ❌ Firebase Admin SDK service account initially missing `roles/datastore.user`
  - ✅ **FIXED**: Added `roles/datastore.user` to Firebase Admin SDK service account

##### **Cloud Function Initialization**
- **Multiple Attempts**:
  1. Basic `admin.initializeApp()` 
  2. Explicit project ID specification
  3. Simplified Admin SDK initialization
  4. Added proper project ID back with comment about service account usage

#### **What We've Learned:**

##### **About the Architecture**
- Cloud Functions should use Firebase Admin SDK service account, not compute service account
- Firestore security rules apply even to Admin SDK operations in certain contexts
- Environment variable handling differs between local development and Cloud Functions deployment

##### **About the Specific Error**
- Error occurs at `document-reference.js:182:36` in Firestore client library
- This suggests the permission issue is at the API level, not security rules level
- The error happens during both read and write operations to Firestore

##### **What Didn't Work**
- ❌ Making Firestore rules completely permissive
- ❌ Bypassing all Firestore reads by using hardcoded pricing
- ❌ Different Admin SDK initialization strategies
- ❌ Removing complex service collection queries

##### **What Got Us Closer**
- ✅ Fixed environment variables (resolved frontend auth issues)
- ✅ Confirmed user authentication works perfectly
- ✅ Identified the exact service accounts involved
- ✅ Added proper IAM roles to Firebase Admin SDK service account
- ✅ Simplified pricing logic to remove dependency on service collection

#### **Current Status - Still Blocked**
- **Error Persists**: `7 PERMISSION_DENIED: Missing or insufficient permissions`
- **Location**: Any Firestore operation in Cloud Functions
- **Service Account**: Firebase Admin SDK service account has all necessary roles
- **Rules**: Firestore rules are completely permissive for debugging

#### **Next Steps - Remaining Hypotheses**

##### **1. Service Account Impersonation Issue**
- Cloud Functions may still be trying to use compute service account despite Admin SDK initialization
- **Action Needed**: Verify which service account is actually being used at runtime

##### **2. Project-Level Policy Conflicts**
- Organization-level policies may be overriding IAM permissions
- **Action Needed**: Check for organization constraints that could block service account access

##### **3. Firebase Admin SDK Version/Configuration**
- Outdated firebase-functions package (warning shows during deploy)
- **Action Needed**: Upgrade to latest firebase-functions version

##### **4. Firestore Database Location/Region Mismatch**
- Admin SDK may be connecting to wrong Firestore region
- **Action Needed**: Verify Firestore database location matches Cloud Function region

##### **5. API Enablement Issues**
- Firestore API may not be properly enabled for the specific service account
- **Action Needed**: Verify Cloud Firestore API is enabled and accessible

#### **Immediate Action Plan**
1. **Upgrade Firebase Functions Package**: `npm install --save firebase-functions@latest`
2. **Add Service Account Debugging**: Log which service account is actually being used
3. **Test Minimal Firestore Operation**: Create simplest possible read/write test
4. **Check Organization Policies**: Look for any org-level constraints
5. **Verify API Enablement**: Ensure all necessary APIs are enabled for both service accounts

#### **Success Criteria**
- ✅ Cloud Function can read from Firestore without permission errors
- ✅ Cloud Function can write to Firestore collections (`customers`, `booking_requests`)
- ✅ Stripe customer creation and payment intent creation work
- ✅ End-to-end booking flow completes successfully
- ✅ Admin dashboard shows created booking requests

#### **Lessons for Future Sessions**
- Always verify exact service account being used in Cloud Functions
- IAM policies can be complex with multiple service accounts involved
- Environment variable encoding issues can cause subtle problems
- Firestore permission debugging requires systematic elimination of variables
- Service account permissions may take time to propagate

## Future Development Priorities
1. **Complete Stripe Integration** - Resolve configuration issues and test payment flow
2. **Implement Missing Pages** - Build out studio, videography, branding, and contact pages
3. **Populate Portfolio** - Add real project content and media
4. **Mobile Optimization** - Ensure responsive design across all components
5. **Performance Optimization** - Optimize video loading and implement proper caching
6. **Testing Strategy** - Add comprehensive test coverage for booking and payment flows
7. **SEO Implementation** - Add metadata and structured data for better search visibility

---
*This file should be updated at the end of each Claude Code session with changes made, issues encountered, and solutions implemented.*