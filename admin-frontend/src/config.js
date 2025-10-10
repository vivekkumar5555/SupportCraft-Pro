/**
 * Application Configuration
 */

// Determine if we're in production
const isProduction = import.meta.env.MODE === "production";

// API Configuration
export const API_CONFIG = {
  baseURL: isProduction
    ? "https://supportcraft-pro-support-widget-backend.onrender.com/api"
    : "/api",
  timeout: 30000,
};

// Environment variables
export const ENV = {
  API_URL: import.meta.env.VITE_API_URL || API_CONFIG.baseURL,
  MODE: import.meta.env.MODE,
};

export default {
  API_CONFIG,
  ENV,
};
