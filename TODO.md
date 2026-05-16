# Daywave – Agent Task List
                                                                                                                        
  ## Critical
  - [x] Finish merging and push prior changes. Double check that items pushed are removed from this TODO list.
  - [x] Clean up Group Tab. Right now, there is a ton of latency when I send a message before it shows up in the chat. Like hours not minutes. Also, the icons above "Message the Group" text box don't do anything when I click on them. Each should have a logial use case and action - e.g. Group Poll should enable user to create a custom poll that gets posted to the group chat.                                                          
                                                                                                                      
  ## High Priority                                                                                                      
- [x] Clean up  My Day page. It's become overloaded. We have too much stuck at the top of the page before getting to the itinerary. Figure out if there's a better design, layout, UX. Clean up redundant info like weather appearing twice. Create a visually compelling UX like you'd expect on a high end consumer app. Optimize and polish the experience so it looks world class.
- [x] Drag-to-reorder + drag-between-sections in My Day (using @dnd-kit/sortable)
- [x] AI day-planner that respects existing items — make /api/assistant aware of current day's items and free time gaps, propose activities that slot in    
- [x] AI chat bot now feels buried in Explore after the similar sized cards. We had previously looked into how to make this more prominent and I thought there were two ingress points. Look into other placements and design treatments, but don't overload the UX Design. Also, consider other places to insert the chatbot gracefully throughout the experience. Make sure it would naturally be useful and not feel forced or that the design is cluttered. We want users to come away thinking "wow, this app is beautiful and smart".
                                                                                                                            
  ## Next Up                                                                                                            
