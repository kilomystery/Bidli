import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // 👈 assicurati che esista (ti ho già dato l'index.css prima)

// TEMPORANEAMENTE DISABILITO Service Worker che può interferire con getUserMedia
// import "./utils/serviceWorker.js";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  // DISABILITO StrictMode per evitare double render durante sviluppo Live
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);