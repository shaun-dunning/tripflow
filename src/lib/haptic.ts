export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
