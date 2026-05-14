"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo } from "@/lib/tripDates";
import { loadWishlist, addToWishlist, removeFromWishlist } from "@/lib/wishlist";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTrip } from "@/hooks/useActiveTrip";

type Place = {
  id: number;
  name: string;
  category: string;
  neighborhood: string;
  tags: string[];
  distance: string;
  drive: string;
  price: "$" | "$$" | "$$$";
  kidFriendly: boolean;
  rating: number;
  photo: string;
  photoAlt: string;
  blurb: string;
  address: string;
  // Verified traveler data
  reviewSource: "TripAdvisor" | "Yelp" | "Google";
  reviewCount: number;
  verifiedRating: number;
  reviewQuote: string;
  proTip: string;
};

const PLACES: Place[] = [
  {
    id: 1, name: "Kapalua Beach", category: "Beach", neighborhood: "Ka'anapali",
    tags: ["beach", "activity", "kids", "free"],
    distance: "2.1 mi", drive: "8 min", price: "$", kidFriendly: true, rating: 4.9,
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Kapalua Beach Maui",
    blurb: "Calm, protected bay — perfect for little swimmers. Snorkel gear rentals on-site.",
    address: "Kapalua, Maui",
    reviewSource: "TripAdvisor", reviewCount: 2140, verifiedRating: 5.0,
    reviewQuote: "Most beautiful beach we've ever seen. Completely calm water — our 5-year-old swam the whole time.",
    proTip: "Arrive before 9am. Parking fills fast and the calm morning water is stunning.",
  },
  {
    id: 2, name: "Monkeypod Kitchen", category: "Food", neighborhood: "Wailea",
    tags: ["food", "lunch", "dinner", "kids"],
    distance: "0.8 mi", drive: "4 min", price: "$$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Restaurant interior",
    blurb: "Local farm-to-table favorite. Great cocktails, wood-fired pizza, kids menu available.",
    address: "Wailea, Maui",
    reviewSource: "Yelp", reviewCount: 1820, verifiedRating: 4.5,
    reviewQuote: "The wood-fired pizza and Monkeypod Mai Tai are absolute must-orders. One of our best meals on Maui.",
    proTip: "Walk-ins only — arrive right at opening (11am) or plan for a 30–45 min wait.",
  },
  {
    id: 3, name: "Maui Ocean Center", category: "Activity", neighborhood: "Kihei",
    tags: ["activity", "kids", "rainy"],
    distance: "3.4 mi", drive: "12 min", price: "$$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=300&fit=crop&q=80",
    photoAlt: "Ocean aquarium",
    blurb: "Hawaii's premier aquarium. Sharks, rays, and a walk-through tunnel. Kids love it.",
    address: "Maalaea, Maui",
    reviewSource: "TripAdvisor", reviewCount: 3270, verifiedRating: 4.5,
    reviewQuote: "Our kids talked about the shark tunnel for months. The best rainy-day activity on the island, no contest.",
    proTip: "Book tickets online to skip the line. Plan 2–3 hours — there's more to see than you'd expect.",
  },
  {
    id: 4, name: "Ululani's Hawaiian Shave Ice", category: "Food", neighborhood: "Lahaina",
    tags: ["food", "snack", "kids"],
    distance: "1.2 mi", drive: "5 min", price: "$", kidFriendly: true, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Colorful shave ice",
    blurb: "Best shave ice on the island. Perfect afternoon treat after the beach.",
    address: "Lahaina, Maui",
    reviewSource: "Yelp", reviewCount: 2460, verifiedRating: 4.7,
    reviewQuote: "Absolute game changer. Not ice cream, not a snow cone — something else entirely. Get the mochi and sweet cream.",
    proTip: "The Lahaina location has shorter lines than Kihei. Add azuki beans for an authentic local touch.",
  },
  {
    id: 5, name: "Andaz Maui Spa", category: "Spa", neighborhood: "Wailea",
    tags: ["spa", "adults"],
    distance: "0.3 mi", drive: "2 min", price: "$$$", kidFriendly: false, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=300&fit=crop&q=80",
    photoAlt: "Luxury spa",
    blurb: "World-class treatments with ocean views. Book a couples massage while kids nap.",
    address: "Wailea, Maui",
    reviewSource: "TripAdvisor", reviewCount: 847, verifiedRating: 4.8,
    reviewQuote: "The ocean view during my massage is something I'll never forget. Worth every single penny.",
    proTip: "Book 2+ weeks ahead for morning slots — they go fast. Ask for the lānai room.",
  },
  {
    id: 6, name: "Surfing Goat Dairy", category: "Activity", neighborhood: "Upcountry",
    tags: ["activity", "kids", "unique"],
    distance: "8.2 mi", drive: "22 min", price: "$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=300&fit=crop&q=80",
    photoAlt: "Goat farm",
    blurb: "Working goat farm with tours and tastings. Unique, fun, and surprisingly memorable.",
    address: "Kula, Maui",
    reviewSource: "Yelp", reviewCount: 614, verifiedRating: 4.5,
    reviewQuote: "Kids were in absolute heaven feeding baby goats. Hilarious, memorable, and totally different from anything else on Maui.",
    proTip: "The Grand Dairy Tour includes cheese tasting — worth the upgrade. Book ahead on weekends.",
  },
  {
    id: 7, name: "Down the Hatch", category: "Food", neighborhood: "Lahaina",
    tags: ["food", "drinks", "adults", "lunch"],
    distance: "4.1 mi", drive: "14 min", price: "$$", kidFriendly: true, rating: 4.4,
    photo: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=300&fit=crop&q=80",
    photoAlt: "Tropical cocktails",
    blurb: "Waterfront bar in Lahaina. Great mai tais, fish tacos, casual and fun.",
    address: "Lahaina, Maui",
    reviewSource: "Yelp", reviewCount: 1240, verifiedRating: 4.4,
    reviewQuote: "Best happy hour in all of Lahaina. The fish tacos are legendary and the waterfront view doesn't hurt.",
    proTip: "Grab a waterfront table by arriving 15 min before happy hour. They fill up instantly.",
  },
  {
    id: 8, name: "Wailea Beach Path", category: "Activity", neighborhood: "Wailea",
    tags: ["activity", "kids", "free", "morning"],
    distance: "0.1 mi", drive: "Walk", price: "$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=600&h=300&fit=crop&q=80",
    photoAlt: "Coastal path",
    blurb: "1.5-mile paved coastal walk connecting Wailea's beaches. Stunning views, totally free.",
    address: "Wailea, Maui",
    reviewSource: "TripAdvisor", reviewCount: 3810, verifiedRating: 4.9,
    reviewQuote: "Best free thing on Maui, full stop. Walk it early morning with a coffee — you'll have it nearly to yourself.",
    proTip: "Walk south to north for the best morning light. Ends near a great breakfast spot.",
  },
  {
    id: 9, name: "Mama's Fish House", category: "Food", neighborhood: "North Shore",
    tags: ["food", "dinner", "adults", "seafood"],
    distance: "14.2 mi", drive: "24 min", price: "$$$", kidFriendly: true, rating: 4.9,
    photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=300&fit=crop&q=80",
    photoAlt: "Elegant seaside seafood restaurant",
    blurb: "Legendary farm-to-ocean restaurant. Best seafood on Maui, possibly in Hawaii. Reservations essential.",
    address: "Paia, Maui",
    reviewSource: "TripAdvisor", reviewCount: 8720, verifiedRating: 4.9,
    reviewQuote: "We've been to Michelin-star restaurants around the world. This was better. The catch of the day with Maui onion sauce is life-changing.",
    proTip: "Book 60+ days ahead — they often sell out. Request a table by the ocean. Lunch is slightly easier to book than dinner.",
  },
  {
    id: 10, name: "Kapalua Coastal Trail", category: "Activity", neighborhood: "Ka'anapali",
    tags: ["activity", "free", "morning", "kids"],
    distance: "2.3 mi", drive: "9 min", price: "$", kidFriendly: true, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=600&h=300&fit=crop&q=80",
    photoAlt: "Scenic coastal walking trail",
    blurb: "1.76-mile oceanfront trail connecting Kapalua to D.T. Fleming Beach. Tide pools, sea turtles, and stunning views.",
    address: "Kapalua, Maui",
    reviewSource: "TripAdvisor", reviewCount: 2910, verifiedRating: 4.8,
    reviewQuote: "Saw three sea turtles swimming right below the trail. Completely free, totally magical. Better than any paid tour.",
    proTip: "Walk it early (6–8am) for the best chance of seeing turtles and nearly zero crowds. Bring water.",
  },
  {
    id: 11, name: "Maui Brewing Co.", category: "Food", neighborhood: "Kihei",
    tags: ["food", "drinks", "dinner", "adults"],
    distance: "8.3 mi", drive: "18 min", price: "$$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Craft brewery with mountain views",
    blurb: "Award-winning local craft brewery. Great food, great beer, and open-air seating with mountain views.",
    address: "Kihei, Maui",
    reviewSource: "Yelp", reviewCount: 1540, verifiedRating: 4.5,
    reviewQuote: "The Bikini Blonde is crisp and perfect. Food is legitimately great — not just 'good for a brewery.' Kids love it too.",
    proTip: "The Kihei flagship location has more space and better views than the Lahaina spot. Try the Coconut Hiwa Porter.",
  },
  {
    id: 12, name: "Paia Town", category: "Activity", neighborhood: "North Shore",
    tags: ["activity", "shopping", "unique", "morning"],
    distance: "12.4 mi", drive: "22 min", price: "$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&h=300&fit=crop&q=80",
    photoAlt: "Colorful boutique shopping street",
    blurb: "Funky North Shore surf town with art galleries, boutiques, and great food. Natural start of the Road to Hana.",
    address: "Paia, Maui",
    reviewSource: "TripAdvisor", reviewCount: 4150, verifiedRating: 4.6,
    reviewQuote: "The most charming little town. Every shop has something unique — not the tourist junk you find elsewhere. Go early.",
    proTip: "Park on Baldwin Ave and explore on foot. Paia Fish Market has a line but moves fast — absolutely worth it.",
  },
  {
    id: 13, name: "Makawao Town", category: "Activity", neighborhood: "Upcountry",
    tags: ["activity", "shopping", "unique"],
    distance: "9.1 mi", drive: "20 min", price: "$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Upcountry town with lush scenery",
    blurb: "Cowboy-meets-artsy upcountry town. World-class art galleries, unique boutiques, and old-school bakeries.",
    address: "Makawao, Maui",
    reviewSource: "TripAdvisor", reviewCount: 1820, verifiedRating: 4.5,
    reviewQuote: "Totally unlike anything else on Maui. The art is world-class, the town is charming, and the drive up is beautiful.",
    proTip: "Komoda Store & Bakery sells out of their famous cream puffs by 10am — get there early or miss them.",
  },
  {
    id: 14, name: "Waiʻānapanapa Black Sand Beach", category: "Beach", neighborhood: "Hana",
    tags: ["beach", "activity", "unique", "hana"],
    distance: "49.5 mi", drive: "95 min", price: "$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Dramatic black sand beach with volcanic rock",
    blurb: "Iconic black sand beach in Hana State Park. Dramatic lava rock, blowholes, sea caves, and turquoise water.",
    address: "Hana, Maui",
    reviewSource: "TripAdvisor", reviewCount: 6340, verifiedRating: 4.7,
    reviewQuote: "The most otherworldly beach I've ever seen. Black sand, sea caves, blowholes, turquoise water. Reserve parking ahead — it's worth it.",
    proTip: "State park reservation required — book at parks.hawaii.gov weeks ahead. Best visited mid-morning. Don't swim, current is strong.",
  },
  {
    id: 15, name: "Black Rock Cliff Dive Ceremony", category: "Activity", neighborhood: "Ka'anapali",
    tags: ["activity", "free", "evening", "kids"],
    distance: "0.1 mi", drive: "Walk", price: "$", kidFriendly: true, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Kaanapali beach at golden hour sunset",
    blurb: "Nightly torch-lighting and cliff dive ceremony at Black Rock (Pu'u Keka'a), right at your hotel beach.",
    address: "Ka'anapali, Maui",
    reviewSource: "Google", reviewCount: 5120, verifiedRating: 4.8,
    reviewQuote: "Walked out at 6pm and watched the cliff dive ceremony as the sun set behind the ocean. Completely free, absolutely magical.",
    proTip: "Ceremony is at dusk — roughly 6–6:30pm. Get drinks from Whalers Village and watch from the sand in front of the Sheraton.",
  },
  {
    id: 16, name: "Ho'okipa Beach Park", category: "Beach", neighborhood: "North Shore",
    tags: ["beach", "activity", "free", "morning", "unique"],
    distance: "13.4 mi", drive: "22 min", price: "$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Sea turtles resting on beach",
    blurb: "World-famous windsurfing beach and sea turtle sanctuary. Watch professional windsurfers from the cliff overlook — sea turtles nap on the sand below.",
    address: "Paia, Maui",
    reviewSource: "TripAdvisor", reviewCount: 4210, verifiedRating: 4.8,
    reviewQuote: "Seven sea turtles resting on the beach at once. The cliff overlook view is absolutely stunning — and it's all completely free.",
    proTip: "Visit in the morning when turtles are most active. Do NOT approach them — stay 10 feet back. Combine with Paia Town nearby.",
  },
  {
    id: 17, name: "Paia Fish Market", category: "Food", neighborhood: "North Shore",
    tags: ["food", "lunch", "seafood"],
    distance: "12.8 mi", drive: "22 min", price: "$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=300&fit=crop&q=80",
    photoAlt: "Fish tacos on paper tray",
    blurb: "No-frills local institution. Best fish tacos on the island — paper plates, open windows, lines out the door for good reason.",
    address: "Paia, Maui",
    reviewSource: "Yelp", reviewCount: 3890, verifiedRating: 4.6,
    reviewQuote: "Stood in line for 20 minutes and would do it again. Best fish tacos I've ever had. The mahi mahi plate is legendary.",
    proTip: "Order the fish taco combo and a passionfruit lemonade. Line moves fast. Cash is quickest but they take card.",
  },
  {
    id: 18, name: "Haliimaile General Store", category: "Food", neighborhood: "Upcountry",
    tags: ["food", "dinner", "adults", "unique"],
    distance: "9.5 mi", drive: "22 min", price: "$$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Upscale restaurant dining room",
    blurb: "James Beard-recognized chef Beverly Gannon's legendary upcountry restaurant. Eclectic Hawaii-influenced cuisine in a converted 1920s plantation store.",
    address: "Haliimaile, Maui",
    reviewSource: "TripAdvisor", reviewCount: 2670, verifiedRating: 4.8,
    reviewQuote: "Drove 30 minutes upcountry on a whim and had the best meal of our trip. The pineapple upside-down cake at the end made us cry.",
    proTip: "Reservations strongly recommended. Don't skip the Szechuan salmon appetizer — it's on every best-of-Maui list for a reason.",
  },
  {
    id: 19, name: "Kapalua Ziplines", category: "Activity", neighborhood: "Ka'anapali",
    tags: ["activity", "adventure", "kids"],
    distance: "3.1 mi", drive: "10 min", price: "$$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=600&h=300&fit=crop&q=80",
    photoAlt: "Zipline over tropical forest canopy",
    blurb: "Eight lines soaring over the West Maui pineapple highlands. Views all the way to Molokai. Safe for kids 60+ lbs.",
    address: "Kapalua, Maui",
    reviewSource: "TripAdvisor", reviewCount: 1840, verifiedRating: 4.6,
    reviewQuote: "The guides were incredible and the scenery is breathtaking. Kids were 8 and 10 — both said it was the highlight of the whole trip.",
    proTip: "Book the Plantation Course tour for the longest lines. Morning slots have better visibility before afternoon clouds roll in.",
  },
  {
    id: 20, name: "Ali'i Kula Lavender Farm", category: "Activity", neighborhood: "Upcountry",
    tags: ["activity", "unique", "morning"],
    distance: "9.8 mi", drive: "28 min", price: "$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=300&fit=crop&q=80",
    photoAlt: "Purple lavender fields on hillside",
    blurb: "Stunning 13-acre lavender farm at 4,000 feet with panoramic West Maui views. Scented walking paths, lavender scones, and total serenity.",
    address: "Kula, Maui",
    reviewSource: "TripAdvisor", reviewCount: 2320, verifiedRating: 4.5,
    reviewQuote: "We almost skipped it and it ended up being our favorite hidden gem. The views, the lavender scones, the total quiet. Perfect.",
    proTip: "Combine with Makawao Town (15 min away). Bring a jacket — it's 10-15 degrees cooler than the beach. Buy the lavender shortbread.",
  },
  {
    id: 21, name: "Makena Big Beach", category: "Beach", neighborhood: "Kihei",
    tags: ["beach", "free", "unique"],
    distance: "11.2 mi", drive: "24 min", price: "$", kidFriendly: true, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Pristine wide golden sand beach",
    blurb: "One of Maui's most spectacular undeveloped beaches — half a mile of wide golden sand with no hotels, no vendors. Raw and stunning.",
    address: "Makena, Maui",
    reviewSource: "TripAdvisor", reviewCount: 5680, verifiedRating: 4.8,
    reviewQuote: "This is what you imagine when you picture Maui. Half-mile of perfect golden sand, crystal water, and no crowds if you arrive early.",
    proTip: "Arrive by 8am — limited parking fills by 9:30. Waves can be big; check surf conditions. Little Beach (clothing optional) is around the corner.",
  },
  {
    id: 22, name: "Merriman's Maui", category: "Food", neighborhood: "Ka'anapali",
    tags: ["food", "dinner", "adults", "seafood"],
    distance: "0.8 mi", drive: "4 min", price: "$$$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Elegant beachfront dining at sunset",
    blurb: "Peter Merriman's celebrated farm-to-table restaurant at Whalers Village. Unmatched sunset ocean views and exceptional locally-sourced seafood.",
    address: "Ka'anapali, Maui",
    reviewSource: "TripAdvisor", reviewCount: 3140, verifiedRating: 4.7,
    reviewQuote: "Sunset table right on the water. The Kona kampachi crudo and Molokai prawns were the best bites of our entire Hawaii trip.",
    proTip: "Request sunset seating when you book — and book 2-3 weeks ahead. Happy hour at the bar (3-5pm) is excellent value.",
  },
  {
    id: 23, name: "Whalers Village", category: "Activity", neighborhood: "Ka'anapali",
    tags: ["activity", "shopping", "kids", "free", "evening"],
    distance: "0.5 mi", drive: "3 min", price: "$", kidFriendly: true, rating: 4.4,
    photo: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&h=300&fit=crop&q=80",
    photoAlt: "Beachfront shopping center at sunset",
    blurb: "Beachfront open-air shopping center right on Ka'anapali Beach. Free hula shows, whale museum, restaurants, and sunset views.",
    address: "Ka'anapali, Maui",
    reviewSource: "Google", reviewCount: 6240, verifiedRating: 4.4,
    reviewQuote: "Free hula shows every evening were a highlight for our kids. Great place to browse, grab ice cream, and watch the sunset.",
    proTip: "Free hula shows Monday, Wednesday, Friday and Saturday evenings around 6pm. The whaling museum inside is free and genuinely interesting.",
  },
  {
    id: 24, name: "Garden of Eden Arboretum", category: "Activity", neighborhood: "Hana",
    tags: ["activity", "hana", "unique", "kids"],
    distance: "37.4 mi", drive: "75 min", price: "$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Lush tropical rainforest garden",
    blurb: "26-acre tropical botanical garden on the Road to Hana. The famous Jurassic Park helicopter shot was filmed here. Waterfalls, peacocks, and ocean overlooks.",
    address: "Haiku, Maui",
    reviewSource: "TripAdvisor", reviewCount: 2890, verifiedRating: 4.6,
    reviewQuote: "We've done the Road to Hana twice. This stop is non-negotiable. The view Spielberg chose for Jurassic Park is as stunning in person.",
    proTip: "Best Road to Hana stop between mile markers 10-12. Self-guided tour takes 45-60 min. The peacocks roam free and love kids.",
  },
  {
    id: 25, name: "Star Noodle", category: "Food", neighborhood: "Lahaina",
    tags: ["food", "dinner", "lunch", "adults"],
    distance: "4.8 mi", drive: "14 min", price: "$$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=300&fit=crop&q=80",
    photoAlt: "Asian noodle dishes on wood table",
    blurb: "Lahaina's beloved Asian fusion noodle bar. The garlic noodles and Happy Hour soup dumplings are legendary among repeat visitors.",
    address: "Lahaina, Maui",
    reviewSource: "Yelp", reviewCount: 2740, verifiedRating: 4.6,
    reviewQuote: "Those garlic noodles have haunted me for three years. We drove back twice. Not a typo. Twice. In the same week.",
    proTip: "The Happy Hour (3-5pm) has the best value on Maui — soup dumplings and cocktails at half price. Don't miss the Agedashi tofu.",
  },
  {
    id: 26, name: "Kihei Caffe", category: "Food", neighborhood: "Kihei",
    tags: ["food", "breakfast", "morning"],
    distance: "9.1 mi", drive: "19 min", price: "$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Local breakfast plates",
    blurb: "Cash-only Kihei institution. Massive portions, local prices, BYOB mimosas. The lines mean it's worth it.",
    address: "Kihei, Maui",
    reviewSource: "Yelp", reviewCount: 3180, verifiedRating: 4.5,
    reviewQuote: "Bring cash and bring a bottle of prosecco. The loco moco is the size of your head and costs $12. This is the real Maui.",
    proTip: "Cash only. BYOB means bring your own champagne for mimosas — they provide OJ and glasses. Line is outside but moves in 20-30 min.",
  },
  {
    id: 27, name: "Napili Bay", category: "Beach", neighborhood: "Ka'anapali",
    tags: ["beach", "kids", "free", "morning"],
    distance: "3.8 mi", drive: "11 min", price: "$", kidFriendly: true, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Calm crescent bay with sea turtles",
    blurb: "Crescent-shaped cove just north of Kapalua. Sea turtles come in daily, water stays remarkably calm, and the snorkeling is world-class.",
    address: "Napili, Maui",
    reviewSource: "TripAdvisor", reviewCount: 3920, verifiedRating: 4.8,
    reviewQuote: "Seven sea turtles came right up to us while snorkeling. Our kids will never forget it. The water is like glass even when it's windy.",
    proTip: "Snorkel along the rocky edge on the right (north) side — that's where the turtles feed. Parking is free at Napili Kai Resort lot.",
  },
  {
    id: 28, name: "Three's Bar & Grill", category: "Food", neighborhood: "Kihei",
    tags: ["food", "dinner", "drinks", "adults"],
    distance: "9.3 mi", drive: "20 min", price: "$$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Casual restaurant with tropical drinks",
    blurb: "Beloved South Maui neighborhood restaurant. Creative global small plates, killer cocktails, and a warm local vibe.",
    address: "Kihei, Maui",
    reviewSource: "Yelp", reviewCount: 2120, verifiedRating: 4.5,
    reviewQuote: "This is where locals take visiting friends when they want to impress them. Creative, delicious, not trying too hard. Genuinely great.",
    proTip: "The tuna poke tacos and short rib sliders are the move. Happy hour runs until 6pm — the crafted cocktails are excellent.",
  },
  {
    id: 29, name: "Maui Stand Up Paddle", category: "Activity", neighborhood: "Ka'anapali",
    tags: ["activity", "morning", "adults", "adventure"],
    distance: "0.3 mi", drive: "Walk", price: "$$", kidFriendly: false, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=600&h=300&fit=crop&q=80",
    photoAlt: "Stand up paddleboarding at sunrise",
    blurb: "Sunrise SUP tour along the Ka'anapali coast. Expert guides take you past reefs where green sea turtles surface alongside your board.",
    address: "Ka'anapali, Maui",
    reviewSource: "TripAdvisor", reviewCount: 1240, verifiedRating: 4.7,
    reviewQuote: "I've never paddleboarded before. An hour later I'm gliding through glassy water watching a sea turtle surface three feet away. Peak Hawaii.",
    proTip: "Book the 7am tour for glassy water and guaranteed turtle sightings. All experience levels welcome — they'll have you confident in 10 minutes.",
  },
  {
    id: 30, name: "Charley's Restaurant & Saloon", category: "Food", neighborhood: "North Shore",
    tags: ["food", "breakfast", "dinner", "drinks", "adults"],
    distance: "12.9 mi", drive: "23 min", price: "$", kidFriendly: true, rating: 4.4,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Funky saloon-style restaurant",
    blurb: "Paia institution since 1969. Famous for their enormous breakfasts, random celebrity sightings, and live music nights that feel like Old Hawaii.",
    address: "Paia, Maui",
    reviewSource: "Yelp", reviewCount: 1870, verifiedRating: 4.4,
    reviewQuote: "Willie Nelson used to play here. That alone earns five stars. The breakfast burritos are massive and perfect. Classic old Maui.",
    proTip: "Go for breakfast — massive portions at local prices. Check their Facebook for live music nights. Cash is faster but they take cards.",
  },
  {
    id: 31, name: "Flatbread Company", category: "Food", neighborhood: "North Shore",
    tags: ["food", "dinner", "lunch", "kids"],
    distance: "12.4 mi", drive: "22 min", price: "$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=300&fit=crop&q=80",
    photoAlt: "Wood-fired pizza with fresh toppings",
    blurb: "Paia's beloved wood-fired pizza spot with an emphasis on organic, locally sourced ingredients. Kids love the casual energy; adults love the craft beers.",
    address: "Paia, Maui",
    reviewSource: "Yelp", reviewCount: 2180, verifiedRating: 4.6,
    reviewQuote: "The best pizza outside of Italy — no exaggeration. The organic ingredients make a difference you can actually taste. Kids were obsessed.",
    proTip: "Tuesdays are benefit nights (10% goes to local charity). Arrive at opening — it fills up fast and they don't take reservations.",
  },
  {
    id: 32, name: "Leoda's Kitchen & Pie Shop", category: "Food", neighborhood: "Ka'anapali",
    tags: ["food", "breakfast", "lunch", "kids", "unique"],
    distance: "5.2 mi", drive: "11 min", price: "$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=600&h=300&fit=crop&q=80",
    photoAlt: "Artisan pie slices on display",
    blurb: "Roadside gem in Olowalu famous for their banana cream and chocolate haupia pies. Cozy breakfast sandwiches, fresh soups, and some of the best pie on the island.",
    address: "Olowalu, Maui",
    reviewSource: "TripAdvisor", reviewCount: 3140, verifiedRating: 4.7,
    reviewQuote: "The banana cream pie ruined all other pie for me forever. My husband went back the next day just for pie. No regrets.",
    proTip: "Go early — the most popular pies (banana cream, chocolate haupia) sell out by 2pm. The grilled cheese sandwich is criminally underrated.",
  },
  {
    id: 33, name: "The Plantation House", category: "Food", neighborhood: "Ka'anapali",
    tags: ["food", "dinner", "adults", "breakfast"],
    distance: "3.4 mi", drive: "10 min", price: "$$$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Fine dining overlooking green golf course",
    blurb: "Elevated farm-to-table dining perched above the Kapalua Golf Course with sweeping ocean views. The breakfast is legendary; the sunset dinner even more so.",
    address: "Kapalua, Maui",
    reviewSource: "TripAdvisor", reviewCount: 2890, verifiedRating: 4.7,
    reviewQuote: "Breakfast here with those views is the perfect start to a Maui day. The eggs benedict is exceptional and the coffee is locally sourced. Worth every cent.",
    proTip: "The breakfast is the best deal — same stunning views, lower price. Reserve a table on the lanai. Portions are generous.",
  },
  {
    id: 34, name: "Pipiwai Trail (Bamboo Forest)", category: "Activity", neighborhood: "Hana",
    tags: ["activity", "hana", "unique", "morning"],
    distance: "52.3 mi", drive: "105 min", price: "$", kidFriendly: true, rating: 4.9,
    photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=300&fit=crop&q=80",
    photoAlt: "Dense towering bamboo forest path",
    blurb: "The crown jewel of Road to Hana — a 4-mile round-trip hike through a magical bamboo forest to the 400-ft Waimoku Falls. Absolutely unforgettable.",
    address: "Haleakalā National Park, Hana",
    reviewSource: "TripAdvisor", reviewCount: 7820, verifiedRating: 4.9,
    reviewQuote: "Walking through the bamboo section felt like being in a different world. Then the waterfall appears and your jaw drops. Best hike on Maui, no debate.",
    proTip: "Requires Haleakalā National Park entry ($35/car). Start early — trail gets crowded by 10am. The bamboo section makes an eerie, musical sound in the wind.",
  },
  {
    id: 35, name: "Lahaina Banyan Tree Park", category: "Activity", neighborhood: "Lahaina",
    tags: ["activity", "free", "kids", "morning", "unique"],
    distance: "4.6 mi", drive: "14 min", price: "$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=600&h=300&fit=crop&q=80",
    photoAlt: "Massive historic banyan tree spreading over plaza",
    blurb: "A sprawling, 150-year-old banyan tree that covers nearly an acre of the historic Lahaina waterfront. The largest banyan in the US — kids can run wild in its root networks.",
    address: "Lahaina, Maui",
    reviewSource: "Google", reviewCount: 8940, verifiedRating: 4.6,
    reviewQuote: "We spent an hour just exploring the roots and branches with our kids. It's completely free and genuinely one of the most impressive living things I've ever seen.",
    proTip: "Free parking 2 blocks away on Shaw Street. Art shows happen under the tree on Saturdays. Go early to beat the tour groups.",
  },
  {
    id: 36, name: "D.T. Fleming Beach", category: "Beach", neighborhood: "Ka'anapali",
    tags: ["beach", "free", "morning", "unique"],
    distance: "3.1 mi", drive: "10 min", price: "$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Wild, wide crescent beach with breaking waves",
    blurb: "One of the most scenic beaches in all of Maui — a wide, wild crescent with ironwood trees and fewer crowds than Ka'anapali. Popular with bodysurfers and boogie boarders.",
    address: "Kapalua, Maui",
    reviewSource: "TripAdvisor", reviewCount: 3240, verifiedRating: 4.7,
    reviewQuote: "We stumbled on this instead of Kapalua Beach and found pure paradise. Less crowded, dramatic surf, beautiful ironwood trees. A much better vibe.",
    proTip: "Strong shore break — not great for small kids but incredible for bodysurfers. Free parking lot fills by 9am. Walk north along the coast for the best photos.",
  },
  {
    id: 37, name: "Honolua Bay", category: "Beach", neighborhood: "Ka'anapali",
    tags: ["beach", "activity", "unique", "morning"],
    distance: "4.8 mi", drive: "13 min", price: "$", kidFriendly: true, rating: 4.8,
    photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=300&fit=crop&q=80",
    photoAlt: "Crystal clear bay with coral reef snorkeling",
    blurb: "A protected marine preserve with some of the best snorkeling in West Maui. When surf is flat, the visibility is extraordinary — coral gardens, reef fish, and sea turtles.",
    address: "Kapalua, Maui",
    reviewSource: "TripAdvisor", reviewCount: 4180, verifiedRating: 4.8,
    reviewQuote: "Snorkeled here as the sun came up. Counted over 40 species of fish in 30 minutes. The coral is pristine. Skip Molokini if you find this.",
    proTip: "Only snorkel when surf is under 2 feet — in big swells this is a world-class surf break only. Short walk down a dirt path from roadside parking. No facilities.",
  },
  {
    id: 38, name: "Maui Tropical Plantation", category: "Activity", neighborhood: "Ka'anapali",
    tags: ["activity", "kids", "unique", "morning"],
    distance: "7.8 mi", drive: "18 min", price: "$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=300&fit=crop&q=80",
    photoAlt: "Tropical plantation with tram and mountains",
    blurb: "45-acre working plantation with a narrated tram tour through pineapple, papaya, coffee, and macadamia orchards. The Mill House restaurant is exceptional.",
    address: "Waikapu, Maui",
    reviewSource: "TripAdvisor", reviewCount: 2670, verifiedRating: 4.5,
    reviewQuote: "The tram tour is surprisingly educational and the produce stand had the best pineapple I've ever tasted. Kids loved every second of the tour.",
    proTip: "Tram tours run on the hour. The Mill House restaurant attached is excellent for lunch — farm-to-table with ingredients from the plantation itself. Book ahead.",
  },
  {
    id: 39, name: "Baby Beach", category: "Beach", neighborhood: "Lahaina",
    tags: ["beach", "kids", "free", "morning"],
    distance: "5.1 mi", drive: "14 min", price: "$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Calm shallow beach perfect for toddlers",
    blurb: "A small, calm beach behind a protective reef — the shallowest, safest swimming spot on Maui for little kids. Barely waist-deep even far out.",
    address: "Lahaina, Maui",
    reviewSource: "Yelp", reviewCount: 1820, verifiedRating: 4.5,
    reviewQuote: "Our 2-year-old splashed around for two hours in knee-deep water. We felt completely safe. This is the Maui beach for families with very small kids.",
    proTip: "Street parking on Front Street. Best before 10am before it gets crowded. Bring your own shade — no facilities. Combine with Banyan Tree Park nearby.",
  },
  {
    id: 40, name: "5 Palms Restaurant", category: "Food", neighborhood: "Kihei",
    tags: ["food", "breakfast", "lunch", "adults", "drinks"],
    distance: "10.4 mi", drive: "22 min", price: "$$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=300&fit=crop&q=80",
    photoAlt: "Oceanfront brunch table with sunset view",
    blurb: "Stunning oceanfront dining right on Keawakapu Beach in Kihei. The weekly sunset dinner and Sunday brunch on the beach is one of the most romantic meals on Maui.",
    address: "Kihei, Maui",
    reviewSource: "TripAdvisor", reviewCount: 2140, verifiedRating: 4.6,
    reviewQuote: "Sat six feet from the ocean at sunset. The fresh catch of the day was flawless and the cocktails were perfect. One of our top three meals ever.",
    proTip: "Sunday brunch on the sand is legendary — book 2+ weeks ahead. The weekday sunset dinner is slightly easier to get in but equally beautiful.",
  },
  {
    id: 41, name: "Grandma's Coffee House", category: "Food", neighborhood: "Upcountry",
    tags: ["food", "breakfast", "morning", "unique", "adults"],
    distance: "14.1 mi", drive: "35 min", price: "$", kidFriendly: true, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&h=300&fit=crop&q=80",
    photoAlt: "Cozy upcountry cafe with coffee and pastries",
    blurb: "A genuine upcountry institution since 1984. Single-origin Maui coffee grown right on the property, homemade pastries, and a porch overlooking Kula's rolling hills.",
    address: "Keokea, Maui",
    reviewSource: "Yelp", reviewCount: 1560, verifiedRating: 4.7,
    reviewQuote: "The best coffee I've ever had anywhere in the world. I don't even say that lightly. Grown on-site, roasted on-site, brewed perfectly. The view is free.",
    proTip: "Combine with the Upcountry Farmer's Market nearby. Cash preferred. Bring a jacket — Keokea is cooler and often misty. Open until 5pm.",
  },
  {
    id: 42, name: "Kapalua Wine & Food Festival", category: "Activity", neighborhood: "Ka'anapali",
    tags: ["activity", "adults", "drinks", "unique"],
    distance: "3.0 mi", drive: "10 min", price: "$$$", kidFriendly: false, rating: 4.7,
    photo: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=300&fit=crop&q=80",
    photoAlt: "Wine tasting at oceanfront luxury resort",
    blurb: "One of the most prestigious food & wine events in the Pacific. World-class chefs, renowned winemakers, and stunning Ka'anapali views — held each June.",
    address: "Kapalua, Maui",
    reviewSource: "TripAdvisor", reviewCount: 890, verifiedRating: 4.7,
    reviewQuote: "James Beard winners cooking against a backdrop of the Pacific Ocean. This is the kind of bucket-list experience you talk about for years.",
    proTip: "Check kapaluawineandfoodfestival.com for exact June dates. Individual events sell out — book specific dinners early. The Grand Tasting is the most accessible event.",
  },
  {
    id: 43, name: "Kō Restaurant", category: "Food", neighborhood: "Wailea",
    tags: ["food", "dinner", "adults", "unique"],
    distance: "1.2 mi", drive: "5 min", price: "$$$", kidFriendly: true, rating: 4.6,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Elegant restaurant with Hawaiian-inspired decor",
    blurb: "Fairmont Kea Lani's farm-to-table restaurant celebrating the multicultural plantation heritage of Maui. Creative Hawaii regional cuisine by award-winning chefs.",
    address: "Wailea, Maui",
    reviewSource: "TripAdvisor", reviewCount: 1920, verifiedRating: 4.6,
    reviewQuote: "The heirloom tomato salad and Kiawe-smoked pork were perfection. A sophisticated, unique menu that tells the story of Maui's history through food.",
    proTip: "The 'Kō Table' experience (private chef's menu in the kitchen) is extraordinary if you can book it. Request sunset timing. Dress: resort elegant.",
  },
  {
    id: 44, name: "Maui Ocean Center Whale Discovery Center", category: "Activity", neighborhood: "Ka'anapali",
    tags: ["activity", "kids", "rainy", "unique"],
    distance: "5.3 mi", drive: "14 min", price: "$$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=300&fit=crop&q=80",
    photoAlt: "Whale exhibit with life-size model",
    blurb: "World-class whale education center at Maalaea Harbor. Life-size humpback skeleton, interactive exhibits, and the best rainy-day activity for kids outside of the main aquarium.",
    address: "Maalaea, Maui",
    reviewSource: "Google", reviewCount: 2340, verifiedRating: 4.5,
    reviewQuote: "The life-size whale model hanging from the ceiling blew our minds. Kids were speechless. Perfect for a rainy afternoon and more educational than we expected.",
    proTip: "Combines perfectly with a Maalaea boat tour departure. The tide pools outside are free and just as fascinating for kids. Parking is easy at Maalaea Harbor.",
  },
  {
    id: 45, name: "Leilani's on the Beach", category: "Food", neighborhood: "Ka'anapali",
    tags: ["food", "dinner", "lunch", "drinks", "adults", "kids"],
    distance: "0.4 mi", drive: "2 min", price: "$$", kidFriendly: true, rating: 4.5,
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop&q=80",
    photoAlt: "Beachfront restaurant with ocean dining",
    blurb: "Right on Ka'anapali Beach at Whalers Village — the best beachfront casual dining near the Sheraton. Great fish, cold drinks, and sand between your toes.",
    address: "Ka'anapali, Maui",
    reviewSource: "Yelp", reviewCount: 3280, verifiedRating: 4.5,
    reviewQuote: "Literally feet from the sand. The fish tacos and mai tais while watching whales breach offshore. This is what a Maui lunch should be.",
    proTip: "Downstairs Leilani's is casual (walk-in). Upstairs Hula Grill is more upscale. Happy hour 3-5pm is the best deal for beachfront dining on the strip.",
  },
];

