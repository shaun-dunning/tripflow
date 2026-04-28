/**
 * Shared trip-date utilities.
 * All functions work in local calendar days (no timezone math needed —
 * we just compare date strings against today's local date).
 */

export type TripDateStatus = "upcoming" | "active" | "completed";

export interface TripDateInfo {
  status: TripDateStatus;
  currentDayNumber: number;   // 1-based; 0 = before trip, totalDays+1 = after
  totalDays: number;
  daysUntilTrip: number;      // > 0 when upcoming, 0 when active/completed
  daysLeft: number;           // remaining days INCLUDING today; 0 when completed
  progressPercent: number;    // 0–100
}

/** Parse a "YYYY-MM-DD" string as a local midnight Date (avoids UTC-offset issues). */
function parseLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Today at local midnight. */
function today(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function getTripDateInfo(startDate: string, endDate: string): TripDateInfo {
  const start = parseLocal(startDate);
  const end   = parseLocal(endDate);
  const now   = today();

  const totalDays = diffDays(start, end) + 1;

  if (now < start) {
    const daysUntilTrip = diffDays(now, start);
    return {
      status: "upcoming",
      currentDayNumber: 0,
      totalDays,
      daysUntilTrip,
      daysLeft: totalDays,
      progressPercent: 0,
    };
  }

  if (now > end) {
    return {
      status: "completed",
      currentDayNumber: totalDays + 1,
      totalDays,
      daysUntilTrip: 0,
      daysLeft: 0,
      progressPercent: 100,
    };
  }

  const currentDayNumber = diffDays(start, now) + 1;
  const daysLeft = diffDays(now, end) + 1;
  const progressPercent = Math.round(((currentDayNumber - 1) / totalDays) * 100);

  return {
    status: "active",
    currentDayNumber,
    totalDays,
    daysUntilTrip: 0,
    daysLeft,
    progressPercent,
  };
}

/** Returns a day's status relative to the trip. */
export function getDayStatus(
  dayNumber: number,
  tripInfo: TripDateInfo
): "past" | "today" | "upcoming" {
  if (tripInfo.status === "upcoming") return dayNumber === 1 ? "upcoming" : "upcoming";
  if (tripInfo.status === "completed") return "past";
  if (dayNumber < tripInfo.currentDayNumber) return "past";
  if (dayNumber === tripInfo.currentDayNumber) return "today";
  return "upcoming";
}

/** Format today's date as "Thursday · Jun 5" */
export function formatTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** Format a date range as "Jun 5 – 11, 2026" */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseLocal(startDate);
  const end   = parseLocal(endDate);
  const sMonth = start.toLocaleString("en-US", { month: "short" });
  const eMonth = end.toLocaleString("en-US", { month: "short" });
  const year = end.getFullYear();
  if (sMonth === eMonth) {
    return `${sMonth} ${start.getDate()}–${end.getDate()}, ${year}`;
  }
  return `${sMonth} ${start.getDate()} – ${eMonth} ${end.getDate()}, ${year}`;
}
