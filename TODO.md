# TripFlow – Agent Task List
                                                                                                                        
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

                                                                                                                            
  ## Backlog                                                                                                          
- [x] Smart trip recap / memory book — auto-generated day cards after each day passes, swipeable "Trip Memories" reel at trip end
- [x] Map view for the day — toggle on My Day shows pins color-coded by section with optimal route, Apple/Google Maps deep-link on tap. But don't overload My Day which we just cleaned up. FIgure out a graceful place to surface the Map and directions. Keep a lot of the busier elements on a dialog after a click to not clutter the page.
- [x] Shared family presence — per-item "who's going" toggles with avatars + real-time "I'm in / I'll skip" via Supabase Realtime
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

## Recommended Next
- [ ] Manual demo QA pass — run invite join, tab navigation, Vault-linked reservations, Group cards, Packing sync fallback, and mobile layout checks before sharing broadly.
- [ ] Smart pre-trip readiness dashboard — combine packing progress, document readiness, reservation confidence, weather warnings, and traveler join status into one "trip ready" score.
- [ ] Reservation confirmation workflow — add "needs confirmation" states, reminders, and one-tap confirm from Vault/My Day.
- [ ] True travel-time service — replace local Maui drive-time heuristics with geocoded locations and live/static duration estimates.
- [ ] New trip creation/data model pass — move future trips from localStorage-only planning cards toward persisted multi-trip records.
- [ ] Share/invite analytics or audit trail — lightweight joined/invited indicators so the organizer can see who has accepted and who has not.

      
## Future Milestone – iOS App (Capacitor)
- [ ] Move `/api/assistant` route to Supabase Edge Function (required for static export)
- [ ] Move `/api/weather` route to Supabase Edge Function (required for static export)
- [ ] Add `output: "export"` to next.config.ts and verify static build works
- [ ] Install and configure Capacitor (`@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`)
- [ ] Fix Unsplash hero image caching for mobile (add Cache-Control or switch to local copies)
- [x] Replace `next/font` Geist with static CSS import in globals.css
- [ ] Pre-generate app icons as static PNGs in /public (replace next/og icon routes)
- [ ] Configure Capacitor for iOS — bundle ID, display name, splash screen, safe area insets
- [ ] Test full app in iOS Simulator
- [ ] Submit to App Store (requires $99/yr Apple Developer account)
