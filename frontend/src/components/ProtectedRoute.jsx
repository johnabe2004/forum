import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Prevents unauthenticated users from accessing private pages
const ProtectedRoute = () => {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  // Wait while checking existing session/JWT
  if (isInitializing) {
    return (
      <main>
        <p>Checking authentication...</p>
      </main>
    );
  }
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Render child routes if authenticated
  return <Outlet />;
};

export default ProtectedRoute;
