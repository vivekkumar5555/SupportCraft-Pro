import axios from "axios";
import toast from "react-hot-toast";
import { ENV } from "../config";

// Create axios instance
const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    } else if (error.response?.status === 429) {
      toast.error("Too many requests. Please try again later.");
    } else if (error.response?.status >= 500) {
      toast.error("Server error. Please try again later.");
    } else if (error.response?.data?.error) {
      toast.error(error.response.data.error);
    } else if (error.message) {
      toast.error(error.message);
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data) => api.put("/auth/profile", data),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// Admin API
export const adminAPI = {
  uploadDocuments: (formData) =>
    api.post("/admin/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  getUploadStatus: (uploadId) => api.get(`/admin/upload/status/${uploadId}`),
  getDocuments: (params) => api.get("/admin/documents", { params }),
  deleteDocument: (documentId) => api.delete(`/admin/documents/${documentId}`),
  updateSettings: (data) => api.put("/admin/settings", data),
  getAnalytics: () => api.get("/admin/analytics"),
  updateSubscriptionPlan: (plan) => api.put("/admin/subscription", { plan }),
};

// Chat API
export const chatAPI = {
  testQuery: (message) => api.post("/chat/test", { message }),
  validateTenantKey: (tenantKey) => api.get(`/chat/validate/${tenantKey}`),
};

export default api;
