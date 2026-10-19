// Authentication context for managing user, JWT, login,
// registration, logout, and session restoration.

import { createContext, useContext, useEffect, useState } from "react";

import {
  loginUser,
  registerUser,
  getCurrentUser,
} from "../services/authService.js";

import { getToken, removeToken, saveToken } from "../utils/auth.js";

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  // Current authenticated user.
  const [user, setUser] = useState(null);

  // Restore token from localStorage after refresh.
  const [token, setToken] = useState(() => getToken());

  // Prevent redirects before authentication is checked.
  const [isInitializing, setIsInitializing] = useState(true);

  // Restore the authenticated user when the app loads.
  useEffect(() => {
    const restoreAuthentication = async () => {
      const storedToken = getToken();

      if (!storedToken) {
        setIsInitializing(false);
        return;
      }

      try {
        const response = await getCurrentUser();

        setUser(response.user);
        setToken(storedToken);
      } catch (error) {
        // Remove invalid or expired token.
        removeToken();

        setToken(null);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    restoreAuthentication();
  }, []);

  
  // Register a new user and automatically log them in.
  const register = async (userData) => {
    const response = await registerUser(userData);

    setUser(response.user);
    setToken(response.token);
    saveToken(response.token);

    return response;
  };

  // Authenticate user and save the JWT.
  const login = async (credentials) => {
    const response = await loginUser(credentials);

    setUser(response.user);
    setToken(response.token);
    saveToken(response.token);

    return response;
  };

  // Clear authentication state and stored token.
  const logout = () => {
    setUser(null);
    setToken(null);
    removeToken();
  };

  // Update current user state with new fields (e.g., name or avatar updates)
  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  const value = {
    user,
    token,
    isInitializing,
    isAuthenticated: Boolean(user),
    register,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for accessing authentication context.
const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
};

export { AuthProvider, useAuth };
