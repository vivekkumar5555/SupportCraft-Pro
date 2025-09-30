import React from "react";
import { createRoot } from "react-dom/client";
import Widget from "./Widget";

// Global widget API
window.SupportWidget = {
  init: (config) => {
    const container = document.getElementById("support-widget-root");
    if (container) {
      const root = createRoot(container);
      root.render(<Widget config={config} />);
    }
  },
};