// ── Verified Traveler Routes ────────────────────────────────────────────────
type TravelerRoute = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  dayTheme: string;
  photo: string;
  accentColor: string;
  steps: { time: string; placeId: number; note: string }[];
};

const TRAVELER_ROUTES: TravelerRoute[] = [
  {
    id: "road-to-hana",
    title: "Perfect Road to Hana",
    subtitle: "Verified by 2,800+ travelers",
    emoji: "🚗",
    dayTheme: "Day 3 · Sun Jun 7",
    photo: "https://images.unsplash.com/photo-1542259009477-d625272157b7?w=600&h=240&fit=crop&q=80",
    accentColor: "#16a34a",
    steps: [
      { time: "7:00am", placeId: 34, note: "Start here — beat the crowds" },
      { time: "9:30am", placeId: 24, note: "Jurassic Park viewpoint" },
      { time: "12:00pm", placeId: 14, note: "Black sand beach — don't swim" },
      { time: "2:00pm", placeId: 34, note: "Bamboo forest & waterfall" },
    ],
  },
  {
    id: "upcountry-morning",
    title: "Upcountry Morning Loop",
    subtitle: "Verified by 1,400+ travelers",
    emoji: "🌄",
    dayTheme: "Best on Day 5",
    photo: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=240&fit=crop&q=80",
    accentColor: "#7c3aed",
    steps: [
      { time: "7:30am", placeId: 41, note: "World's best coffee with views" },
      { time: "9:00am", placeId: 20, note: "Lavender scones + panorama" },
      { time: "10:30am", placeId: 13, note: "Art + Komoda cream puffs" },
      { time: "12:30pm", placeId: 6, note: "Feed baby goats" },
    ],
  },
  {
    id: "west-maui-beach",
    title: "West Maui Beach Crawl",
    subtitle: "Verified by 3,200+ travelers",
    emoji: "🏖️",
    dayTheme: "Any beach day",
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&h=240&fit=crop&q=80",
    accentColor: "#0ea5e9",
    steps: [
      { time: "8:00am", placeId: 37, note: "Best snorkel of your life" },
      { time: "10:00am", placeId: 1, note: "Calm water for kids" },
      { time: "12:30pm", placeId: 45, note: "Feet in the sand dining" },
      { time: "6:00pm", placeId: 15, note: "Free cliff dive ceremony" },
    ],
  },
];

