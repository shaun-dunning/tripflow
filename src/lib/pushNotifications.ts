"use client";

import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

export async function registerPushNotifications(userId: string, tripId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { receive } = await PushNotifications.checkPermissions();

  let granted = receive === "granted";
  if (!granted) {
    const result = await PushNotifications.requestPermissions();
    granted = result.receive === "granted";
  }

  if (!granted) return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    await supabase.from("device_tokens").upsert(
      {
        user_id: userId,
        trip_id: tripId,
        token: token.value,
        platform: "ios",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" }
    );
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration error:", err);
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    // App is in foreground — notification arrived silently
    console.log("Push received (foreground):", notification);
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    // User tapped the notification
    const deepLink = action.notification.data?.deepLink as string | undefined;
    if (deepLink && typeof window !== "undefined") {
      window.location.href = deepLink;
    }
  });
}

export async function unregisterPushToken(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await supabase.from("device_tokens").delete().eq("user_id", userId);
}
