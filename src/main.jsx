import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Kayıtlı yazı boyutunu uygula
const savedFontSize = parseInt(localStorage.getItem("cl-font-size"), 10);
if (!isNaN(savedFontSize) && savedFontSize !== 16) {
  document.documentElement.style.fontSize = savedFontSize + "px";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