const CATEGORIES = [
  { label: "All",      icon: "◉",  key: "All"      },
  { label: "Beach",    icon: "🌊", key: "Beach"    },
  { label: "Food",     icon: "🍜", key: "Food"     },
  { label: "Activity", icon: "🪁", key: "Activity"  },
  { label: "Spa",      icon: "🌺", key: "Spa"       },
];

const NEIGHBORHOODS = [
  "All Areas",
  "Ka'anapali",
  "Lahaina",
  "Wailea",
  "Kihei",
  "North Shore",
  "Upcountry",
  "Hana",
];

type Collection = {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  photo: string;
  accentFrom: string;
  accentTo: string;
  placeIds: number[];
};

const BEST_OF: Collection[] = [
  {
    id: "families",
    title: "Best for Families",
    emoji: "🧒",
    subtitle: "Kid-approved picks",
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&h=240&fit=crop&q=80",
    accentFrom: "#0ea5e9",
    accentTo: "#0369a1",
    placeIds: [1, 3, 4, 6, 27, 23, 39, 35, 38],
  },
  {
    id: "locals",
    title: "Local Favorites",
    emoji: "🌺",
    subtitle: "Where residents actually eat",
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=240&fit=crop&q=80",
    accentFrom: "#16a34a",
    accentTo: "#14532d",
    placeIds: [17, 26, 25, 28, 30, 12, 32, 41],
  },
  {
    id: "gems",
    title: "Hidden Gems",
    emoji: "💎",
    subtitle: "Less-crowded, off the path",
    photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=240&fit=crop&q=80",
    accentFrom: "#7c3aed",
    accentTo: "#4c1d95",
    placeIds: [18, 20, 24, 16, 27, 13, 36, 37, 41],
  },
  {
    id: "splurge",
    title: "Worth the Splurge",
    emoji: "✨",
    subtitle: "Premium, no regrets",
    photo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=240&fit=crop&q=80",
    accentFrom: "#b45309",
    accentTo: "#78350f",
    placeIds: [5, 9, 22, 18, 7, 33, 43],
  },
  {
    id: "sunset",
    title: "Best at Sunset",
    emoji: "🌅",
    subtitle: "Golden hour is everything",
    photo: "https://images.unsplash.com/photo-1566895291281-ea63efd4bdab?w=400&h=240&fit=crop&q=80",
    accentFrom: "#dc2626",
    accentTo: "#9a3412",
    placeIds: [22, 7, 15, 8, 23, 40, 45],
  },
  {
    id: "morning",
    title: "Best Morning Starts",
    emoji: "☀️",
    subtitle: "Early birds win in Maui",
    photo: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=400&h=240&fit=crop&q=80",
    accentFrom: "#f59e0b",
    accentTo: "#b45309",
    placeIds: [8, 10, 29, 16, 26, 21, 33, 41],
  },
];

