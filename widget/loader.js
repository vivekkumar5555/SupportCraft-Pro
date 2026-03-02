/**
 * Support Widget Loader
 *
 * This script loads the support widget on any website.
 * Usage: <script src="https://your-domain.com/widget/loader.js" data-widget-key="your-widget-key"></script>
 */

(function () {
  "use strict";

  // Get widget configuration from script tag (must be before CONFIG so we can use data-* URLs)
  const script =
    document.currentScript || document.querySelector("script[data-widget-key]");
  const scriptSrc = script?.src || "";

  // Default host is derived from where this script is served from (works in both dev and prod)
  const defaultHost = scriptSrc
    ? new URL(scriptSrc).origin
    : "https://supportcraft-pro-widget.onrender.com";
  const defaultApi =
    "https://supportcraft-pro-support-widget-backend.onrender.com";

  // Configuration (allow override via data-api-url, data-ws-url, data-widget-url)
  const CONFIG = {
    apiUrl: script?.getAttribute("data-api-url") || defaultApi + "/api",
    wsUrl: script?.getAttribute("data-ws-url") || defaultApi,
    widgetUrl:
      script?.getAttribute("data-widget-url") ||
      defaultHost + "/build/widget.js",
    version: "1.0.0",
  };

  const widgetKey = script?.getAttribute("data-widget-key");

  if (!widgetKey) {
    console.error(
      "Support Widget: Widget key is required. Add data-widget-key attribute to the script tag.",
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
      const widgetScript = document.createElement("script");
      widgetScript.src = CONFIG.widgetUrl;
      widgetScript.onload = () => {
        // Give the script time to execute and set up the global
        setTimeout(() => {
          if (
            window.SupportWidget &&
            typeof window.SupportWidget.init === "function"
          ) {
            console.log("Support Widget: Initializing widget");
            window.SupportWidget.init({
              ...widgetConfig,
              apiUrl: CONFIG.apiUrl,
              wsUrl: CONFIG.wsUrl,
            });
            resolve();
          } else if (window.SupportWidget?.default?.init) {
            // Fallback if it's wrapped in default
            console.log("Support Widget: Found init in default export");
            window.SupportWidget.default.init({
              ...widgetConfig,
              apiUrl: CONFIG.apiUrl,
              wsUrl: CONFIG.wsUrl,
            });
            resolve();
          } else {
            console.error(
              "Support Widget: Widget script loaded but init function not found",
              window.SupportWidget,
            );
            reject(new Error("Widget init function not available"));
          }
        }, 100);
      };
      widgetScript.onerror = () => {
        console.error("Support Widget: Failed to load widget script");
        reject(new Error("Failed to load widget script"));
      };
      document.head.appendChild(widgetScript);
    });
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