- [x] Packing list  A simple checklist scoped to the trip (sunscreen, passports, kids' gear). Dead simple to build, huge value for families. Trip-aware suggestions — if "Molokini Snorkel Tour" is on your agenda, automatically suggest snorkel gear, underwater camera, sea-sickness meds. Per-person assignment — "Dad: passports · Sarah: sunscreen · Liam: boogie board". Supabase persistence — if it's currently localStorage-only, sharing the list with family members won't work. Smart categories — Documents, Clothing, Beach Gear, Kids, Pharmacy auto-grouped.
- [x] Make reservations, activities, and travel plans in Docs in chronological order. Also consider cleaning up the look and feel of the icons on the left side of each category. For example the bullseye for activities isn't totally logical, the placement is not well centered, and the text "Activities" doesn't fit cleanly in the width of the green column.
- [x] On Group, we have a few issues to clean up. I tried to add a photo to the chat and I selected one to upload but nothing happened. Also, when I tap "Trip Plan" it now adds a two line summary as a message into chat, but I wasn't sure why it picked the day it did to summarize. Also, I expected to be able to tap that plan to be taken to the details in My Day. Same with a reservation that's added to the chat. Finally I can't figure out what Green vs Yellow dots mean under the travlers. usually that's a presence indicator but I don't believe all the green travelers have accepted invites or used the app yet.
- [x] On Up Next setion of Trips, I have a completed trip showing up from last week. I would have expected this to show that it's been completed or possibly moved into Archived.
- [x] Add "depart by" for reservations on My Day. Use estimated drive times to determine departure time for reservations based on the itinerary. I see it for travel but not for dinners and other activities.
- [x] Offline-first / PWA caching — service worker + IndexedDB cache so app works on airplane / bad Wi-Fi, syncs when reconnected
- [x] Design system pass — consistent shadow elevation tiers, formalize accent color roles (sky/emerald/amber/indigo)
- [x] Add haptic feedback on key actions (navigator.vibrate(10) on toggle/add)
- [x] Smooth page transitions between tabs (View Transitions API)
- [x] Better error states  If Supabase fails or is offline, the user sees nothing. A friendly "couldn't load your trip" message with a retry button would go a long way.
- [x] Packing list cross-device sync — fixed RLS policy (trips creator + travelers with user_id); updated packing-sync-fix.sql must be run in Supabase SQL Editor once
- [x] Upcoming/draft trips cross-device sync — trips now backed by Supabase user metadata (auth.updateUser) as cross-device source of truth, localStorage kept as offline fallback

                                                                                                                            
  ## Backlog                                                                                                          
- [x] Smart trip recap / memory book — auto-generated day cards after each day passes, swipeable "Trip Memories" reel at trip end
- [x] Map view for the day — toggle on My Day shows pins color-coded by section with optimal route, Apple/Google Maps deep-link on tap. But don't overload My Day which we just cleaned up. FIgure out a graceful place to surface the Map and directions. Keep a lot of the busier elements on a dialog after a click to not clutter the page.
- [x] Shared family presence — per-item "who's going" toggles with avatars + real-time "I'm in / I'll skip" via Supabase Realtime (removed hardcoded initials; replaced by RSVP feature below)
- [x] **RSVP / attendance per activity** — let each traveler tap "I'm in / I'll skip" on individual agenda items. Store per-item attendance in Supabase (trip_id, day_id, agenda_item_id, user_id, status). Surface attendance counts on Today cards ("3 of 4 going") and a detail sheet per item. More meaningful than hardcoded initials — ties to real group members and can drive notification reminders.
- [x] Smart pre-trip readiness dashboard — combine docReadiness + packingProgress + weather warnings into single "87% trip-ready" card
- [x] First-trip onboarding — 3-screen welcome for users joining via /join/[code], includes avatar picker
- [x] Weather widget under the Trips hero  Embed a 7-day Maui forecast pulled from Open-Meteo (free, no API key). Showing "82°F ☀️" on the hero card would be a wow moment.
- [x] Reservation badge/reminders  Items marked as `reservation: true` could have a small calendar badge and a note about when to confirm. Could eventually tie into push notifications.

## Completed in Codex UX Pass
- [x] Merged prior remote work into `main` and pushed the combined branch after rebasing.
- [x] Added offline-first/PWA foundation: service worker registration, static/image caching, Supabase stale-while-revalidate caching, and IndexedDB agenda/sync helpers.
- [x] Added design-system foundation: shadow elevation tiers, accent role tokens, and documented visual roles in `globals.css`.
- [x] Added haptic feedback utility and wired haptics into Packing and My Day toggle/add interactions.
- [x] Added composed retry/error states across My Day, Trips, Trip overview, Group Chat, Vault, Packing, weather, and assistant failure paths.
- [x] Added invite onboarding on `/join/[code]` with first-trip orientation cards and avatar selection for new or signed-in travelers.
- [x] Hardened trip source-of-truth: centralized trip IDs/storage keys, aligned schema fields used by invite/group flows, and kept `/trip` + `/trips` on the same stored trip shape.
- [x] Tightened reservation-to-agenda sync: Vault-sourced reservations now show as linked agenda items, open back to Vault, and avoid behaving like normal editable agenda rows.
- [x] Broadened Vault-to-My Day sync so dated Flights, Hotel, Car, Activities, and Dining docs can appear as linked agenda items without duplicates.
- [x] Fixed invite links: family invite `/join/MAUI26` now falls back safely if Supabase invite_code is missing, while preview invites like `/join/TRIPFLOW` let friends try the app without joining the family trip.
- [x] Polished shared-join flow: new travelers get added to the group and TripFlow posts a lightweight join message.
- [x] Completed cross-page microcopy sweep for trip lifecycle labels, local-save copy, and estimated leave-by wording.
- [x] Simplified Explore hero: shorter headline, removed recommendation chips, raised search, reduced visual clutter.
- [x] Generalized My Day travel guidance so all reservations with times get leave-by guidance, including future unknown venues with estimated fallback.
- [x] Fixed Trip tab lifecycle persistence so Up Next and Archived Trips no longer revert to demo/hardcoded data across reloads.
- [x] Normalized `/trip` and `/trips` upcoming trip storage so both pages preserve the same richer trip shape.
- [x] Polished auth/loading/nav surfaces with image-led auth treatment, branded loading state, and lucide bottom navigation.
- [x] Added Supabase-backed packing items with localStorage fallback and a confirmation sheet for reset.
- [x] Stabilized production build by removing remote `next/font/google` dependency and using local/system font variables.
- [x] Reduced expected weather API console noise when OpenWeather credentials are unavailable.
- [x] Removed remaining Today-page Maui fixture fallbacks from active trips: days, empty agenda states, doc overlays, weather labels, countdown copy, and AI planner prompts now follow the selected trip.
- [x] Added a separate anonymized Maui demo trip path: `/join/DEMO` now opens a full sample trip with fake travelers, bookings, agenda, docs, chat, and packing seed data instead of exposing the real family trip.

## Design Audit — High Priority (Hardcoded Data)
- [x] AppSessionControls: replace hardcoded "Maui trip" and "Shaun's real family trip" with dynamic trip name
- [x] Chat: fix fallback messages ("Maui group", "Jun 5-11", "Ka'anapali") to use active trip data; fix join button / preview copy that references "Shaun"
- [x] Join page: remove hardcoded "Shaun" from fallback traveler and from all copy strings
- [x] Packing: fix hero title (hardcoded "Maui Family Trip · Jun 5–11") to use active trip name/dates
- [x] Packing: fix share text ("🧳 Maui Family Trip — Packing List (Jun 5–11)") to use active trip
- [x] Packing: fix countdown — hardcoded `new Date("2026-06-05")` → use activeTrip start date
- [x] Packing: fix milestone copy "Time to enjoy Maui" → destination-agnostic
- [x] Packing: fix localStorage key "daywave-packing-v2-maui26" → per-trip-ID key
- [x] Trip: remove hardcoded "OGG → LAX · Departs 10:30 AM" from fly-home and departure rows (no data source for specific flight details)

## Design Audit — Needs Design Decision (Batch for discussion)
- [x] Explore PLACES array: 40+ entries are Maui-specific POIs — needs destination-awareness or a label making Maui-only nature clear; longer-term needs location-based place API
- [x] Explore TRAVELER_ROUTES: references hardcoded day themes ("Day 3 · Sun Jun 7") tied to Maui trip dates — needs trip-date-aware rendering or removal
- [ ] Packing activity suggestions: Maui-specific activity triggers (Molokini, Road to Hana, etc.) — needs keyword matching against actual agenda items for any trip
- [ ] DEMO_SIDE_TRIPS (San Diego / Napa): hardcoded 2026 dates show up in demo — decide if demo should use relative dates or fixed content is acceptable
- [x] Chat invite share text: "Join our Maui Trip 🌺" — needs trip title injected into Web Share API payload (minor, but visible to anyone the user shares with)
- [ ] Vault: airport city map (OGG → Maui, LAX → Los Angeles) is hardcoded for known airports — acceptable for now but won't resolve obscure airports

## Design Audit — Inconsistencies (Polish pass)
- [ ] Standardize dark CTA: pick either bg-slate-900 or bg-slate-950 and use it everywhere
- [ ] Standardize card border radius: define sm=rounded-xl / md=rounded-2xl / lg=rounded-3xl rules and enforce across all cards/sheets
- [ ] Standardize sheet max-height: all bottom sheets should use consistent max-h value (currently 88vh vs 90vh)
- [ ] Section label size: consolidate text-[10px] vs text-xs for uppercase section headers
- [ ] Page outer padding: standardize px-4 vs px-5 across all pages
- [ ] Terminology: pick "Docs" or "Vault" consistently; pick "Travelers" or "Crew" consistently

## Recommended Next
- [x] Manual demo QA pass — run invite join, tab navigation, Vault-linked reservations, Group cards, Packing sync fallback, and mobile layout checks before sharing broadly.
- [x] Run `supabase/demo-trip.sql` in Supabase SQL Editor before sharing `/join/DEMO`.
- [x] Smart pre-trip readiness dashboard — combine packing progress, document readiness, reservation confidence, weather warnings, and traveler join status into one "trip ready" score.
- [x] Reservation confirmation workflow — add "needs confirmation" states, reminders, and one-tap confirm from Vault/My Day.
- [x] True travel-time service — replace local Maui drive-time heuristics with geocoded locations and live/static duration estimates.
- [x] Finish multi-trip data model pass — move remaining future-trip planning cards and trip-specific suggestions from local/demo data to persisted active-trip records.
- [x] Share/invite analytics or audit trail — lightweight joined/invited indicators so the organizer can see who has accepted and who has not.

      
## Future Milestone – iOS App / App Store Readiness

### Current Foundation Complete
- [x] Move `/api/assistant` route to Supabase Edge Function so the app can run as a static export.
- [x] Move `/api/weather` route to Supabase Edge Function so the app can run as a static export.
- [x] Add `output: "export"` to `next.config.ts` and verify `npm run build` produces the static `out/` directory.
- [x] Install Capacitor packages: `@capacitor/core`, `@capacitor/ios`, and `@capacitor/cli`.
- [x] Add `capacitor.config.ts` with Daywave bundle ID (`app.daywave`), app name, `out/` web directory, iOS safe-area settings, splash background, and status bar defaults.
- [x] Pre-generate Daywave app icons as static PNGs in `public/brand`.
- [x] Add PWA manifest metadata for Daywave name, theme color, portrait orientation, categories, and icons.
- [x] Add image/static caching foundation for mobile and installed-app reliability.
- [x] Replace remote `next/font` dependency with static/system font styling so static export and offline startup are more reliable.
- [x] Verify production build passes after the latest Daywave changes.

### Next Autonomous Engineering Work
- [x] Add repeatable mobile build scripts, e.g. `mobile:build`, `cap:add:ios`, `cap:sync:ios`, and `cap:open:ios`.
- [x] Generate the native iOS project with Capacitor (`npx cap add ios`) and commit the resulting `ios/` project once reviewed.
- [x] Sync the current static web build into iOS (`npm run build` then `npx cap sync ios`).
- [x] Audit native iOS project settings after generation: display name, bundle identifier, deployment target, app icons, splash assets, status bar, supported orientations, and signing placeholders.
- [x] Add an `APP_STORE_READINESS.md` runbook with exact local build, simulator, TestFlight, and App Store submission steps.
- [x] Add a privacy/data checklist for App Store Connect: account creation, user-generated trip data, family/invite sharing, Supabase auth, analytics status, and data deletion expectations.

### Manual / Apple Account Work
- [ ] Enroll or confirm Apple Developer Program membership ($99/year).
- [ ] Create the Daywave App Store Connect app record.
- [ ] Confirm final app name, subtitle, category, age rating, support URL, marketing URL, privacy policy URL, and contact info.
- [ ] Configure iOS signing team and bundle identifier in Xcode.
- [ ] Test full app in iOS Simulator across at least one small iPhone and one large iPhone viewport.
- [ ] Test on a physical iPhone: invite link, auth email redirect, demo join, family join, trip creation, tab navigation, offline/poor-network behavior, safe areas, keyboard, and sharing.
- [ ] Prepare App Store screenshots, app preview copy, keywords, description, and promotional text.
- [ ] Submit first TestFlight build.
- [ ] Resolve TestFlight QA issues, then submit to App Review.
