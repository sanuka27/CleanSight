import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPWA } from "./lib/pwaRegistration";

// Register service worker (no-op if SW is not supported)
initPWA();

createRoot(document.getElementById("root")!).render(<App />);
