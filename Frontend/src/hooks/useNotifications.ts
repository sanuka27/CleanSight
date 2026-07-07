/**
 * useNotifications hook
 *
 * Manages the full push notification lifecycle for an authenticated user:
 *  1. Requests browser permission on first call
 *  2. Gets the FCM token and registers it with the backend
 *  3. Listens for foreground messages (shows Sonner toasts)
 *  4. Cleans up on unmount / logout
 *  5. Exposes notification preference state and toggle methods
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { requestNotificationPermission, initForegroundMessages } from '@/lib/messaging';
import api from '@/lib/api';

interface NotificationPreferences {
  push: boolean;
  email: boolean;
}

interface UseNotificationsResult {
  /** Whether the browser has granted notification permission */
  permissionGranted: boolean;
  /** Whether we are currently requesting permission / registering token */
  isLoading: boolean;
  /** User's notification preferences */
  preferences: NotificationPreferences;
  /** Request permission and register FCM token */
  enablePush: () => Promise<void>;
  /** Update a single preference (push or email) */
  updatePreference: (key: keyof NotificationPreferences, value: boolean) => Promise<void>;
}

export function useNotifications(isAuthenticated: boolean): UseNotificationsResult {
  const [permissionGranted, setPermissionGranted] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push: true,
    email: true,
  });

  const currentTokenRef = useRef<string | null>(null);
  const foregroundUnsubRef = useRef<(() => void) | null>(null);

  // Fetch notification preferences from backend
  const fetchPreferences = useCallback(async () => {
    try {
      const res = await api.getNotificationPreferences();
      if (res.success) setPreferences(res.data);
    } catch {
      // Silently fail — defaults are fine
    }
  }, []);

  // Register an FCM token with the backend
  const registerToken = useCallback(async (token: string) => {
    try {
      await api.registerFcmToken(token);
      currentTokenRef.current = token;
    } catch (err) {
      console.error('[useNotifications] Failed to register FCM token:', err);
    }
  }, []);

  // Deregister the current token (call on logout)
  const deregisterToken = useCallback(async () => {
    const token = currentTokenRef.current;
    if (!token) return;
    try {
      await api.deregisterFcmToken(token);
      currentTokenRef.current = null;
    } catch {
      // Best-effort
    }
  }, []);

  // Request permission + register token
  const enablePush = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setPermissionGranted(true);
        await registerToken(token);
        // Start listening to foreground messages
        if (!foregroundUnsubRef.current) {
          foregroundUnsubRef.current = initForegroundMessages();
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [registerToken]);

  // Update a preference on the backend and locally
  const updatePreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      setPreferences((prev) => ({ ...prev, [key]: value }));
      try {
        await api.updateNotificationPreferences({ [key]: value });
      } catch (err) {
        // Rollback
        setPreferences((prev) => ({ ...prev, [key]: !value }));
        console.error('[useNotifications] Failed to update preference:', err);
      }
    },
    []
  );

  // On mount (authenticated): fetch prefs and auto-setup if already permitted
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchPreferences();

    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      // Permission was already granted (returning user) — silently re-register
      requestNotificationPermission().then((token) => {
        if (token) {
          registerToken(token);
          if (!foregroundUnsubRef.current) {
            foregroundUnsubRef.current = initForegroundMessages();
          }
        }
      });
    }

    return () => {
      // Cleanup foreground listener on unmount
      foregroundUnsubRef.current?.();
      foregroundUnsubRef.current = null;
    };
  }, [isAuthenticated, fetchPreferences, registerToken]);

  // Deregister token when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      deregisterToken();
    }
  }, [isAuthenticated, deregisterToken]);

  return {
    permissionGranted,
    isLoading,
    preferences,
    enablePush,
    updatePreference,
  };
}
