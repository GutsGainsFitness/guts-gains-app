import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth.tsx";
import { initNativeShell } from "./lib/native.ts";

// Boot native shell (status bar style, edge-to-edge, hardware back).
// Resolves to a no-op on web.
initNativeShell(() => window.history.back());

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
