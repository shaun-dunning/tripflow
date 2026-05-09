# TripFlow – Agent Task List
                                                                                                                        
  ## Critical
  - [ ] Verify Explore→My Day context fix works (ExploreProvider in layout.tsx was committed — confirm item appears on  
  My Day after adding from Explore)                                                                                     
  - [ ] Investigate why Supabase SELECT doesn't return newly inserted agenda_items on page reload (items appear via 
  context bridge but don't persist across sessions)
                                                                 
                                                                                                                      
  ## High Priority                                                                                                      
  - [ ] Add confirmed Reservations from Docs tab to the respective My Day pages
  - [ ] Update AI fallback model: change `claude-3-5-haiku-20241022` → `claude-haiku-4-5-20251001` in `/api/assistant`
  - [ ] Build trip share button on Trips page (the `/join/[code]` route exists — just needs a share button UI)          
                                                                                                                        
  ## Next Up                                                                                                            
  - [ ] Inline activity editing in My Day (tap an item to edit title, time, notes in place)                             
  - [ ] Test and finalize "Add to Trip" day-picker in Explore (todayTripDayId is null pre-trip)
  - [ ]  Loading skeletons  Right now the app probably shows blank/jarring states while Supabase fetches. Adding skeleton loaders (animated grey bars) would make it feel 10x more professional and "app-like."
  - [ ]  Empty state for My Day agenda  If a day has no items yet, there should be a friendly illustration/message + a nudge to add from Explore. Right now it's likely just blank.
  - [ ]  Pull-to-refresh  On mobile, users expect to swipe down to refresh. This is a standard gesture that's currently missing.
  - [ ]  Better error states  If Supabase fails or is offline, the user sees nothing. A friendly "couldn't load your trip" message with a retry button would go a long way.
  - [ ]  Packing list  A simple checklist scoped to the trip (sunscreen, passports, kids' gear). Dead simple to build, huge value for families.
  - [ ]  Weather widget on the hero  Embed a 7-day Maui forecast pulled from Open-Meteo (free, no API key). Showing "82°F ☀️" on the hero card would be a wow moment.
  - [ ]  Trip countdown   "xx days until Maui! 🌺" on the home screen until the trip starts. Families love this.
  - [ ]  Reservation badge/reminders  Items marked as `reservation: true` could have a small calendar badge and a note about when to confirm. Could eventually tie into push notifications.

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