const TRIP_DAYS_INFO = [
  { dayNum: 1, date: "Fri · Jun 5",  theme: "Travel Day",       emoji: "✈️" },
  { dayNum: 2, date: "Sat · Jun 6",  theme: "Beach + Snorkel",  emoji: "🏖️" },
  { dayNum: 3, date: "Sun · Jun 7",  theme: "Road to Hana",     emoji: "🚗" },
  { dayNum: 4, date: "Mon · Jun 8",  theme: "Beach + Spa",      emoji: "💆" },
  { dayNum: 5, date: "Tue · Jun 9",  theme: "Free Day",         emoji: "🌺" },
  { dayNum: 6, date: "Wed · Jun 10", theme: "Haleakalā Sunrise",emoji: "🌋" },
  { dayNum: 7, date: "Thu · Jun 11", theme: "Fly Home",         emoji: "🏠" },
];

const SCENARIOS = [
  { label: "Quick lunch", emoji: "🌮", tags: ["lunch"], maxDrive: 10 },
  { label: "Kids activity", emoji: "👦", tags: ["activity"], maxDrive: 30 },
  { label: "Rain plan", emoji: "🌧️", tags: ["rainy"], maxDrive: 30 },
  { label: "Need drinks", emoji: "🍹", tags: ["drinks"], maxDrive: 20 },
  { label: "Free & close", emoji: "🆓", tags: ["free"], maxDrive: 10 },
  { label: "Spa treat", emoji: "✨", tags: ["spa"], maxDrive: 10 },
];

