/**
 * Firebase Cloud Messaging — browser push notification setup.
 *
 * This module:
 *  1. Initialises the FCM Messaging instance
 *  2. Requests notification permission
 *  3. Retrieves the FCM registration token
 *  4. Registers the token with the CleanSight backend
 *  5. Listens for foreground messages and shows them as toasts
 *
 * The `firebase-messaging-sw.js` service worker in /public handles
 * background (app closed / tab not focused) messages from FCM.
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import app from './firebase';
import { toast } from 'sonner';

export const messaging = getMessaging(app);

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Request notification permission and obtain the FCM token.
 * Returns the token string, or null if permission was denied or unavailable.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!('Notification' in window)) {
    console.warn('[FCM] Notifications are not supported in this browser.');
    return null;
  }

  if (!VAPID_KEY) {
    console.warn('[FCM] VITE_FIREBASE_VAPID_KEY is not set. Push notifications disabled.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[FCM] Notification permission denied.');
      return null;
    }

    // Register the service worker first so FCM can use it
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    return token ?? null;
  } catch (err) {
    console.error('[FCM] Failed to get token:', err);
    return null;
  }
}

/**
 * Register foreground message handler.
 * When the app is open, FCM delivers messages here instead of via the SW.
 * We display them as Sonner toasts.
 */
export function initForegroundMessages(): () => void {
  const unsubscribe = onMessage(messaging, (payload) => {
    const { title, body } = payload.notification ?? {};
    const data = payload.data ?? {};

    toast(title ?? 'CleanSight update', {
      description: body,
      duration: 6000,
      action: data.reportId
        ? {
            label: 'View',
            onClick: () => {
              window.location.href = `/reports/${data.reportId}`;
            },
          }
        : undefined,
    });
  });

  return unsubscribe;
}
