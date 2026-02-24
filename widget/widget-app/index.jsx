import React from "react";
import { createRoot } from "react-dom/client";
import Widget from "./Widget";

// Global widget API
const SupportWidget = {
  init: (config) => {
    const container = document.getElementById("support-widget-root");
    if (container) {
      const root = createRoot(container);
      root.render(<Widget config={config} />);
    } else {
      console.error(
        "Support Widget: Container element with id 'support-widget-root' not found",
      );
    }
  },
};

// Ensure it's available globally
if (typeof window !== "undefined") {
  window.SupportWidget = SupportWidget;
}

export default SupportWidget;
