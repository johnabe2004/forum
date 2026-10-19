import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Route guard: restricts access exclusively to users with the "admin" role
const AdminRoute = () => {
  const { user, isInitializing } = useAuth();

  // Wait while authentication state initializes
  if (isInitializing) {
    return (
      <main>
        <p>Checking permissions...</p>
      </main>
    );
  }

  // If user is not logged in or role is not admin, redirect back to dashboard
  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // Render the admin page if authorized
  return <Outlet />;
};

export default AdminRoute;
