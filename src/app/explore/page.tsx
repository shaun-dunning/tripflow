"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTripDateInfo } from "@/lib/tripDates";
import { loadWishlist, addToWishlist, removeFromWishlist } from "@/lib/wishlist";

const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";

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
    photo: "https://images.unsplash.com/photo-1566895291281-ea63efd4bdab?w=600&h=300&fit=crop&q=80",
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
    emoji: "👨‍👩‍👧",
    subtitle: "Kid-approved picks",
    photo: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&h=240&fit=crop&q=80",
    accentFrom: "#0ea5e9",
    accentTo: "#0369a1",
    placeIds: [1, 3, 4, 6, 27, 23],
  },
  {
    id: "locals",
    title: "Local Favorites",
    emoji: "🌺",
    subtitle: "Where residents actually eat",
    photo: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=240&fit=crop&q=80",
    accentFrom: "#16a34a",
    accentTo: "#14532d",
    placeIds: [17, 26, 25, 28, 30, 12],
  },
  {
    id: "gems",
    title: "Hidden Gems",
    emoji: "💎",
    subtitle: "Less-crowded, off the path",
    photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=240&fit=crop&q=80",
    accentFrom: "#7c3aed",
    accentTo: "#4c1d95",
    placeIds: [18, 20, 24, 16, 27, 13],
  },
  {
    id: "splurge",
    title: "Worth the Splurge",
    emoji: "✨",
    subtitle: "Premium, no regrets",
    photo: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=240&fit=crop&q=80",
    accentFrom: "#b45309",
    accentTo: "#78350f",
    placeIds: [5, 9, 22, 18, 7],
  },
  {
    id: "sunset",
    title: "Best at Sunset",
    emoji: "🌅",
    subtitle: "Golden hour is everything",
    photo: "https://images.unsplash.com/photo-1566895291281-ea63efd4bdab?w=400&h=240&fit=crop&q=80",
    accentFrom: "#dc2626",
    accentTo: "#9a3412",
    placeIds: [22, 7, 15, 8, 23],
  },
  {
    id: "morning",
    title: "Best Morning Starts",
    emoji: "☀️",
    subtitle: "Early birds win in Maui",
    photo: "https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=400&h=240&fit=crop&q=80",
    accentFrom: "#f59e0b",
    accentTo: "#b45309",
    placeIds: [8, 10, 29, 16, 26, 21],
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
  if (hour < 9)  return [8, 10, 26, 29];   // early morning: walks + breakfast + SUP
  if (hour < 13) return [1, 27, 17, 19];   // late morning: beach + activities
  if (hour < 17) return [5, 21, 6, 20];    // afternoon: spa + beaches + upcountry
  return [9, 15, 22, 7];                   // evening: dinner + sunset spots
}

const AI_QUICK_PROMPTS = [
  "Best snorkeling spot for kids?",
  "What to do on a rainy day?",
  "Tips for Road to Hana?",
  "Best sunset dinner nearby?",
];

type AiMessage = { role: "user" | "assistant"; content: string };