const PRICE_LABELS = { "$": "Budget", "$$": "Mid-range", "$$$": "Splurge" };

function driveMinutes(drive: string): number {
  if (drive === "Walk") return 0;
  return parseInt(drive);
}

function getWhatNowIds(hour: number): number[] {
  if (hour < 9)  return [8, 10, 26, 29, 41, 33];   // early morning: walks + breakfast + SUP
  if (hour < 13) return [1, 27, 17, 19, 37, 36];   // late morning: beach + activities
  if (hour < 17) return [5, 21, 6, 20, 40, 32];    // afternoon: spa + beaches + upcountry
  return [9, 15, 22, 7, 45, 25];                   // evening: dinner + sunset spots
}

// Smart time-aware section labels
function getTimeContext(hour: number): { label: string; emoji: string; subtitle: string } {
  if (hour < 9)  return { label: "Best Right Now", emoji: "🌅", subtitle: "Early morning picks — before the crowds" };
  if (hour < 13) return { label: "Best Right Now", emoji: "☀️", subtitle: "Morning activity & dining picks" };
  if (hour < 17) return { label: "Best Right Now", emoji: "🌴", subtitle: "Afternoon — relax, explore, or spa" };
  return { label: "Best Tonight", emoji: "🌙", subtitle: "Sunset spots & evening dining" };
}

const NEIGHBORHOOD_GUIDE = [
  {
    name: "Ka'anapali",
    emoji: "🏖️",
    vibe: "Beach Strip",
    bestFor: "Beaches · Sunsets · Resort life",
    timeToVisit: "All day",
    photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=200&fit=crop&q=80",
    accent: "from-sky-600 to-blue-800",
  },
  {
    name: "Wailea",
    emoji: "✨",
    vibe: "Luxury South",
    bestFor: "Spa · Fine dining · Coastal walks",
    timeToVisit: "Mornings & evenings",
    photo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300&h=200&fit=crop&q=80",
    accent: "from-amber-600 to-orange-800",
  },
  {
    name: "Lahaina",
    emoji: "🌺",
    vibe: "Historic Town",
    bestFor: "History · Waterfront · Art galleries",
    timeToVisit: "Early morning",
    photo: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=300&h=200&fit=crop&q=80",
    accent: "from-rose-600 to-pink-900",
  },
  {
    name: "Kihei",
    emoji: "🌊",
    vibe: "Local Vibe",
    bestFor: "Casual eats · Surf · Happy hour",
    timeToVisit: "3–6 PM",
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=300&h=200&fit=crop&q=80",
    accent: "from-teal-600 to-cyan-900",
  },
  {
    name: "North Shore",
    emoji: "🌿",
    vibe: "Wild & Funky",
    bestFor: "Paia · Fish tacos · Windsurfing",
    timeToVisit: "Morning",
    photo: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop&q=80",
    accent: "from-emerald-600 to-green-900",
  },
  {
    name: "Upcountry",
    emoji: "🌄",
    vibe: "Cool & Scenic",
    bestFor: "Farms · Lavender · Best coffee",
    timeToVisit: "Early morning",
    photo: "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=300&h=200&fit=crop&q=80",
    accent: "from-violet-600 to-purple-900",
  },
  {
    name: "Hana",
    emoji: "🗺️",
    vibe: "Remote & Raw",
    bestFor: "Waterfalls · Black sand · Solitude",
    timeToVisit: "Full day trip",
    photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=200&fit=crop&q=80",
    accent: "from-slate-600 to-slate-900",
  },
  {
    name: "Kapalua",
    emoji: "🦋",
    vibe: "Secluded North",
    bestFor: "Sea turtles · Ziplines · Golf",
    timeToVisit: "Morning",
    photo: "https://images.unsplash.com/photo-1566895291281-ea63efd4bdab?w=300&h=200&fit=crop&q=80",
    accent: "from-indigo-600 to-blue-900",
  },
];

const AI_QUICK_PROMPTS = [
  "Best snorkeling spot for kids?",
  "What to do on a rainy day?",
  "Tips for Road to Hana?",
  "Best sunset dinner nearby?",
];

