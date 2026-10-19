import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Save,
  Settings as SettingsIcon,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { changePassword, updateAccount } from "../../services/authService.js";
import styles from "./Settings.module.css";

const Settings = () => {
  const { user, updateUser } = useAuth();
  const accountTimerRef = useRef(null);
  const passwordTimerRef = useRef(null);

  // ----------------------------------------------------
  // Section 1: Account Information State
  // ----------------------------------------------------
  const [accountForm, setAccountForm] = useState(() => ({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  }));
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState({
    type: "",
    message: "",
  });

  const showAccountFeedback = (type, message, duration = 4000) => {
    if (accountTimerRef.current) clearTimeout(accountTimerRef.current);
    setAccountFeedback({ type, message });
    accountTimerRef.current = setTimeout(() => {
      setAccountFeedback({ type: "", message: "" });
    }, duration);
  };

  const showPasswordFeedback = (type, message, duration = 4000) => {
    if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
    setPasswordFeedback({ type, message });
    passwordTimerRef.current = setTimeout(() => {
      setPasswordFeedback({ type: "", message: "" });
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (accountTimerRef.current) clearTimeout(accountTimerRef.current);
      if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
    };
  }, []);

  // Sync when user context updates (e.g. on initial fetch)
  const [syncedEmail, setSyncedEmail] = useState(user?.email || "");
  if (user?.email && user.email !== syncedEmail && !accountForm.email) {
    setSyncedEmail(user.email);
    setAccountForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
    });
  }

  // ----------------------------------------------------
  // Section 2: Password Change State
  // ----------------------------------------------------
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({
    type: "",
    message: "",
  });

  // ----------------------------------------------------
  // Handlers: Account Details
  // ----------------------------------------------------
  const handleAccountChange = (e) => {
    setAccountForm({
      ...accountForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleCancelAccount = () => {
    if (accountTimerRef.current) clearTimeout(accountTimerRef.current);
    setAccountForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    });
    setAccountFeedback({ type: "", message: "" });
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();

    if (!accountForm.firstName.trim() || !accountForm.lastName.trim()) {
      showAccountFeedback("error", "First and last name are required.");
      return;
    }

    if (!accountForm.email.trim()) {
      showAccountFeedback("error", "Email address is required.");
      return;
    }

    const hasChanges =
      accountForm.firstName.trim() !== (user?.firstName || "").trim() ||
      accountForm.lastName.trim() !== (user?.lastName || "").trim() ||
      accountForm.email.trim() !== (user?.email || "").trim();

    if (!hasChanges) {
      showAccountFeedback("error", "No changes were made.");
      return;
    }

    setIsSavingAccount(true);
    try {
      const response = await updateAccount(accountForm);
      if (response?.user) {
        updateUser(response.user);
        showAccountFeedback(
          "success",
          "Account details updated successfully!",
        );
      }
    } catch (err) {
      showAccountFeedback(
        "error",
        err.response?.data?.message || "Failed to update account details.",
      );
    } finally {
      setIsSavingAccount(false);
    }
  };

  // ----------------------------------------------------
  // Handlers: Password Change
  // ----------------------------------------------------
  const handlePasswordChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!passwordForm.currentPassword) {
      showPasswordFeedback("error", "Please enter your current password.");
      return;
    }

    if (!passwordForm.newPassword) {
      showPasswordFeedback("error", "Please enter a new password.");
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      showPasswordFeedback(
        "error",
        "New password must be different from your current password."
      );
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showPasswordFeedback(
        "error",
        "New password must be at least 8 characters long.",
      );
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showPasswordFeedback(
        "error",
        "New password and confirmation do not match.",
      );
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      showPasswordFeedback(
        "success",
        response.message || "Password updated successfully!",
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      showPasswordFeedback(
        "error",
        err.response?.data?.message || "Failed to change your password.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className={styles.settingsContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIconSquircle}>
          <SettingsIcon size={26} />
        </div>
        <div className={styles.headerText}>
          <h2>Settings</h2>
          <p>
            Update your account details, email address, and change your password.
          </p>
        </div>
      </div>

      <div className={styles.settingsGrid}>
        {/* ============================================================
            CARD 1: ACCOUNT INFORMATION
           ============================================================ */}
        <section
          className={styles.card}
          aria-labelledby="account-info-heading"
        >
          <div>
            <div className={styles.cardHeader}>
              <div className={styles.accountBadge}>
                <User size={20} />
              </div>
              <div className={styles.cardHeaderText}>
                <h3 id="account-info-heading">Account Information</h3>
                <p>Update your personal details and email address.</p>
              </div>
            </div>

            {accountFeedback.message && (
              <div
                className={`${styles.alert} ${
                  accountFeedback.type === "error"
                    ? styles.alertError
                    : styles.alertSuccess
                }`}
              >
                {accountFeedback.message}
              </div>
            )}

            <form
              id="account-form"
              onSubmit={handleAccountSubmit}
              className={styles.form}
            >
              <div className={styles.nameRow}>
                <div className={styles.field}>
                  <label htmlFor="firstName">First Name</label>
                  <div className={styles.inputWrapper}>
                    <User size={16} className={styles.inputIcon} />
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={accountForm.firstName}
                      onChange={handleAccountChange}
                      placeholder="First name"
                      required
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="lastName">Last Name</label>
                  <div className={styles.inputWrapper}>
                    <User size={16} className={styles.inputIcon} />
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={accountForm.lastName}
                      onChange={handleAccountChange}
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="email">Email Address</label>
                <div className={styles.inputWrapper}>
                  <Mail size={16} className={styles.inputIcon} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={accountForm.email}
                    onChange={handleAccountChange}
                    placeholder="Email address"
                    required
                  />
                </div>
                <small className={styles.helperText}>
                  This email will be used for account notifications and login.
                </small>
              </div>
            </form>
          </div>

          <div className={styles.cardActionRow}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancelAccount}
              disabled={isSavingAccount}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="account-form"
              className={styles.saveChangesButton}
              disabled={isSavingAccount}
            >
              <Save size={16} />
              {isSavingAccount ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>

        {/* ============================================================
            CARD 2: CHANGE PASSWORD
           ============================================================ */}
        <section
          className={styles.card}
          aria-labelledby="change-password-heading"
        >
          <div>
            <div className={styles.cardHeader}>
              <div className={styles.passwordBadge}>
                <Lock size={20} />
              </div>
              <div className={styles.cardHeaderText}>
                <h3 id="change-password-heading">Change Password</h3>
                <p>Keep your account secure with a strong password.</p>
              </div>
            </div>

            {passwordFeedback.message && (
              <div
                className={`${styles.alert} ${
                  passwordFeedback.type === "error"
                    ? styles.alertError
                    : styles.alertSuccess
                }`}
              >
                {passwordFeedback.message}
              </div>
            )}

            <form
              id="password-form"
              onSubmit={handlePasswordSubmit}
              className={styles.form}
            >
              <div className={styles.field}>
                <label htmlFor="currentPassword">Current Password</label>
                <div className={styles.inputWrapper}>
                  <Lock size={16} className={styles.inputIcon} />
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeToggle}
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={
                      showCurrentPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="newPassword">New Password</label>
                <div className={styles.inputWrapper}>
                  <Lock size={16} className={styles.inputIcon} />
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeToggle}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={
                      showNewPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <small className={styles.helperText}>
                  Must contain at least 8 characters.
                </small>
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className={styles.inputWrapper}>
                  <Lock size={16} className={styles.inputIcon} />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeToggle}
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className={styles.passwordActionRow}>
            <button
              type="submit"
              form="password-form"
              className={styles.updatePasswordButton}
              disabled={isSavingPassword}
            >
              <Lock size={16} />
              {isSavingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
