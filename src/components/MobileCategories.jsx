// src/components/MobileCategories.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/mobile-chrome.css";

const CATS = [
  { key: "fashion", label: "Moda" },
  { key: "electronics", label: "Elettronica" },
  { key: "collectibles", label: "Collezionismo" },
  { key: "sneakers", label: "Sneakers" },
  { key: "home", label: "Casa" },
  { key: "other", label: "Altro" },
];

export default function MobileCategories() {
  // ⚠️ DEPRECATO: Le categorie sono ora integrate in MobileHeaderMini
  // Questo componente non viene più utilizzato
  return null;
}