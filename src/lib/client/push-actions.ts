import { getBrowserEnv } from "@/lib/env";
import { useCosmicStore } from "@/store/cosmic-store";

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function enablePushNotifications() {
  const state = useCosmicStore.getState();
  await state.requestNotificationPermission();

  if (state.reminderPermission !== "granted" && Notification.permission !== "granted") {
    return;
  }

  if (!("serviceWorker" in navigator)) {
    state.setError("This browser does not support service workers.");
    return;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(getBrowserEnv().vapidPublicKey),
    }));

  await state.savePushSubscription(subscription);

  await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
}
