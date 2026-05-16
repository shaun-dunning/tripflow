# Daywave – App Store Connect Privacy & Data Checklist

Use this checklist before submitting Daywave to App Store Review.
Complete every section in order; App Review will reject submissions with missing or incorrect privacy disclosures.

---

## 1. Account Creation (App Store Connect record)

- [ ] Apple Developer Program membership active ($99/year)
- [ ] New app record created in App Store Connect (Apps → + New App)
- [ ] Platform: iOS selected
- [ ] Bundle ID matches `app.daywave` (registered in Developer portal, type "Explicit")
- [ ] SKU set (e.g. `daywave-ios-v1` — internal only, never shown publicly)
- [ ] App name: **Daywave** — confirmed available in the App Store
- [ ] Primary language: English (U.S.)
- [ ] Privacy Policy URL entered and **live** at submission time (required to pass review)
- [ ] Support URL entered and live

---

## 2. Privacy Policy

The privacy policy must be a publicly accessible URL before App Review begins.
Minimum required disclosures for Daywave:

- [ ] What data is collected (email, name, trip content, photos)
- [ ] How data is used (authentication, app functionality, AI planning)
- [ ] Data retention and deletion policy
- [ ] Third-party processors named (Supabase, Anthropic, Google Gemini)
- [ ] How users request account / data deletion (email or in-app)
- [ ] Contact email for privacy inquiries

---

## 3. App Store Connect → Privacy Tab (Data Types)

Open the app record → **App Privacy** → **Get Started** and answer each category.

### 3a. Data Collected

| Apple Category | Data Point | Collected? | Purpose | Linked to Identity | Used for Tracking |
|---|---|---|---|---|---|
| Contact Info → Email Address | Magic-link sign-in | **Yes** | Authentication | Yes | No |
| Contact Info → Name | Display name / trip profile | **Yes** | App Functionality | Yes | No |
| Identifiers → User ID | Supabase UUID | **Yes** | App Functionality | Yes | No |
| User Content → Photos or Videos | Group chat photo uploads | **Yes** | App Functionality | Yes | No |
| User Content → Other User Content | Trip itinerary, packing list, chat messages | **Yes** | App Functionality | Yes | No |
| Diagnostics → Crash Data | None configured | **No** | — | — | — |
| Location | None collected | **No** | — | — | — |
| Contacts | None collected | **No** | — | — | — |
| Financial Info | None collected | **No** | — | — | — |
| Health & Fitness | None collected | **No** | — | — | — |
| Browsing History | None collected | **No** | — | — | — |
| Search History | None collected | **No** | — | — | — |
| Usage Data | None collected | **No** | — | — | — |
| Sensitive Info | None collected | **No** | — | — | — |

### 3b. Checklist for Each Declared Data Type

For **Email Address**:
- [ ] Purpose: App Functionality (authentication via magic link)
- [ ] Linked to identity: **Yes**
- [ ] Used for tracking: **No**

For **Name**:
- [ ] Purpose: App Functionality (trip profile, group presence)
- [ ] Linked to identity: **Yes**
- [ ] Used for tracking: **No**

For **User ID**:
- [ ] Purpose: App Functionality (row-level security, trip membership)
- [ ] Linked to identity: **Yes**
- [ ] Used for tracking: **No**

For **Photos / Videos**:
- [ ] Purpose: App Functionality (group chat sharing)
- [ ] Linked to identity: **Yes**
- [ ] Used for tracking: **No**

For **Other User Content**:
- [ ] Purpose: App Functionality (itinerary, packing, group chat)
- [ ] Linked to identity: **Yes**
- [ ] Used for tracking: **No**

### 3c. Analytics Status

- [ ] **Confirmed: no analytics SDK is integrated.** Daywave does not include Mixpanel, Amplitude, PostHog, Firebase Analytics, or any equivalent. Mark every "Analytics" category as **No** in App Store Connect.
- [ ] **Confirmed: App Tracking Transparency (ATT) prompt is NOT needed.** No cross-app or cross-site tracking occurs.

---

## 4. User-Generated Trip Data

Data stored in Supabase under the authenticated user's UUID:

| Table | Contents | Retention |
|---|---|---|
| `users` | Display name, email, avatar URL | Until account deleted |
| `trips` | Trip name, destination, dates, invite code | Until trip deleted |
| `trip_members` | User-to-trip join records | Until trip or account deleted |
| `itinerary_days` | Day-level trip structure | Until trip deleted |
| `itinerary_items` / `agenda_items` | Activities, reservations | Until trip deleted |
| `trip_days` | Daily notes, overrides | Until trip deleted |
| `files` | Vault documents (flight, hotel, etc.) | Until trip deleted |
| `messages` (chat) | Group chat text and image URLs | Until trip deleted |
| `packing_items` | Packing checklist rows | Until trip deleted |
| Supabase Storage `avatars` | Profile photos, chat photos | Until deleted by user/app |

- [ ] Cascade-delete confirmed: deleting a user via Supabase Auth cascades to all linked rows in the tables above
- [ ] Cascade-delete confirmed: deleting a trip removes all `trip_members`, `itinerary_days`, `itinerary_items`, `agenda_items`, `trip_days`, `files`, and packing rows
- [ ] Photos in Supabase Storage are removed when the linked message or user is deleted (verify storage policy in Supabase dashboard)

---

## 5. Family / Invite Sharing

Daywave uses a short invite code (e.g. `MAUI26`) to let family members join a trip.

