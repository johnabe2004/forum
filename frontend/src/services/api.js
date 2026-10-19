import axios from "axios";
import { getToken, removeToken } from "../utils/auth.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// ============================================================
// CREATE AXIOS CLIENT
// ============================================================

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor to attach the JWT token to headers.
 */
api.interceptors.request.use(
  (config) => {
    // Let the browser create the multipart boundary for uploads. Keeping the
    // JSON default here causes Multer to receive an empty request body.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      config.headers.delete("Content-Type");
    }

    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor to handle global 401 unauthorized errors.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A rejected sign-in is expected to stay on the auth screen so the page
    // can show the API's friendly credential message. Other 401 responses
    // mean an existing session is no longer usable.
    const isLoginRequest = String(error.config?.url || "").includes(
      "/auth/login",
    );

    if (error.response?.status === 401 && !isLoginRequest) {
      removeToken();

      if (window.location.pathname !== "/auth") {
        window.location.assign("/auth");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
