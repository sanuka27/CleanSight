// firebase-messaging-sw.js
// Service Worker for Firebase Cloud Messaging background notifications.
//
// IMPORTANT: This file MUST live at /public/firebase-messaging-sw.js so it is
// served from the root scope. Vite copies everything in /public verbatim.
//
// Replace the firebaseConfig values below with your actual project config
// (same values as your VITE_FIREBASE_* env vars — service workers cannot
// read import.meta.env so we paste them here directly).

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ─── PASTE YOUR FIREBASE CONFIG HERE ────────────────────────────────────────
// Copy the values from your Firebase Console → Project Settings → General →
// Your apps → Web app → SDK setup and configuration → Config object.
firebase.initializeApp({
  apiKey:            "AIzaSyBLsj1II8NLFyymn6Va7tPlJ_LLtfrFuU8",
  authDomain:        "cleansight-5d01d.firebaseapp.com",
  projectId:         "cleansight-5d01d",
  storageBucket:     "cleansight-5d01d.firebasestorage.app",
  messagingSenderId: "1079646046559",
  appId:             "1:1079646046559:web:6c74fd52f0d9da5cf50eea",
});
// ─────────────────────────────────────────────────────────────────────────────

const messaging = firebase.messaging();

// Handle background messages (app closed or tab not focused).
// Chrome/Edge show a native OS notification automatically.
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  const data = payload.data ?? {};

  self.registration.showNotification(title ?? 'CleanSight', {
    body: body ?? '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.reportId ? `report-${data.reportId}` : 'cleansight',
    data: { url: data.reportId ? `/reports/${data.reportId}` : '/' },
  });
});

// Open (or focus) the app when the notification is clicked.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
