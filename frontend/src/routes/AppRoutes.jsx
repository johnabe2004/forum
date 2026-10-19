import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute.jsx";
import Layout from "../components/Layout/Layout.jsx";

import PostQuestion from "../pages/PostQuestion/PostQuestion.jsx";
import AuthPage from "../pages/Auth/AuthPage.jsx";
import Dashboard from "../pages/Dashboard/Dashboard.jsx";
import LandingPage from "../pages/Landing/LandingPage.jsx";
import QuestionDetail from "../pages/QuestionDetail/QuestionDetail.jsx";
import MyQuestions from "../pages/MyQuestions/MyQuestions.jsx";
import RagDocuments from "../pages/RagDocuments/RagDocuments.jsx";
import Profile from "../pages/Profile/Profile.jsx";
import Settings from "../pages/Settings/Settings.jsx";
import SavedQuestions from "../pages/SavedQuestions/SavedQuestions.jsx";


import AdminRoute from "../components/AdminRoute.jsx";
import Admin from "../pages/Admin/Admin.jsx";


const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/reset-password/:token"
          element={<AuthPage view="reset-password" />}
        />
        {/* Protected application pages */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/questions/ask" element={<PostQuestion />} />
            <Route
              path="/questions/:questionHash"
              element={<QuestionDetail />}
            />
            <Route path="/my-questions" element={<MyQuestions />} />
            <Route path="/rag-documents" element={<RagDocuments />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/saved-questions" element={<SavedQuestions />}
/>

            {/* Admin only route */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Route>

        {/* ------------------------------------------------
         * UNKNOWN ROUTES
         * ------------------------------------------------ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
