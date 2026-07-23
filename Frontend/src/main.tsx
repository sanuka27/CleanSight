// ─────────────────────────────────────────────────────────────────────────────
// Sentry MUST be initialised before createRoot so it captures errors from
// the very first React render. This is the required load order.
// ─────────────────────────────────────────────────────────────────────────────
import { initSentry } from './lib/sentry';
initSentry();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPWA } from "./lib/pwaRegistration";

// Register service worker (no-op if SW is not supported)
initPWA();

createRoot(document.getElementById("root")!).render(<App />);
