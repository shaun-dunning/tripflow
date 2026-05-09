# TripFlow – Agent Task List
                                                                                                                        
  ## Critical
  - [ ] Verify Explore→My Day context fix works (ExploreProvider in layout.tsx was committed — confirm item appears on  
  My Day after adding from Explore)                                                                                     
  - [ ] Investigate why Supabase SELECT doesn't return newly inserted agenda_items on page reload (items appear via 
  context bridge but don't persist across sessions)                                                                     
                                                                                                                      
  ## High Priority                                                                                                      
  - [ ] Update AI fallback model: change `claude-3-5-haiku-20241022` → `claude-haiku-4-5-20251001` in `/api/assistant`
  - [ ] Build trip share button on Trips page (the `/join/[code]` route exists — just needs a share button UI)          
                                                                                                                        
  ## Next Up                                                                                                            
  - [ ] Inline activity editing in My Day (tap an item to edit title, time, notes in place)                             
  - [ ] Test and finalize "Add to Trip" day-picker in Explore (todayTripDayId is null pre-trip)                         
                                                                                                                        
  Step 5: Click "Commit new file"            
