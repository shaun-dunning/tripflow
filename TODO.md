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
- [ ] Add "depart by" for reservations on My Day. Use estimated drive times to determine departure time for reservations based on the itinerary. I see it for travel but not for dinners and other activities.
- [ ] Offline-first / PWA caching — service worker + IndexedDB cache so app works on airplane / bad Wi-Fi, syncs when reconnected
- [ ] Design system pass — consistent shadow elevation tiers, formalize accent color roles (sky/emerald/amber/indigo)
- [ ] Add haptic feedback on key actions (navigator.vibrate(10) on toggle/add)
- [ ] Smooth page transitions between tabs (View Transitions API)
- [ ] Better error states  If Supabase fails or is offline, the user sees nothing. A friendly "couldn't load your trip" message with a retry button would go a long way.

                                                                                                                            
  ## Backlog                                                                                                          
- [x] Smart trip recap / memory book — auto-generated day cards after each day passes, swipeable "Trip Memories" reel at trip end
- [x] Map view for the day — toggle on My Day shows pins color-coded by section with optimal route, Apple/Google Maps deep-link on tap. But don't overload My Day which we just cleaned up. FIgure out a graceful place to surface the Map and directions. Keep a lot of the busier elements on a dialog after a click to not clutter the page.
- [ ] Shared family presence — per-item "who's going" toggles with avatars + real-time "I'm in / I'll skip" via Supabase Realtime
- [ ] Smart pre-trip readiness dashboard — combine docReadiness + packingProgress + weather warnings into single "87% trip-ready" card
- [ ] First-trip onboarding — 3-screen welcome for users joining via /join/[code], includes avatar picker
- [ ] Weather widget under the Trips hero  Embed a 7-day Maui forecast pulled from Open-Meteo (free, no API key). Showing "82°F ☀️" on the hero card would be a wow moment.
- [ ] Reservation badge/reminders  Items marked as `reservation: true` could have a small calendar badge and a note about when to confirm. Could eventually tie into push notifications.

      
## Future Milestone – iOS App (Capacitor)
- [ ] Move `/api/assistant` route to Supabase Edge Function (required for static export)
- [ ] Move `/api/weather` route to Supabase Edge Function (required for static export)
- [ ] Add `output: "export"` to next.config.ts and verify static build works
- [ ] Install and configure Capacitor (`@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`)
- [ ] Fix Unsplash hero image caching for mobile (add Cache-Control or switch to local copies)
- [ ] Replace `next/font` Geist with static CSS import in globals.css
- [ ] Pre-generate app icons as static PNGs in /public (replace next/og icon routes)
- [ ] Configure Capacitor for iOS — bundle ID, display name, splash screen, safe area insets
- [ ] Test full app in iOS Simulator
- [ ] Submit to App Store (requires $99/yr Apple Developer account)