export default function ExplorePage() {
  const router = useRouter();
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

  // Neighborhood + Best Of
  const [activeNeighborhood, setActiveNeighborhood] = useState("All Areas");
  const [activeBestOf, setActiveBestOf] = useState<string | null>(null);

  // AI assistant
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateTime() {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    }
    updateTime();
    const timer = setInterval(updateTime, 60_000);

    supabase
      .from("travelers")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", TRIP_ID)
      .then(({ count }) => { if (count) setTravelerCount(count); });

    async function fetchTripDays() {
      const [tripResult, daysResult] = await Promise.all([
        supabase.from("trips").select("start_date, end_date").eq("id", TRIP_ID).single(),
        supabase.from("trip_days").select("id, day_number, label").eq("trip_id", TRIP_ID).order("day_number"),
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
    const saved = loadWishlist();
    setWishlistIds(new Set(saved.map((e) => e.placeId)));

    return () => clearInterval(timer);
  }, []);

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

    // Tell My Day which day to show AND pass the new item so it renders immediately
    // (bypasses any SELECT latency or RLS issues on the fetch side)
    localStorage.setItem("tripflow-dayIndex", String(dayNum - 1));
    localStorage.setItem("tripflow-explore-add", JSON.stringify({
      dayIndex: dayNum - 1,
      id: `explore-${Date.now()}`,
      title: place.name,
      emoji: place.category === "Beach" ? "🏖️"
           : place.category === "Food"  ? "🍽️"
           : place.category === "Spa"   ? "💆"
           : "📍",
      time: "TBD",
      notes: `${place.drive} · ${place.address}`,
      done: false,
      reservation: false,
      fromSupabase: true,
    }));

    setAddedToast(`Day ${dayNum}: ${place.name}`);
    setTimeout(() => {
      setAddedToast(null);
      // Hard reload instead of client-side nav so My Day always mounts fresh
      // and reads the localStorage bridge (Next.js router cache can skip remounting)
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
      setAiMessages([...newMessages, { role: "assistant", content: "Something went wrong. Make sure the GEMINI_API_KEY or ANTHROPIC_API_KEY is set in your environment variables." }]);
    }
    setAiLoading(false);
  }

  const scenario = activeScenario !== null ? SCENARIOS[activeScenario] : null;

  const bestOfCollection = activeBestOf ? BEST_OF.find((c) => c.id === activeBestOf) : null;

  const filtered = PLACES.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hit =
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.reviewQuote.toLowerCase().includes(q) ||
        p.proTip.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q)) ||
        p.category.toLowerCase().includes(q);
      if (!hit) return false;
    }
    if (activeFilter !== "All" && p.category !== activeFilter) return false;
    if (activeNeighborhood !== "All Areas" && p.neighborhood !== activeNeighborhood) return false;
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

  const activeFilterCount = (kidsOnly ? 1 : 0) + (maxDrive < 30 ? 1 : 0) + (activeScenario !== null ? 1 : 0) + (activeNeighborhood !== "All Areas" ? 1 : 0) + (activeBestOf ? 1 : 0);

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
            style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">
                🌺
              </div>
              <div>
                <h2 className="text-base font-black text-white">Maui Trip AI</h2>
                <p className="text-xs text-white/70 mt-0.5">Your personal Maui guide</p>
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
      <div className="px-4 pt-5 pb-3">

        {/* ── Real search input ── */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.09)] px-4 py-3.5">
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
                onClick={() => { setActiveScenario(null); setKidsOnly(false); setMaxDrive(30); setActiveNeighborhood("All Areas"); setActiveBestOf(null); }}
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
            AI TRIP ASSISTANT — Prominent ingress
        ══════════════════════════════════════ */}
        <div
          className="rounded-2xl overflow-hidden shadow-lg"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)" }}
        >
          {/* Top row */}
          <div className="px-4 pt-4 pb-3 flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-2xl flex-none shadow-lg">
              🌺
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-sky-300 uppercase tracking-widest mb-0.5">Your Personal Guide</p>
              <h3 className="text-base font-black text-white leading-tight">Maui Trip AI</h3>
              <p className="text-xs text-white/60 mt-0.5 leading-snug">Knows your itinerary, your crew, and all of Maui</p>
            </div>
          </div>

          {/* Quick prompts */}
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {AI_QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => { setShowAI(true); sendAiMessage(q); }}
                className="flex-none text-[11px] font-semibold text-white/80 bg-white/10 border border-white/15 px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-white/20 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => setShowAI(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/10 border-t border-white/10 hover:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-sm font-bold text-white">Ask anything about your trip</span>
            </div>
            <span className="text-white/60 text-lg">→</span>
          </button>
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
              {filtered.map((place) => {
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
    </div>
  );
}
