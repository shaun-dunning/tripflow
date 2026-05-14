const WISHLIST_KEY = "daywave-wishlist-maui26";

export type WishlistEntry = {
  placeId: number;
  name: string;
  category: string;
  drive: string;
  photo: string;
  photoAlt: string;
  savedAt: number;
};

export function loadWishlist(): WishlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]") as WishlistEntry[];
  } catch { return []; }
}

export function addToWishlist(entry: Omit<WishlistEntry, "savedAt">): void {
  const list = loadWishlist();
  if (list.some((e) => e.placeId === entry.placeId)) return;
  list.push({ ...entry, savedAt: Date.now() });
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

export function removeFromWishlist(placeId: number): void {
  const list = loadWishlist().filter((e) => e.placeId !== placeId);
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

export function isInWishlist(placeId: number): boolean {
  return loadWishlist().some((e) => e.placeId === placeId);
}