type AiMessage = { role: "user" | "assistant"; content: string };

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const activeTrip = useActiveTrip(user);
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [maxDrive, setMaxDrive] = useState(30);
  const [kidsOnly, setKidsOnly] = useState(false);
  const [showWhatNow, setShowWhatNow] = useState(false);
  const [location, setLocation] = useState("Ka'anapali");
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState("Ka'anapali");
  const [showFilters, setShowFilters] = useState(false);
  const [travelerCount, setTravelerCount] = useState(4);
  const [currentTime, setCurrentTime] = useState("");

  // "Added to trip" toast
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // All trip days: dayNum → trip_day_id
  const [tripDayMap, setTripDayMap] = useState<Record<number, string>>({});
  // dayNum → editable label from trip_days.label
  const [dayLabels, setDayLabels] = useState<Record<number, string>>({});
  const [todayDayNum, setTodayDayNum] = useState<number | null>(null);

  // Day picker sheet
  const [dayPickerPlace, setDayPickerPlace] = useState<Place | null>(null);
  const [dayPickerAdding, setDayPickerAdding] = useState(false);

  // Wishlist (saved for later)
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [wishlistSavedToast, setWishlistSavedToast] = useState<string | null>(null);

  // Expanded card
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Neighborhood + Best Of + Source
  const [activeNeighborhood, setActiveNeighborhood] = useState("All Areas");
  const [activeBestOf, setActiveBestOf] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);

  // Traveler Routes
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  // Sort
  const [sortBy, setSortBy] = useState<"top-reviewed" | "highest-rated" | "closest">("top-reviewed");

  // AI assistant
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchParams.get("ai") === "1") {
      queueMicrotask(() => setShowAI(true));
    }
  }, [searchParams]);

  useEffect(() => {
    function updateTime() {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    }
    updateTime();
    const timer = setInterval(updateTime, 60_000);

    if (activeTrip.activeTripId) {
      supabase
        .from("travelers")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", activeTrip.activeTripId)
        .then(({ count }) => { if (count) setTravelerCount(count); });
    }

    async function fetchTripDays() {
      if (!activeTrip.activeTripId) return;
      const [tripResult, daysResult] = await Promise.all([
        supabase.from("trips").select("start_date, end_date").eq("id", activeTrip.activeTripId).maybeSingle(),
        supabase.from("trip_days").select("id, day_number, label").eq("trip_id", activeTrip.activeTripId).order("day_number"),
      ]);

      if (tripResult.data) {
        const info = getTripDateInfo(tripResult.data.start_date, tripResult.data.end_date);
        if (info.status === "active") setTodayDayNum(info.currentDayNumber);
      }

      if (daysResult.data) {
        const map: Record<number, string> = {};
        const labels: Record<number, string> = {};
        daysResult.data.forEach((d) => {
          map[d.day_number] = d.id;
          if (d.label) {
            const parts = (d.label as string).split(" · ");
            labels[d.day_number] = parts.length > 1 ? parts.slice(1).join(" · ") : d.label;
          }
        });
        setTripDayMap(map);
        setDayLabels(labels);
      }
    }
    fetchTripDays();

    // Load wishlist
    queueMicrotask(() => {
      const saved = loadWishlist();
      setWishlistIds(new Set(saved.map((e) => e.placeId)));
    });

    return () => clearInterval(timer);
  }, [activeTrip.activeTripId]);

  useEffect(() => {
    aiBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  async function addToDay(place: Place, dayNum: number) {
    const tripDayId = tripDayMap[dayNum];
    setDayPickerAdding(true);

    if (!tripDayId) {
      setDayPickerAdding(false);
      setDayPickerPlace(null);
      setAddedToast(`Couldn't find day ${dayNum}`);
      setTimeout(() => setAddedToast(null), 2000);
      return;
    }

    const { data: existing } = await supabase
      .from("agenda_items")
      .select("sort_order")
      .eq("trip_day_id", tripDayId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error: insertError } = await supabase.from("agenda_items").insert({
      trip_day_id: tripDayId,
      title: place.name,
      subtitle: `${place.drive} · ${place.address}`,
      emoji: place.category === "Beach" ? "🏖️"
           : place.category === "Food"  ? "🍽️"
           : place.category === "Spa"   ? "💆"
           : "📍",
      time: "TBD",
      done: false,
      sort_order: (existing?.sort_order ?? 0) + 10,
      is_reservation: false,
    });

    setDayPickerAdding(false);
    setDayPickerPlace(null);

    if (insertError) {
      console.error("addToDay insert error:", insertError);
      setAddedToast(`Error: ${insertError.message}`);
      setTimeout(() => setAddedToast(null), 4000);
      return;
    }

    // Write the target day to localStorage so My Day restores it on fresh mount.
    localStorage.setItem("daywave-dayIndex", String(dayNum - 1));

    // Use a full page reload instead of router.push so My Day always mounts fresh,
    // re-runs fetchData, and picks up the newly inserted Supabase item.
    // (router.push serves My Day from the Next.js router cache — a frozen component
    //  that doesn't re-run effects or re-fetch data.)
    setAddedToast(`Day ${dayNum}: ${place.name}`);
    setTimeout(() => {
      setAddedToast(null);
      window.location.href = "/";
    }, 1500);
  }

  function toggleWishlist(place: Place) {
    if (wishlistIds.has(place.id)) {
      removeFromWishlist(place.id);
      setWishlistIds((prev) => { const n = new Set(prev); n.delete(place.id); return n; });
    } else {
      addToWishlist({
        placeId: place.id,
        name: place.name,
        category: place.category,
        drive: place.drive,
        photo: place.photo,
        photoAlt: place.photoAlt,
      });
      setWishlistIds((prev) => new Set([...prev, place.id]));
      setDayPickerPlace(null);
      setWishlistSavedToast(place.name);
      setTimeout(() => setWishlistSavedToast(null), 2000);
    }
  }

  async function sendAiMessage(text?: string) {
    const messageText = (text ?? aiInput).trim();
    if (!messageText || aiLoading) return;
    setAiInput("");
    const newMessages: AiMessage[] = [...aiMessages, { role: "user", content: messageText }];
    setAiMessages(newMessages);
    setAiLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, history: newMessages }),
      });
      const data = await res.json();
      setAiMessages([...newMessages, { role: "assistant", content: data.reply ?? "Sorry, I couldn't get a response." }]);
    } catch {
      setAiMessages([...newMessages, {
        role: "assistant",
        content: "I couldn't reach the trip assistant just now. Your Explore page still works, so try again in a moment or keep browsing nearby picks.",
      }]);
    }
    setAiLoading(false);
  }

  const scenario = activeScenario !== null ? SCENARIOS[activeScenario] : null;

  const bestOfCollection = activeBestOf ? BEST_OF.find((c) => c.id === activeBestOf) : null;

  const isSearching = searchQuery.trim().length > 0;

  const filtered = PLACES.filter((p) => {
    if (isSearching) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.reviewQuote.toLowerCase().includes(q) ||
        p.proTip.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
      // When actively searching, bypass proximity/scenario/collection filters
      // so you can always find a specific place by name regardless of drive time
    }
    if (activeFilter !== "All" && p.category !== activeFilter) return false;
    if (activeNeighborhood !== "All Areas" && p.neighborhood !== activeNeighborhood) return false;
    if (activeSource && p.reviewSource !== activeSource) return false;
    if (kidsOnly && !p.kidFriendly) return false;
    if (driveMinutes(p.drive) > maxDrive) return false;
    if (scenario && !scenario.tags.some((t) => p.tags.includes(t))) return false;
    if (bestOfCollection && !bestOfCollection.placeIds.includes(p.id)) return false;
    return true;
  });

  // Top picks by verifiedRating × log(reviewCount) — shown in Traveler Picks strip
  const travelerPicks = [...PLACES]
    .sort((a, b) => b.verifiedRating * Math.log(b.reviewCount) - a.verifiedRating * Math.log(a.reviewCount))
    .slice(0, 3);

  const activeFilterCount = (kidsOnly ? 1 : 0) + (maxDrive < 30 ? 1 : 0) + (activeScenario !== null ? 1 : 0) + (activeNeighborhood !== "All Areas" ? 1 : 0) + (activeBestOf ? 1 : 0) + (activeSource ? 1 : 0);

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (sortBy === "highest-rated") return b.verifiedRating - a.verifiedRating || b.reviewCount - a.reviewCount;
    if (sortBy === "closest") return driveMinutes(a.drive) - driveMinutes(b.drive);
    return b.reviewCount - a.reviewCount;
  });

  // Top picks per review source (used for "Verified by" sections)
  const topBySource = (source: string) =>
    [...PLACES]
      .filter((p) => p.reviewSource === source)
      .sort((a, b) => b.verifiedRating * Math.log(b.reviewCount) - a.verifiedRating * Math.log(a.reviewCount))
      .slice(0, 4);

  return (
    <div className="flex flex-col bg-white relative">

      {/* ── "Saved for later" toast ── */}
      {wishlistSavedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-amber-700 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>🔖</span>
          <span className="truncate max-w-[200px]">{wishlistSavedToast}</span>
          <span className="text-white/70">saved for later</span>
        </div>
      )}

      {/* ── "Added to trip" toast ── */}
      {addedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>✅</span>
          <span className="truncate max-w-[220px]">{addedToast}</span>
          <span className="text-white/60">added!</span>
        </div>
      )}

      {/* ── Day Picker Sheet ── */}
      <div className={`fixed inset-0 z-[65] flex flex-col justify-end max-w-md mx-auto transition-opacity duration-200 ${dayPickerPlace ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !dayPickerAdding && setDayPickerPlace(null)} />
        <div className={`relative bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${dayPickerPlace ? "translate-y-0" : "translate-y-full"}`}>

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-none">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 pt-2 pb-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-none">
              {dayPickerPlace?.category === "Beach" ? "🏖️"
                : dayPickerPlace?.category === "Food" ? "🍽️"
                : dayPickerPlace?.category === "Spa"  ? "💆"
                : "📍"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add to trip</p>
              <p className="text-sm font-black text-slate-900 leading-tight truncate">{dayPickerPlace?.name}</p>
            </div>
            <button onClick={() => setDayPickerPlace(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold flex-none">
              ✕
            </button>
          </div>

          {/* Day list */}
          <div className="px-4 pt-3 pb-8 flex flex-col gap-2 max-h-[65vh] overflow-y-auto">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pick a day — or save for later</p>
            {TRIP_DAYS_INFO.map((d) => {
              const isToday = d.dayNum === todayDayNum;
              const hasDayId = !!tripDayMap[d.dayNum];
              return (
                <button
                  key={d.dayNum}
                  onClick={() => dayPickerPlace && addToDay(dayPickerPlace, d.dayNum)}
                  disabled={dayPickerAdding || !hasDayId}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                    isToday
                      ? "bg-sky-50 border-sky-200 hover:bg-sky-100"
                      : "bg-white border-slate-100 hover:bg-slate-50"
                  } disabled:opacity-40`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-none ${isToday ? "bg-sky-500" : "bg-slate-100"}`}>
                    <span>{d.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">Day {d.dayNum} · {dayLabels[d.dayNum] ?? d.theme}</p>
                      {isToday && (
                        <span className="text-[9px] font-bold bg-sky-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{d.date}</p>
                  </div>
                  {dayPickerAdding
                    ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin flex-none" />
                    : <span className="text-slate-300 text-lg flex-none">›</span>
                  }
                </button>
              );
            })}

            {/* Save for Later */}
            <div className="border-t border-slate-100 pt-3 mt-1">
              {dayPickerPlace && wishlistIds.has(dayPickerPlace.id) ? (
                <button
                  onClick={() => dayPickerPlace && toggleWishlist(dayPickerPlace)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                >
                  🗑️ Remove from saved list
                </button>
              ) : (
                <button
                  onClick={() => dayPickerPlace && toggleWishlist(dayPickerPlace)}
                  className="w-full flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-xl">🔖</span>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold text-amber-900">Save for later</p>
                    <p className="text-[11px] text-amber-600 mt-0.5">We&apos;ll remind you when there&apos;s a free slot</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Trip Assistant overlay ── */}
      {showAI && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white max-w-md mx-auto">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pt-5 pb-4 flex-none"
            style={{ background: "linear-gradient(135deg, #061832 0%, #12385f 62%, #2f8f96 100%)" }}
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/daywave-icon-512.png"
                alt="Daywave"
                className="h-10 w-10 rounded-2xl shadow-lg shadow-black/20"
              />
              <div>
                <h2 className="text-base font-black text-white">Daywave AI</h2>
                <p className="text-xs text-white/70 mt-0.5">Your day-of Maui guide</p>
              </div>
            </div>
            <button
              onClick={() => setShowAI(false)}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-base font-bold"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-slate-50">
            {aiMessages.length === 0 && (
              <div className="flex flex-col gap-3 py-4">
                <div className="flex flex-col items-center gap-2 mb-3">
                  <p className="text-sm font-bold text-slate-700 text-center">Hi! I know all about your Maui trip.</p>
                  <p className="text-xs text-slate-400 text-center">Ask about activities, restaurants, packing tips, road to Hana, kids stuff — anything!</p>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Try asking:</p>
                {AI_QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setShowAI(true); sendAiMessage(q); }}
                    className="text-left text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-2xl px-4 py-3 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white text-xs flex-none mr-2 mt-0.5">
                    🌺
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-sky-600 text-white rounded-tr-sm"
                      : "bg-white text-slate-800 rounded-tl-sm shadow-sm border border-slate-100"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {aiLoading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white text-xs flex-none mr-2">
                  🌺
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center shadow-sm border border-slate-100">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={aiBottomRef} />
          </div>

          {/* Input */}
          <div className="flex-none px-4 pt-3 pb-6 border-t border-slate-100 bg-white flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendAiMessage()}
              placeholder="Ask about Maui…"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-sky-400"
            />
            <button
              onClick={() => sendAiMessage()}
              disabled={!aiInput.trim() || aiLoading}
              className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-500 text-white rounded-2xl flex items-center justify-center font-bold text-base disabled:opacity-40"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          SEARCH HEADER
      ══════════════════════════════════════ */}
      <div className="relative h-40 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=480&fit=crop&q=85"
          alt="Maui shoreline"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-950/18 to-sky-950/5" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-8">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/14 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            {currentTime || "Maui"} · {location}
          </div>
          <h1 className="text-3xl font-black leading-none tracking-tight text-white">
            Explore nearby
          </h1>
        </div>
      </div>

      <div className="px-4 -mt-7 pb-3 relative z-10">

        {/* ── Real search input ── */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-white shadow-[0_14px_34px_rgba(15,23,42,0.18)] px-4 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-400 flex-none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search beaches, dining, activities…"
            className="flex-1 text-sm font-medium text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold flex-none hover:bg-slate-200 transition-colors"
            >
              ✕
            </button>
          ) : (
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`relative w-9 h-9 rounded-full border-2 flex items-center justify-center flex-none transition-all ${
                showFilters || activeFilterCount > 0
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              {activeFilterCount > 0 && !showFilters && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── Context chips + location ── */}
        <div className="flex items-center gap-2 mt-3 px-1">
          <button
            onClick={() => { setLocationInput(location); setEditingLocation(true); }}
            className="flex items-center gap-1 text-xs text-slate-500 font-medium hover:text-slate-700 transition-colors"
          >
            <span>📍</span>
            {editingLocation ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = locationInput.trim();
                  if (trimmed) setLocation(trimmed);
                  setEditingLocation(false);
                }}
              >
                <input
                  autoFocus
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onBlur={() => {
                    const trimmed = locationInput.trim();
                    if (trimmed) setLocation(trimmed);
                    setEditingLocation(false);
                  }}
                  className="text-xs font-semibold text-slate-900 outline-none bg-transparent w-28"
                  placeholder="Area on Maui…"
                />
              </form>
            ) : (
              <span className="font-semibold text-slate-700">{location}</span>
            )}
          </button>
          <span className="text-slate-200">·</span>
          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span>🕒</span> {currentTime}
          </span>
          <span className="text-slate-200">·</span>
          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span>👨‍👩‍👧‍👦</span> {travelerCount}
          </span>
          <button
            onClick={() => setKidsOnly(!kidsOnly)}
            className={`ml-auto flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              kidsOnly ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-500 border-slate-200"
            }`}
          >
            👦 Kids OK
          </button>
        </div>

        {/* ── Expandable filter panel ── */}
        {showFilters && (
          <div className="mt-3 bg-slate-50 rounded-2xl p-3 flex flex-col gap-3 border border-slate-100">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">What do you need?</p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {SCENARIOS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveScenario(activeScenario === i ? null : i)}
                    className={`flex-none flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full border whitespace-nowrap transition-colors ${
                      activeScenario === i
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Max drive time</p>
                <span className="text-[10px] font-bold text-slate-700">{maxDrive === 30 ? "Any distance" : `${maxDrive} min`}</span>
              </div>
              <input
                type="range" min={5} max={30} step={5} value={maxDrive}
                onChange={(e) => setMaxDrive(Number(e.target.value))}
                className="w-full h-1.5 accent-slate-900 cursor-pointer"
              />
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={() => { setActiveScenario(null); setKidsOnly(false); setMaxDrive(30); setActiveNeighborhood("All Areas"); setActiveBestOf(null); setActiveSource(null); }}
                className="text-xs font-semibold text-rose-500 self-start"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          CATEGORY TABS
      ══════════════════════════════════════ */}
      <div className="border-b border-slate-100">
        <div className="flex overflow-x-auto px-4 gap-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => {
            const active = activeFilter === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveFilter(cat.key)}
                className={`flex-none flex flex-col items-center gap-1 px-4 py-3 transition-all border-b-2 ${
                  active ? "border-slate-900" : "border-transparent"
                }`}
              >
                <span className={`text-xl leading-none ${active ? "opacity-100" : "opacity-50"}`}>
                  {cat.icon}
                </span>
                <span className={`text-[11px] font-semibold whitespace-nowrap ${
                  active ? "text-slate-900" : "text-slate-400"
                }`}>
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Neighborhood chips ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-none">Area:</span>
        {NEIGHBORHOODS.map((n) => {
          const active = activeNeighborhood === n;
          return (
            <button
              key={n}
              onClick={() => setActiveNeighborhood(n)}
              className={`flex-none text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                active
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* ── Verified Source filter ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-50 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-none">Source:</span>
        {[
          { key: null,           label: "All Reviews",   color: activeSource === null ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200" },
          { key: "TripAdvisor",  label: "TripAdvisor",   color: activeSource === "TripAdvisor" ? "bg-[#00AF87] text-white border-[#00AF87]" : "bg-white text-slate-500 border-slate-200" },
          { key: "Yelp",         label: "Yelp",          color: activeSource === "Yelp" ? "bg-[#D32323] text-white border-[#D32323]" : "bg-white text-slate-500 border-slate-200" },
          { key: "Google",       label: "Google",        color: activeSource === "Google" ? "bg-[#4285F4] text-white border-[#4285F4]" : "bg-white text-slate-500 border-slate-200" },
        ].map((s) => (
          <button
            key={String(s.key)}
            onClick={() => setActiveSource(s.key)}
            className={`flex-none text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${s.color}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-4">

        {/* ══════════════════════════════════════
            BEST OF COLLECTIONS
        ══════════════════════════════════════ */}
        {!searchQuery && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black text-slate-900">Best Of Maui</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Curated from TripAdvisor, Yelp & Google</p>
              </div>
              {activeBestOf && (
                <button
                  onClick={() => setActiveBestOf(null)}
                  className="text-[11px] font-semibold text-rose-500"
                >
                  Clear ✕
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {BEST_OF.map((col) => {
                const isActive = activeBestOf === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => setActiveBestOf(isActive ? null : col.id)}
                    className={`flex-none w-44 rounded-2xl overflow-hidden text-left transition-all active:scale-[0.97] ${
                      isActive ? "ring-2 ring-slate-900 ring-offset-1" : ""
                    }`}
                  >
                    <div className="relative h-28 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={col.photo} alt={col.title} className="w-full h-full object-cover" />
                      <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(160deg, ${col.accentFrom}cc 0%, ${col.accentTo}ee 100%)` }}
                      />
                      {isActive && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <span className="text-slate-900 text-[10px] font-black">✓</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
                        <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-0.5">
                          {col.subtitle}
                        </p>
                        <p className="text-sm font-black text-white leading-tight">{col.emoji} {col.title}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            NEIGHBORHOOD EXPLORER
        ══════════════════════════════════════ */}
        {!searchQuery && !activeBestOf && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black text-slate-900">Explore by Area</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Each neighborhood has its own personality</p>
              </div>
              {activeNeighborhood !== "All Areas" && (
                <button onClick={() => setActiveNeighborhood("All Areas")} className="text-[11px] font-semibold text-rose-500">Clear ✕</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {NEIGHBORHOOD_GUIDE.map((hood) => {
                const count = PLACES.filter((p) => p.neighborhood === hood.name).length;
                const isActive = activeNeighborhood === hood.name;
                return (
                  <button
                    key={hood.name}
                    onClick={() => setActiveNeighborhood(isActive ? "All Areas" : hood.name)}
                    className={`relative rounded-2xl overflow-hidden text-left transition-all active:scale-[0.97] ${isActive ? "ring-2 ring-slate-900 ring-offset-1" : ""}`}
                    style={{ aspectRatio: "1.7/1" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={hood.photo} alt={hood.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${hood.accent} opacity-70`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {isActive && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <span className="text-slate-900 text-[10px] font-black">✓</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
                      <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest">{hood.vibe}</p>
                      <p className="text-xs font-black text-white leading-tight">{hood.emoji} {hood.name}</p>
                      {count > 0 && (
                        <p className="text-[9px] text-white/60 mt-0.5">{count} place{count !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {activeNeighborhood !== "All Areas" && (() => {
              const hood = NEIGHBORHOOD_GUIDE.find((h) => h.name === activeNeighborhood);
              if (!hood) return null;
              return (
                <div className="mt-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">{hood.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900">{hood.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{hood.bestFor}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Best time: {hood.timeToVisit}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Saved for Later ── */}
        {wishlistIds.size > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔖</span>
                <p className="text-sm font-bold text-slate-800">Saved for later</p>
              </div>
              <span className="text-[11px] text-slate-400">{wishlistIds.size} place{wishlistIds.size !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {PLACES.filter((p) => wishlistIds.has(p.id)).map((place) => (
                <div key={place.id} className="flex-none w-44 bg-white rounded-2xl overflow-hidden border border-amber-100 shadow-sm">
                  <div className="relative h-24 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <button
                      onClick={() => toggleWishlist(place)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-[10px] font-bold"
                    >
                      ✕
                    </button>
                    <span className="absolute bottom-2 left-2.5 text-[10px] font-bold text-white/80">{place.drive}</span>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-bold text-slate-900 leading-tight truncate">{place.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{place.category}</p>
                    <button
                      onClick={() => setDayPickerPlace(place)}
                      className="mt-2 w-full bg-slate-900 text-white text-[10px] font-bold py-1.5 rounded-lg"
                    >
                      Add to Trip →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            SMART TIME: OPEN NOW / BEST RIGHT NOW
            Feature 1: time-aware contextual picks
        ══════════════════════════════════════ */}
        {!isSearching && !activeBestOf && (
          <div>
            {(() => {
              const hour = new Date().getHours();
              const timeCtx = getTimeContext(hour);
              const nowIds = getWhatNowIds(hour);
              const nowPlaces = nowIds.map((id) => PLACES.find((p) => p.id === id)).filter(Boolean) as Place[];
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{timeCtx.emoji}</span>
                        <p className="text-sm font-black text-slate-900">{timeCtx.label}</p>
                        <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">Live</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 pl-6">{timeCtx.subtitle}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{currentTime}</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {nowPlaces.slice(0, 5).map((place) => (
                      <button
                        key={place.id}
                        onClick={() => setExpandedId(expandedId === place.id ? null : place.id)}
                        className="flex-none w-44 bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm text-left active:scale-[0.97] transition-transform"
                      >
                        <div className="relative h-28 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                            Open
                          </div>
                          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            <span className="text-amber-400">★</span>
                            <span>{place.verifiedRating.toFixed(1)}</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
                            <p className="text-[9px] text-white/60 font-semibold">{place.neighborhood}</p>
                            <p className="text-xs font-bold text-white leading-tight">{place.name}</p>
                          </div>
                        </div>
                        <div className="px-2.5 py-2.5">
                          <div className="flex items-center gap-1 mb-1.5">
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">{place.drive}</span>
                            <span className="text-slate-200">·</span>
                            <span className="text-[9px] font-semibold text-slate-400">{place.price}</span>
                            {place.kidFriendly && <span className="text-[9px] font-semibold text-emerald-500">· Kid OK</span>}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDayPickerPlace(place); }}
                            className="w-full bg-slate-900 text-white text-[10px] font-bold py-1.5 rounded-xl"
                          >
                            + Add to Trip
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Search result count ── */}
        {isSearching && (
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900">
              {filtered.length === 0
                ? "No results"
                : `${filtered.length} place${filtered.length !== 1 ? "s" : ""} found`}
            </p>
            <span className="text-xs text-slate-400">for &ldquo;{searchQuery}&rdquo;</span>
            <button
              onClick={() => setSearchQuery("")}
              className="ml-auto text-[11px] font-semibold text-rose-500"
            >
              Clear ✕
            </button>
          </div>
        )}

        {/* ── Verified by Source — curated strips ── */}
        {!isSearching && !activeBestOf && (
          <div className="flex flex-col gap-6">
            {[
              { source: "TripAdvisor", label: "Top on TripAdvisor", badge: "bg-[#00AF87] text-white", icon: "🦉", sub: "Ranked by traveler reviews" },
              { source: "Yelp",        label: "Yelp Favorites",     badge: "bg-[#D32323] text-white", icon: "⭐", sub: "Highest-rated by local community" },
              { source: "Google",      label: "Google Best",        badge: "bg-[#4285F4] text-white", icon: "🔍", sub: "Top picks from Google Maps" },
            ]
              .filter((s) => !activeSource || activeSource === s.source)
              .map((s) => {
                const picks = topBySource(s.source);
                return (
                  <div key={s.source}>
                    <div className="flex items-center gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${s.badge}`}>{s.source}</span>
                          <p className="text-sm font-black text-slate-900">{s.label}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
                      </div>
                      {!activeSource && (
                        <button
                          onClick={() => setActiveSource(s.source)}
                          className="ml-auto text-[11px] font-semibold text-slate-400 hover:text-slate-700 flex-none"
                        >
                          See all →
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                      {picks.map((place) => (
                        <button
                          key={place.id}
                          onClick={() => setExpandedId(expandedId === place.id ? null : place.id)}
                          className="flex-none w-48 bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm text-left active:scale-[0.97] transition-transform"
                        >
                          <div className="relative h-28 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              <span className="text-amber-400">★</span>
                              <span>{place.verifiedRating.toFixed(1)}</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
                              <p className="text-[9px] text-white/60 font-semibold">{place.neighborhood}</p>
                              <p className="text-xs font-bold text-white leading-tight">{place.name}</p>
                            </div>
                          </div>
                          <div className="px-2.5 py-2">
                            <p className="text-[9px] text-slate-500 leading-snug line-clamp-2 italic">
                              &ldquo;{place.reviewQuote.slice(0, 80)}…&rdquo;
                            </p>
                            <p className="text-[9px] text-slate-400 mt-1">{place.reviewCount.toLocaleString()} reviews · {place.drive}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDayPickerPlace(place); }}
                              className="mt-2 w-full text-[10px] font-bold bg-slate-900 text-white py-1.5 rounded-lg"
                            >
                              + Add to Trip
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ── Traveler Picks ── */}
        {!searchQuery && !activeBestOf && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black text-slate-900">Traveler Picks</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Top-ranked by verified visitors</p>
              </div>
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1">
                <span className="text-amber-500 text-[11px]">★</span>
                <span className="text-[10px] font-bold text-amber-700">Verified</span>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {travelerPicks.map((place, rankIdx) => {
                const rankLabels = ["#1 Pick", "#2 Pick", "#3 Pick"];
                const rankColors = ["bg-amber-400 text-amber-900", "bg-slate-300 text-slate-700", "bg-orange-300 text-orange-900"];
                return (
                  <button
                    key={place.id}
                    onClick={() => setExpandedId(expandedId === place.id ? null : place.id)}
                    className="flex-none w-56 bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-md text-left active:scale-[0.97] transition-transform"
                  >
                    <div className="relative h-36 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                      {/* Rank badge */}
                      <div className={`absolute top-2.5 left-2.5 text-[10px] font-black px-2 py-0.5 rounded-full ${rankColors[rankIdx]}`}>
                        {rankLabels[rankIdx]}
                      </div>
                      {/* Rating badge */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        <span className="text-amber-400">★</span>
                        <span>{place.verifiedRating.toFixed(1)}</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                        <p className="text-[10px] font-semibold text-white/60 mb-0.5">{place.neighborhood} · {place.reviewSource}</p>
                        <p className="text-sm font-bold text-white leading-tight">{place.name}</p>
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 italic">
                        &ldquo;{place.reviewQuote.split(".")[0]}.&rdquo;
                      </p>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="text-[10px] text-slate-400">{place.drive} · {place.price} · {place.reviewCount.toLocaleString()} reviews</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDayPickerPlace(place); }}
                        className="mt-2 w-full text-[11px] font-bold bg-slate-900 text-white py-2 rounded-xl"
                      >
                        + Add to Trip
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── What Now? ── */}
        {!showWhatNow ? (
          <button
            onClick={() => setShowWhatNow(true)}
            className="w-full flex items-center gap-4 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-2xl px-4 py-4 shadow-md shadow-sky-200 text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-none">
              🤔
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">What should we do right now?</p>
              <p className="text-xs text-white/80 mt-0.5">Tap for instant context-aware suggestions</p>
            </div>
            <span className="text-white/80 text-lg">→</span>
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Right now · Your context</p>
                <button onClick={() => setShowWhatNow(false)} className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-600">
                  ✕ close
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { icon: "🕒", text: currentTime },
                  { icon: "👨‍👩‍👧‍👦", text: `${travelerCount} travelers` },
                  { icon: "📍", text: `Near ${location}` },
                ].map((chip) => (
                  <span key={chip.text} className="flex items-center gap-1 text-xs font-medium bg-white text-indigo-700 border border-indigo-100 px-2 py-1 rounded-full">
                    {chip.icon} {chip.text}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Best picks for right now</p>
              <div className="flex flex-col gap-3">
                {getWhatNowIds(new Date().getHours()).map((id) => {
                  const place = PLACES.find((p) => p.id === id)!;
                  return (
                    <div key={place.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex">
                      <div className="relative w-24 flex-none overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-slate-800 text-sm truncate">{place.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{place.drive} · {place.price}</p>
                          <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">{place.blurb}</p>
                        </div>
                        <button
                          onClick={() => setDayPickerPlace(place)}
                          className="mt-2 self-start bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg"
                        >
                          + Add to Trip
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TRAVELER ROUTES — Feature 3
            Verified day-trip routes from real visitors
        ══════════════════════════════════════ */}
        {!isSearching && !activeBestOf && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black text-slate-900">Verified Traveler Routes</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Optimized day itineraries from thousands of visitors</p>
              </div>
              <div className="flex items-center gap-1 bg-sky-50 border border-sky-100 rounded-full px-2.5 py-1">
                <span className="text-sky-500 text-[10px]">✓</span>
                <span className="text-[10px] font-bold text-sky-700">Verified</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {TRAVELER_ROUTES.map((route) => {
                const isOpen = expandedRoute === route.id;
                return (
                  <div key={route.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                    <button
                      onClick={() => setExpandedRoute(isOpen ? null : route.id)}
                      className="w-full text-left"
                    >
                      <div className="relative h-32 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={route.photo} alt={route.title} className="w-full h-full object-cover" />
                        <div
                          className="absolute inset-0"
                          style={{ background: `linear-gradient(160deg, ${route.accentColor}99 0%, ${route.accentColor}cc 100%)` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                          {route.subtitle}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                          <p className="text-[10px] font-semibold text-white/70 mb-0.5">{route.dayTheme}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-base font-black text-white">{route.emoji} {route.title}</p>
                            <span className="text-white/60 text-sm">{isOpen ? "↑" : "↓"}</span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 py-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Optimal order · verified by travelers</p>
                        <div className="flex flex-col gap-2">
                          {route.steps.map((step, idx) => {
                            const place = PLACES.find((p) => p.id === step.placeId);
                            if (!place) return null;
                            return (
                              <div key={idx} className="flex items-center gap-3">
                                <div className="flex flex-col items-center flex-none">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600">
                                    {idx + 1}
                                  </div>
                                  {idx < route.steps.length - 1 && <div className="w-0.5 h-4 bg-slate-100 mt-0.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400 tabular-nums">{step.time}</span>
                                    <p className="text-sm font-bold text-slate-900 truncate">{place.name}</p>
                                  </div>
                                  <p className="text-[10px] text-slate-400 leading-snug">{step.note} · {place.drive}</p>
                                </div>
                                <button
                                  onClick={() => setDayPickerPlace(place)}
                                  className="flex-none text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-xl hover:bg-slate-900 hover:text-white transition-colors"
                                >
                                  + Add
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-50 flex gap-2">
                          <button
                            onClick={() => {
                              route.steps.forEach((step) => {
                                const place = PLACES.find((p) => p.id === step.placeId);
                                if (place) setDayPickerPlace(place);
                              });
                            }}
                            className="flex-1 bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl"
                          >
                            Add all to trip →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AI slim banner ── */}
        <button
          onClick={() => setShowAI(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-sky-50 hover:from-indigo-100 hover:to-sky-100 transition-colors shadow-sm"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-base flex-none shadow-sm">
            ✨
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight">Ask Daywave AI</p>
            <p className="text-[11px] text-slate-500 truncate">What should we do this afternoon?</p>
          </div>
          <span className="text-slate-400 text-sm">→</span>
        </button>

        {/* Quick prompts row */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
          {AI_QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => { setShowAI(true); sendAiMessage(q); }}
              className="flex-none text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-indigo-100 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* ── Results ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-800">
              {filtered.length} {filtered.length === 1 ? "place" : "places"}
              {searchQuery ? ` for "${searchQuery}"` : bestOfCollection ? ` · ${bestOfCollection.emoji} ${bestOfCollection.title}` : activeFilter !== "All" ? ` · ${activeFilter}` : ""}
              {activeNeighborhood !== "All Areas" ? ` · ${activeNeighborhood}` : ""}
              {scenario ? ` · ${scenario.label}` : ""}
            </p>
            {(searchQuery || activeFilter !== "All" || scenario || kidsOnly || maxDrive < 30 || activeNeighborhood !== "All Areas" || activeBestOf) && (
              <button
                onClick={() => { setSearchQuery(""); setActiveFilter("All"); setActiveScenario(null); setKidsOnly(false); setMaxDrive(30); setActiveNeighborhood("All Areas"); setActiveBestOf(null); }}
                className="text-xs font-semibold text-rose-500"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Sort bar */}
          {filtered.length > 1 && (
            <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-none">Sort:</span>
              {[
                { key: "top-reviewed" as const, label: "Most Reviewed" },
                { key: "highest-rated" as const, label: "Highest Rated" },
                { key: "closest" as const, label: "Closest" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`flex-none text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                    sortBy === opt.key
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-500 border-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
              <span className="text-3xl">🔭</span>
              <p className="text-sm font-medium">Nothing matches right now</p>
              <button
                onClick={() => { setSearchQuery(""); setActiveFilter("All"); setActiveScenario(null); setKidsOnly(false); setMaxDrive(30); }}
                className="text-xs text-slate-900 font-semibold mt-1 underline underline-offset-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedFiltered.map((place) => {
                const isExpanded = expandedId === place.id;
                return (
                  <div key={place.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                    {/* Photo */}
                    <div
                      className="relative h-40 w-full overflow-hidden cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : place.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={place.photo} alt={place.photoAlt} className="w-full h-full object-cover" />
                      {/* Verified rating badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        <span className="text-amber-400">★</span>
                        <span>{place.verifiedRating.toFixed(1)}</span>
                        <span className="text-white/60 font-normal">{place.reviewSource}</span>
                      </div>
                      {place.kidFriendly && !wishlistIds.has(place.id) && (
                        <span className="absolute top-3 right-3 text-[10px] font-bold bg-white/85 backdrop-blur-sm text-emerald-700 px-2 py-1 rounded-full">
                          👦 Kids
                        </span>
                      )}
                      {wishlistIds.has(place.id) && (
                        <span className="absolute top-3 right-3 text-[10px] font-bold bg-amber-500 text-white px-2 py-1 rounded-full">
                          🔖 Saved
                        </span>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="px-4 py-3">
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedId(isExpanded ? null : place.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm">{place.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{place.address} · {place.category}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium flex-none mt-0.5">{isExpanded ? "↑ Less" : "↓ More"}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{place.blurb}</p>
                        {!isExpanded && (
                          <p className="text-[11px] text-slate-400 italic mt-1.5 leading-snug line-clamp-1">
                            &ldquo;{place.reviewQuote.split(".")[0].trim()}.&rdquo;
                          </p>
                        )}
                      </button>

                      {/* Expanded: Verified review + Pro tip */}
                      {isExpanded && (
                        <>
                          <div className="mt-3 pt-3 border-t border-slate-50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Travelers say</p>
                            <p className="text-xs text-slate-500 italic leading-relaxed">
                              &ldquo;{place.reviewQuote}&rdquo;
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-[10px] font-bold text-amber-500">★ {place.verifiedRating.toFixed(1)}</span>
                              <span className="text-[10px] text-slate-400">· {place.reviewCount.toLocaleString()} reviews on {place.reviewSource}</span>
                            </div>
                          </div>
                          <div className="mt-2.5 bg-amber-50 rounded-xl px-3 py-2 flex gap-2 items-start">
                            <span className="text-sm flex-none">💡</span>
                            <p className="text-[11px] text-amber-800 leading-snug">{place.proTip}</p>
                          </div>
                        </>
                      )}

                      {/* Drive + price row */}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-slate-600 font-semibold">
                          🚗 {place.drive}
                        </span>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs text-slate-500">{place.price} · {PRICE_LABELS[place.price]}</span>
                        <div className="ml-auto flex gap-2">
                          {!isExpanded && (
                            <button
                              onClick={() => setExpandedId(place.id)}
                              className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              Reviews ↓
                            </button>
                          )}
                          <button
                            onClick={() => setDayPickerPlace(place)}
                            className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                          >
                            + Add to Trip
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Floating AI button ── */}
      {!showAI && (
        <button
          onClick={() => setShowAI(true)}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#061832] to-[#2f8f96] py-2 pl-2 pr-4 shadow-lg transition-all active:scale-95"
          style={{ boxShadow: "0 8px 26px rgba(6,24,50,0.28)" }}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[13px] leading-none shadow-sm">✨</span>
          <span className="text-sm font-bold text-white">Ask AI</span>
        </button>
      )}

    </div>
  );
}
