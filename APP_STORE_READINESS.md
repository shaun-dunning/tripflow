# App Store Readiness Runbook

Complete checklist for building, testing, and submitting Daywave to the iOS App Store.

---

## Prerequisites

| Requirement | Details |
|---|---|
| macOS | Ventura 13+ |
| Xcode | 15.0+ (download from Mac App Store) |
| Apple Developer Program | Active $99/year enrollment |
| Node.js | 20+ |
| Capacitor CLI | `npm i -g @capacitor/cli` |
| `.env.local` | Valid Supabase URL + anon key |

---

## 1. Static Export Build

Daywave uses `output: "export"` in `next.config.ts`, producing a static `out/` directory that Capacitor bundles into the native shell.

```bash
# Build static export + sync into iOS project (one step)
npm run mobile:build
```

This runs `next build` then `cap sync ios`.

---

## 2. First-Time iOS Project Setup

Only needed once per developer machine. Skip if `ios/` already exists and is committed.

```bash
# Generate the native iOS Xcode project
npm run cap:add:ios

# Sync the web build into the native project
npm run cap:sync:ios
```

Commit `ios/` after reviewing the generated files.

---

## 3. Subsequent Builds

```bash
npm run mobile:build        # rebuild static export and sync to ios/
npm run cap:open:ios        # open Xcode
```

---

## 4. Xcode Project Settings

After running `npm run cap:open:ios`, select the **App** target and verify:

| Setting | Expected Value |
|---|---|
| Display Name | `Daywave` |
| Bundle Identifier | `app.daywave` |
| Deployment Target | iOS 16.0 |
| Supported Orientations | Portrait only |
| Status Bar Style | Light Content (white text on `#061832` navy) |
| Signing Team | Your Apple Developer team |

### App Icons

Verify `App/App/Assets.xcassets/AppIcon.appiconset/` contains all required sizes. The 1024×1024 App Store icon is mandatory.

### `capacitor.config.ts` — Before Submission

Set `webContentsDebuggingEnabled: false`. This flag allows Safari remote debugging and must not ship to production.

### `Info.plist` — Privacy Strings

Add usage description strings for any entitlements the app requests:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Daywave uses your photo library to share trip memories in the group chat.</string>
<key>NSCameraUsageDescription</key>
<string>Daywave uses your camera to capture and share trip photos.</string>
```

---

## 5. Simulator Testing

In Xcode, run on at least two simulators before submitting:

- **iPhone 16 Pro Max** (6.9" — largest)
- **iPhone SE 3rd gen** (4.7" — smallest supported)

### Golden-Path Checklist

- [ ] Auth: email magic link redirects back into the app
- [ ] `/join/DEMO` loads the demo trip with seed travelers, agenda, docs, and chat
- [ ] `/join/MAUI26` joins the real family trip (if Supabase is seeded)
- [ ] All five tabs navigate without errors (My Day, Trips, Explore, Docs, Group)
- [ ] My Day drag-to-reorder works with touch
- [ ] Group chat: send text, upload photo, create poll
- [ ] Packing list: add item, check off, persist across reload
- [ ] Vault: reservations show chronological order; tap opens detail
- [ ] Keyboard appearance does not resize the web view
- [ ] Safe-area padding correct on Dynamic Island models and home indicator
- [ ] Splash screen shows Daywave branding on `#061832` navy

### Offline / Poor Network

1. Enable Airplane Mode in Simulator.
2. Open app — verify graceful error states render instead of blank screens.
3. Re-enable network — verify data refreshes without a hard reload.

---

## 6. Physical Device Testing

Connect an iPhone (iOS 16+), trust the development certificate in Xcode, then run.

Additional checks only possible on device:

- [ ] Haptic feedback triggers on key actions (toggle, add packing item)
- [ ] Share sheet opens native iOS share dialog
- [ ] Deep link (`daywave://` or universal link) opens correct screen
- [ ] Performance: tab switches feel instant, no jank on scroll
- [ ] Notch / Dynamic Island safe areas correct in portrait

---

## 7. Archive & Upload to TestFlight

1. Select **Any iOS Device (arm64)** as the run destination in Xcode.
2. **Product → Archive** — wait for the archive to build (~3–5 min).
3. In the **Organizer** (Window → Organizer), select the new archive.
4. Click **Distribute App → App Store Connect → Upload**.
5. Leave all Xcode-managed signing options checked.
6. Wait ~10–15 min for App Store Connect processing.
7. In **App Store Connect → TestFlight → Builds**, select the new build.
8. Add a "What to Test" note and invite internal testers.
9. For external TestFlight: submit for Beta App Review (~24 h).

---

## 8. App Store Submission

### App Listing Setup (App Store Connect)

| Field | Value |
|---|---|
| App Name | Daywave |
| Subtitle | Family travel, beautifully planned |
| Primary Category | Travel |
| Secondary Category | Lifestyle |
| Age Rating | 4+ |
| Support URL | your support/contact URL |
| Marketing URL | your landing page URL |
| Privacy Policy URL | required — must be live before submission |

### Screenshots Required

| Device | Dimensions |
|---|---|
| iPhone 6.9" (16 Pro Max) | 1320 × 2868 px |
| iPhone 6.7" (15 Pro Max) | 1290 × 2796 px |
| iPhone 5.5" (8 Plus) | 1242 × 2208 px |

At least the 6.7" set is mandatory. App previews (15-second MP4) are optional but improve conversion.

### Description Tips

- Lead with the family angle — trip planning, not just itineraries.
- Mention offline support, AI day-planner, packing lists, and group chat.
- Keywords (100 char max): focus on "family travel planner", "trip itinerary", "vacation organizer".

### Build Selection

Select the TestFlight build that passed QA. Increment the version string (`CFBundleShortVersionString`) and build number (`CFBundleVersion`) if needed.

### Submit for Review

Click **Submit for Review**. Review typically takes 24–48 h.

---

## 9. Post-Submission

- Monitor **App Store Connect → Activity** for reviewer feedback.
- If rejected: read the rejection reason, fix the specific issue, and resubmit — do not guess.
- Once approved, choose **Release this version** manually or schedule a date.
- After release, monitor **Crashes** in Xcode Organizer and **App Analytics** in App Store Connect.

---

## 10. Privacy & Data Checklist

See also the App Store Connect **Privacy** tab, which requires disclosing every data type the app collects.

### Data Types Daywave Collects

| Data | Purpose | Linked to User | Used for Tracking |
|---|---|---|---|
| Email address | Auth (Supabase magic link) | Yes | No |
| Name / display name | Trip member profile | Yes | No |
| Photos (optional upload) | Group chat sharing | Yes | No |
| Trip itinerary & agenda | Core app function | Yes | No |
| Packing list items | Core app function | Yes | No |
| Device identifiers | Crash reporting (if added) | No | No |

### User Data Rights

- **Deletion**: users can delete their account via Supabase Auth; all linked rows should cascade-delete.
- **Export**: no self-serve export today — note this in your privacy policy.
- **Retention**: trip data is retained until the user deletes their account or the trip is removed.

### Third-Party SDKs to Declare

| SDK | Data Access |
|---|---|
| Supabase JS | Auth tokens, all user data |
| Anthropic / Gemini APIs | Prompt text sent to LLM (no PII if prompts are anonymized) |
| Open-Meteo | None (public weather, no user data sent) |

Declare these in the **App Privacy** section of App Store Connect before submission.
