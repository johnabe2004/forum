/**
 * Retrieves the stored JWT token from localStorage.
 */
export function getToken() {
  return localStorage.getItem("token");
}

/**
 * Persists the JWT token in localStorage.
 * @param {string} token - The JWT to store.
 */
export function saveToken(token) {
  localStorage.setItem("token", token);
}

/**
 * Removes the JWT token from localStorage.
 */
export function removeToken() {
  localStorage.removeItem("token");
}