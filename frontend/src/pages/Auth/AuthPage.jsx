import { useState, useEffect } from "react";
import {
  useLocation,
  useNavigate,
  Navigate,
  useSearchParams,
  useParams,
} from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Code,
  ArrowRight,
  Eye,
  EyeOff,
  MessageSquare,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import {
  forgotPassword,
  resetPasswordConfirm,
} from "../../services/authService.js";


import styles from "./AuthPage.module.css";



const AuthPage = () => {
  const { isAuthenticated } = useAuth();
   const { token } = useParams();

  if (isAuthenticated && !token) {
    return <Navigate to="/dashboard" replace />;
  }
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const [searchParams] = useSearchParams();
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(!!token);
  const [resetToken, setResetToken] = useState(token || "");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  // ============================================================
  // 💡 FIXED PARAMETER SCRAPER: Catch token before router clears it
  // ============================================================
  // 💡 3. This fixed useEffect guarantees the states don't flicker back to login
 useEffect(() => {
   if (token) {
     setIsResetPasswordMode(true);
     setIsForgotMode(false);
     setIsRegistering(false);
     setResetToken(token);
   }
 }, [token]);

   useEffect(() => {
     if (location.state?.register) {
       setIsRegistering(true);
       setIsForgotMode(false);
       setIsResetPasswordMode(false);
     }
   }, [location.state]);

  const toggleForgotMode = () => {
    setIsForgotMode((prev) => !prev);
    setIsRegistering(false);
    setIsResetPasswordMode(false);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setError("");
    setSuccess("");
  };

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
    setError("");
  };

  const handleForgotPasswordSubmit = async () => {
    const email = formData.email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setError("Email is required.");
      return;
    }
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      // Clean, structured service call matching your standard architecture!
      await forgotPassword(email);

      setSuccess(
        "If that email matches an account, a password reset link has been dispatched to your inbox.",
      );
      setFormData((prev) => ({ ...prev, email: "" }));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not request a password reset link. Please try again later.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!formData.password) {
      setError("New password is required.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordConfirm(resetToken, formData.password);
      setSuccess(
        "Your password has been successfully updated! Redirecting to login...",
      );
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      setTimeout(() => {
        setIsResetPasswordMode(false);
        navigate("/auth", { replace: true });
        setSuccess("");
      }, 3000);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Invalid reset session.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (isResetPasswordMode) {
      await handleResetPasswordSubmit();
      return;
    }

    if (isForgotMode) {
      await handleForgotPasswordSubmit();
      return; // Stops the function from running the login validation down below!
    }
    // ==========================================================
    // REGISTRATION-SPECIFIC VALIDATION
    // ==========================================================

    if (isRegistering) {
      // Check first name is provided.
      if (!formData.firstName.trim()) {
        setError("First name is required.");
        return;
      }

      // Check last name is provided.
      if (!formData.lastName.trim()) {
        setError("Last name is required.");
        return;
      }

      // Check first name length.
      if (formData.firstName.trim().length < 2) {
        setError("First name must contain at least 2 characters.");
        return;
      }

      // Check last name length.
      if (formData.lastName.trim().length < 2) {
        setError("Last name must contain at least 2 characters.");
        return;
      }
    }

    // ==========================================================
    // EMAIL VALIDATION
    // ==========================================================

    const email = formData.email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Check that an email was provided before checking its format.
    if (!email) {
      setError("Email is required.");
      return;
    }

    // Check email format only after confirming it is not empty.
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // ==========================================================
    // PASSWORD VALIDATION
    // ==========================================================

    // ==========================================================
    // PASSWORD VALIDATION

    if (!formData.password) {
      setError("Password is required.");
      return;
    }

    // Only registration checks the minimum password length.
    // Login should allow any supplied password to reach the
    // backend, where it will be compared against the stored hash.
    if (isRegistering && formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    // registration requires a password confirmation match.
    if (isRegistering) {
      if (!formData.confirmPassword) {
        setError("Confirm your password");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    // ==========================================================
    // SUBMIT AUTHENTICATION REQUEST
    // ==========================================================

    setIsLoading(true);

    try {
      if (isRegistering) {
        await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email,
          password: formData.password,
        });
      } else {
        await login({
          email,
          password: formData.password,
        });
      }

      const destination = location.state?.from?.pathname || "/dashboard";
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to sign in right now. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering((previousMode) => !previousMode);
 setIsForgotMode(false);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    });

    setShowPassword(false);
    setError("");
    setSuccess("");
  };

   return (
     <div className={styles.page}>
       <section className={styles.infoPanel}>
         <div className={styles.infoContent}>
           <header className={styles.infoHeader}>
             <button
               type="button"
               className={styles.infoBranding}
               onClick={() => navigate("/")}
             >
               <span className={styles.infoLogo} aria-hidden>
                 <MessageSquare className={styles.infoLogoIcon} size={22} />
               </span>
               <span>
                 <p className={styles.infoTitle}>Evangadi Forum</p>
                 <p className={styles.infoTagline}>
                   Learn together. Ask with context.
                 </p>
               </span>
             </button>
             <p className={styles.infoDescription}>
               Sign in to post technical questions, follow threads, and search
               the forum with both keyword and AI similarity modes, built for
               Evangadi coursework and peer review.
             </p>
           </header>

           <div className={styles.features}>
             <div className={styles.feature}>
               <div className={styles.featureIcon}>
                 <Sparkles size={20} />
               </div>
               <div>
                 <h3 className={styles.featureTitle}>Visible reasoning</h3>
                 <p className={styles.featureDescription}>
                   Threads stay readable: markdown, code blocks, and replies
                   build a mini knowledge base your cohort can revisit before
                   exams.
                 </p>
               </div>
             </div>
             <div className={styles.feature}>
               <div className={styles.featureIcon}>
                 <Code size={20} />
               </div>
               <div>
                 <h3 className={styles.featureTitle}>Low-friction workflow</h3>
                 <p className={styles.featureDescription}>
                   One layout for asking, answering, and scanning search
                   results, so you spend energy on the problem, not on hunting
                   controls.
                 </p>
               </div>
             </div>
           </div>

           <div className={styles.infoFooter}>
             <div className={styles.infoFooterContent}>
               <div className={styles.infoAvatars} aria-hidden>
                 {[1, 2, 3].map((index) => (
                   <img
                     key={index}
                     src={`https://picsum.photos/seed/${index + 50}/100/100`}
                     className={styles.infoAvatar}
                     alt=""
                     referrerPolicy="no-referrer"
                   />
                 ))}
               </div>
               <span className={styles.infoBadge}>
                 Evangadi cohorts · weekly stand-ups · office-hour style help
               </span>
             </div>
           </div>
         </div>
       </section>

       <section className={styles.formSection}>
         <div className={styles.formCard}>
           <AnimatePresence mode="wait">
             <Motion.div
               /* 💡 FIXED: Dynamically matches 'reset' so Framer Motion locks the password fields into place! */
               key={
                 isResetPasswordMode
                   ? "reset"
                   : isForgotMode
                     ? "forgot"
                     : isRegistering
                       ? "register"
                       : "login"
               }
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
             >
               <header className={styles.formHeader}>
                 {/* 💡 FIXED: Header text reflects the actual reset view state title updates */}
                 <h1>
                   {isResetPasswordMode
                     ? "Change your login credentials"
                     : isForgotMode
                       ? "Reset your password"
                       : isRegistering
                         ? "Create an account"
                         : "Sign in to your account"}
                 </h1>
                 <p>
                   {isResetPasswordMode
                     ? "Enter your new password preferences below to finalize adjustments."
                     : isForgotMode
                       ? "Enter your email address to recover your account keys."
                       : isRegistering
                         ? "Complete the form below to create your account."
                         : "Enter your email address and password to continue."}
                 </p>
               </header>

               {error && (
                 <div className={styles.error} role="alert">
                   {error}
                 </div>
               )}

               <form className={styles.form} onSubmit={handleSubmit}>
                 {/* 📍 If a link token is present, we show ONLY the two new password fields */}
                 {isResetPasswordMode ? (
                   <>
                     <div className={styles.field}>
                       <label htmlFor="password">New Password</label>
                       <div className={styles.passwordWrap}>
                         <input
                           id="password"
                           name="password"
                           type={showPassword ? "text" : "password"}
                           value={formData.password}
                           onChange={handleChange}
                           placeholder="At least 8 characters"
                           autoComplete="new-password"
                           required
                         />
                         <button
                           type="button"
                           className={styles.passwordToggle}
                           onClick={() => setShowPassword((value) => !value)}
                           aria-label={
                             showPassword ? "Hide password" : "Show password"
                           }
                         >
                           {showPassword ? (
                             <EyeOff size={18} />
                           ) : (
                             <Eye size={18} />
                           )}
                         </button>
                       </div>
                     </div>

                     <div className={styles.field}>
                       <label htmlFor="confirmPassword">
                         Confirm New Password
                       </label>
                       <div className={styles.passwordWrap}>
                         <input
                           id="confirmPassword"
                           name="confirmPassword"
                           type={showConfirmPassword ? "text" : "password"}
                           value={formData.confirmPassword}
                           onChange={handleChange}
                           placeholder="Re-type your password"
                           autoComplete="new-password"
                           required
                         />
                         <button
                           type="button"
                           className={styles.passwordToggle}
                           onClick={() =>
                             setShowConfirmPassword((value) => !value)
                           }
                           aria-label={
                             showConfirmPassword
                               ? "Hide password"
                               : "Show password"
                           }
                         >
                           {showConfirmPassword ? (
                             <EyeOff size={18} />
                           ) : (
                             <Eye size={18} />
                           )}
                         </button>
                       </div>
                     </div>
                   </>
                 ) : (
                   /* 📍 Otherwise, show the normal Login / Register / Forgot layout views */
                   <>
                     {isRegistering && (
                       <div className={styles.field}>
                         <label htmlFor="firstName">First Name</label>
                         <input
                           id="firstName"
                           name="firstName"
                           type="text"
                           value={formData.firstName}
                           onChange={handleChange}
                           placeholder="Enter your first name"
                           autoComplete="given-name"
                         />
                       </div>
                     )}
                     {isRegistering && (
                       <div className={styles.field}>
                         <label htmlFor="lastName">Last Name</label>
                         <input
                           id="lastName"
                           name="lastName"
                           type="text"
                           value={formData.lastName}
                           onChange={handleChange}
                           placeholder="Enter your last name"
                           autoComplete="family-name"
                         />
                       </div>
                     )}

                     <div className={styles.field}>
                       <label htmlFor="email">Email Address</label>
                       <input
                         id="email"
                         name="email"
                         type="email"
                         value={formData.email}
                         onChange={handleChange}
                         placeholder="Enter your email address"
                         autoComplete="email"
                       />
                     </div>

                     {!isForgotMode && (
                       <div className={styles.field}>
                         <label htmlFor="password">Password</label>
                         <div className={styles.passwordWrap}>
                           <input
                             id="password"
                             name="password"
                             type={showPassword ? "text" : "password"}
                             value={formData.password}
                             onChange={handleChange}
                             placeholder="••••••••"
                             autoComplete={
                               isRegistering
                                 ? "new-password"
                                 : "current-password"
                             }
                           />
                           <button
                             type="button"
                             className={styles.passwordToggle}
                             onClick={() => setShowPassword((value) => !value)}
                             aria-label={
                               showPassword ? "Hide password" : "Show password"
                             }
                             aria-pressed={showPassword}
                           >
                             {showPassword ? (
                               <EyeOff size={18} aria-hidden />
                             ) : (
                               <Eye size={18} aria-hidden />
                             )}
                           </button>
                         </div>
                       </div>
                     )}

                     {isRegistering && (
                       <div className={styles.field}>
                         <label htmlFor="confirmPassword">
                           Confirm Password
                         </label>
                         <div className={styles.passwordWrap}>
                           <input
                             type={showConfirmPassword ? "text" : "password"}
                             name="confirmPassword"
                             value={formData.confirmPassword}
                             onChange={handleChange}
                             placeholder="Confirm your password"
                           />
                           <button
                             type="button"
                             className={styles.passwordToggle}
                             onClick={() =>
                               setShowConfirmPassword((value) => !value)
                             }
                             aria-label={
                               showConfirmPassword
                                 ? "Hide password"
                                 : "Show password"
                             }
                             aria-pressed={showConfirmPassword}
                           >
                             {showConfirmPassword ? (
                               <EyeOff size={18} aria-hidden />
                             ) : (
                               <Eye size={18} aria-hidden />
                             )}
                           </button>
                         </div>
                       </div>
                     )}
                   </>
                 )}

                 {!isRegistering && !isResetPasswordMode && (
                   <div className={styles.forgotLinkRow}>
                     <button
                       type="button"
                       className={styles.forgotTextButton}
                       onClick={toggleForgotMode}
                     >
                       {isForgotMode ? "Back to sign in" : "Forgot password?"}
                     </button>
                   </div>
                 )}

                 {success && (
                   <div className={styles.success} role="status">
                     {success}
                   </div>
                 )}
                 <button
                   type="submit"
                   className={styles.submitButton}
                   disabled={isLoading}
                 >
                   {isLoading
                     ? "Please wait..."
                     : isResetPasswordMode
                       ? "Update Password"
                       : isForgotMode
                         ? "Send Reset Link"
                         : isRegistering
                           ? "Create Account"
                           : "Sign In"}
                   {!isLoading && <ArrowRight size={16} aria-hidden />}
                 </button>
               </form>

               <div className={styles.divider} aria-hidden>
                 <span>Additional options</span>
               </div>

               <div className={styles.switch}>
                 {isRegistering
                   ? "Already have an account?"
                   : "Don't have an account?"}
                 <button
                   type="button"
                   onClick={() => {
                     // 1. Clear out the forgot or reset screens if they are open
                     setIsForgotMode(false);
                     setIsResetPasswordMode(false);

                     // 2. Run your existing function to handle the rest of the work safely!
                     toggleMode();
                   }}
                   className={styles.switchButton}
                 >
                   {isRegistering ? "Back to sign in" : "Create an account"}
                 </button>
               </div>
             </Motion.div>
           </AnimatePresence>
         </div>
       </section>
     </div>
   );
};

export default AuthPage;
