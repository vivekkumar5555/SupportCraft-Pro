/**
 * Support Widget Loader
 *
 * This script loads the support widget on any website.
 * Usage: <script src="https://your-domain.com/widget/loader.js" data-widget-key="your-widget-key"></script>
 */

(function () {
  "use strict";

  // Configuration
  const CONFIG = {
    apiUrl: "https://supportcraft-pro-support-widget-backend.onrender.com/api",
    wsUrl: "https://supportcraft-pro-support-widget-backend.onrender.com",
    widgetUrl: "https://supportcraft-pro-widget.onrender.com/widget.js",
    version: "1.0.0",
  };

  // Get widget configuration from script tag
  const script =
    document.currentScript || document.querySelector("script[data-widget-key]");
  const widgetKey = script?.getAttribute("data-widget-key");

  if (!widgetKey) {
    console.error(
      "Support Widget: Widget key is required. Add data-widget-key attribute to the script tag."
    );
    return;
  }

  // Widget configuration
  const widgetConfig = {
    key: widgetKey,
    position: script?.getAttribute("data-position") || "bottom-right",
    theme: script?.getAttribute("data-theme") || "light",
    primaryColor: script?.getAttribute("data-primary-color") || "#3B82F6",
    secondaryColor: script?.getAttribute("data-secondary-color") || "#1E40AF",
    botName: script?.getAttribute("data-bot-name") || "Support Bot",
    welcomeMessage:
      script?.getAttribute("data-welcome-message") ||
      "Hello! How can I help you today?",
    placeholderText:
      script?.getAttribute("data-placeholder") || "Type your message...",
    logoUrl: script?.getAttribute("data-logo-url") || "",
    zIndex: parseInt(script?.getAttribute("data-z-index")) || 9999,
  };

  // Check if widget is already loaded
  if (window.SupportWidget) {
    console.warn("Support Widget: Widget is already loaded.");
    return;
  }

  // Validate widget key
  function validateWidgetKey() {
    return fetch(`${CONFIG.apiUrl}/chat/validate/${widgetKey}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.valid) {
          // Merge server config with client config
          if (data.tenant) {
            widgetConfig.botName =
              data.tenant.brandSettings?.botName || widgetConfig.botName;
            widgetConfig.welcomeMessage =
              data.tenant.brandSettings?.welcomeMessage ||
              widgetConfig.welcomeMessage;
            widgetConfig.placeholderText =
              data.tenant.brandSettings?.placeholderText ||
              widgetConfig.placeholderText;
            widgetConfig.primaryColor =
              data.tenant.brandSettings?.primaryColor ||
              widgetConfig.primaryColor;
            widgetConfig.secondaryColor =
              data.tenant.brandSettings?.secondaryColor ||
              widgetConfig.secondaryColor;
            widgetConfig.logoUrl =
              data.tenant.brandSettings?.logoUrl || widgetConfig.logoUrl;
          }
          return true;
        } else {
          throw new Error("Invalid widget key");
        }
      })
      .catch((error) => {
        console.error("Support Widget: Failed to validate widget key:", error);
        return false;
      });
  }

  // Load widget script
  function loadWidgetScript() {
    return new Promise((resolve, reject) => {
      // Check if React is already loaded
      if (window.React && window.ReactDOM) {
        loadWidget();
        resolve();
        return;
      }

      // Load React
      const reactScript = document.createElement("script");
      reactScript.src =
        "https://unpkg.com/react@18/umd/react.production.min.js";
      reactScript.onload = () => {
        const reactDOMScript = document.createElement("script");
        reactDOMScript.src =
          "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js";
        reactDOMScript.onload = () => {
          loadWidget();
          resolve();
        };
        reactDOMScript.onerror = reject;
        document.head.appendChild(reactDOMScript);
      };
      reactScript.onerror = reject;
      document.head.appendChild(reactScript);
    });
  }

  // Load widget
  function loadWidget() {
    const widgetScript = document.createElement("script");
    widgetScript.src = CONFIG.widgetUrl;
    widgetScript.onload = () => {
      if (window.SupportWidget) {
        window.SupportWidget.init({
          ...widgetConfig,
          apiUrl: CONFIG.apiUrl,
          wsUrl: CONFIG.wsUrl,
        });
      }
    };
    widgetScript.onerror = () => {
      console.error("Support Widget: Failed to load widget script");
    };
    document.head.appendChild(widgetScript);
  }

  // Initialize widget
  function init() {
    validateWidgetKey()
      .then((valid) => {
        if (valid) {
          loadWidgetScript();
        } else {
          console.error("Support Widget: Invalid widget key");
        }
      })
      .catch((error) => {
        console.error("Support Widget: Initialization failed:", error);
      });
  }

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose global API
  window.SupportWidgetLoader = {
    version: CONFIG.version,
    config: widgetConfig,
    init: init,
  };
})();
