import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Temporary safety mode: remove any previously registered service workers
// and clear Cache Storage so an old cached build cannot keep serving a blank page.
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.error("Service worker cleanup failed:", error);
    }

    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
      } catch (error) {
        console.error("Cache cleanup failed:", error);
      }
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