- [ ] Invite codes are stored in the `trips.invite_code` column — **no** third-party invite service is used
- [ ] Joining via `/join/[code]` adds a row to `trip_members` only; no data is sent to external services
- [ ] Demo join path `/join/DEMO` creates an isolated demo session — **no real family data is exposed**
- [ ] Group chat messages are stored in Supabase only — **not** synced to any external messaging platform
- [ ] Confirm in the privacy policy that trip data is shared only among members of the same trip (family invite)

---

## 6. Supabase Authentication

- [ ] Auth method: **email magic link only** (no OAuth, no passwords stored)
- [ ] Supabase handles token storage in the device's secure storage (no plaintext credentials in localStorage)
- [ ] The Supabase anon key is safe to ship in the client bundle — it enforces Row Level Security; it is not a secret
- [ ] The Supabase service-role key is **never** used in client code — verify no `service_role` string appears in `src/`
- [ ] JWT expiry and refresh token rotation are handled by `@supabase/supabase-js` automatically

```bash
# Verify no service-role key is in source
grep -r "service_role" /path/to/tripflow/src
# Expected: no results
```

---

## 7. Data Deletion Expectations

Per Apple's App Store guidelines (Guideline 5.1.1(v)), apps that support account creation must also provide account deletion.

- [ ] In-app account deletion path exists **or** users can email support to request deletion (document which in the privacy policy)
- [ ] Deleting the account via Supabase Auth removes all personally identifiable rows (see Section 4 cascade table)
- [ ] Storage bucket objects (photos) are cleared as part of the deletion flow — implement in Supabase Edge Function or document as a manual admin step
- [ ] Confirm with Apple's data-deletion API if using notifications: add `NSUserNotificationUsageDescription` only if notifications are implemented

### Recommended: In-App Delete Account Flow

If an in-app deletion UI is not yet built, add a **Settings → Delete Account** option before submission.
Calling `supabase.auth.admin.deleteUser(userId)` (from an Edge Function — never the client) removes the auth user and triggers cascades.

---

## 8. Third-Party SDKs and Data Practices

Declare these in App Store Connect → **App Privacy → Third-Party Partners** (if prompted).

| SDK / Service | Version | Data Sent | Purpose | Privacy URL |
|---|---|---|---|---|
| `@supabase/supabase-js` | ^2 | Auth tokens, all user rows | Auth + database | https://supabase.com/privacy |
| `@anthropic-ai/sdk` | ^0.91 | Prompt text (trip context) | AI day planner fallback | https://www.anthropic.com/privacy |
| Google Gemini API | 2.0 Flash | Prompt text (trip context) | AI day planner primary | https://policies.google.com/privacy |
| Open-Meteo | HTTP fetch | None (public lat/lon only) | Weather widget | https://open-meteo.com/privacy |
| Unsplash | CDN URL | None (image CDN) | Hero images | https://unsplash.com/privacy |

- [ ] Supabase sub-processor list reviewed (GDPR/CCPA compliance if needed)
- [ ] Anthropic and Gemini prompt content confirmed free of PII (trip text only, no raw email/name in prompts — verify in `/api/assistant` or Supabase Edge Function)
- [ ] Open-Meteo confirmed as no-auth, no-user-data API
- [ ] `@dnd-kit/*`, `class-variance-authority`, `lucide-react` — UI-only libraries, no data collection, no declaration needed

---

## 9. iOS-Specific Privacy Strings (Info.plist)

Add the following keys to `ios/App/App/Info.plist` before archive:

- [ ] `NSPhotoLibraryUsageDescription` — required if the photo picker reads from the library

  ```
  Daywave uses your photo library to share trip memories in the group chat.
  ```

- [ ] `NSCameraUsageDescription` — required if `<input type="file" capture>` or a native camera plugin is used

  ```
  Daywave uses your camera to capture and share trip photos.
  ```

- [ ] `NSMicrophoneUsageDescription` — **omit** unless audio features are added

- [ ] `NSLocationWhenInUseUsageDescription` — **omit** (no location features)

- [ ] `NSContactsUsageDescription` — **omit** (no contacts access)

- [ ] `NSFaceIDUsageDescription` — **omit** (no biometric auth)

> If a usage-description key is missing but the capability is invoked, the app will crash on iOS. The App Store scanner will also flag undeclared entitlements.

---

## 10. PrivacyInfo.xcprivacy (iOS 17+ Required API Reasons)

Starting iOS 17 / Xcode 15, Apple requires a `PrivacyInfo.xcprivacy` file for any SDK that accesses "required reason" APIs. Capacitor and `@supabase/supabase-js` may trigger this.

- [ ] Check Xcode's build warnings for "API usage requires reasons" after `cap sync ios`
- [ ] Add `PrivacyInfo.xcprivacy` to the App target if warned (Xcode can scaffold this file)
- [ ] Common required-reason APIs to declare: `NSPrivacyAccessedAPICategoryFileTimestamp`, `NSPrivacyAccessedAPICategoryUserDefaults`, `NSPrivacyAccessedAPICategoryDiskSpace`

---

## 11. Final Pre-Submission Verification

- [ ] `webContentsDebuggingEnabled` set to `false` in `capacitor.config.ts`
- [ ] No hardcoded API keys or secrets in source code (`grep -r "sk-" src/` returns no results)
- [ ] All five app tabs tested on iPhone SE (4.7") and iPhone 16 Pro Max (6.9") simulators
- [ ] Privacy policy URL is live and accessible without authentication
- [ ] Age rating answers completed in App Store Connect (expected: 4+)
- [ ] App does not request entitlements/capabilities beyond those declared
- [ ] Export Compliance: app uses HTTPS (Supabase TLS) — answer **Yes** to standard encryption, **No** to non-exempt encryption use
