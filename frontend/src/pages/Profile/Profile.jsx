import {
  Activity,
  Calendar,
  Camera,
  CheckCircle,
  ChevronRight,
  Contact,
  Globe,
  Hourglass,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
} from "../../services/authService.js";
import { getAvatarUrl } from "../../utils/avatar.js";
import styles from "./Profile.module.css";

const GitHubIcon = ({ size = 15, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  // Profile data state
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const [prevAvatarUrl, setPrevAvatarUrl] = useState(profile?.avatarUrl);
  if (profile?.avatarUrl !== prevAvatarUrl) {
    setPrevAvatarUrl(profile?.avatarUrl);
    setAvatarError(false);
  }

  // Form field state for editing profile
  const [formData, setFormData] = useState({
    headline: "",
    bio: "",
    location: "",
    githubUrl: "",
    portfolioUrl: "",
  });

  // Feedback notifications
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const showAlert = (type, message, duration = 4000) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    setFeedback({ type, message });
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Auto-dismiss after duration (standard 4 seconds)
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback({ type: "", message: "" });
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // Fetch full profile and dynamic stats on mount
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const response = await getUserProfile();
        if (response?.profile) {
          setProfile(response.profile);
          setFormData({
            headline: response.profile.headline || "",
            bio: response.profile.bio || "",
            location: response.profile.location || "",
            githubUrl: response.profile.githubUrl || "",
            portfolioUrl: response.profile.portfolioUrl || "",
          });
        }
      } catch (err) {
        showAlert(
          "error",
          err.response?.data?.message || "Failed to load profile details.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  // Compute initials for the fallback avatar
  const getInitials = () => {
    const first = profile?.firstName?.[0] || user?.firstName?.[0] || "";
    const last = profile?.lastName?.[0] || user?.lastName?.[0] || "";
    return `${first}${last}`.toUpperCase() || "U";
  };

  // Format member joined date (full: e.g. "October 2026")
  const formatJoinedFull = (dateString) => {
    if (!dateString) return "October 2026";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return "October 2026";
    }
  };

  // Format member joined date (short: e.g. "Oct 2026")
  const formatJoinedShort = (dateString) => {
    if (!dateString) return "Oct 2026";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Oct 2026";
    }
  };

  const formatGithubHref = (url) => {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith("github.com/")) return `https://${trimmed}`;
    if (!trimmed.includes("/") && !trimmed.includes(".")) {
      return `https://github.com/${trimmed}`;
    }
    return `https://${trimmed}`;
  };

  const formatPortfolioHref = (url) => {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  // Handle avatar file selection and upload
  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showAlert("error", "Image must be smaller than 2MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showAlert(
        "error",
        "Please select a valid image file (.png, .jpg, .webp).",
      );
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("avatar", file);

    setIsUploadingAvatar(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await uploadAvatar(uploadFormData);
      if (response?.avatarUrl) {
        setProfile((prev) => ({ ...prev, avatarUrl: response.avatarUrl }));
        updateUser({ avatarUrl: response.avatarUrl });
        showAlert("success", "Profile picture updated successfully!");
      }
    } catch (err) {
      showAlert(
        "error",
        err.response?.data?.message || "Failed to upload avatar image.",
      );
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Save changes to profile details
  const handleSubmitProfile = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = await updateUserProfile(formData);
      if (response?.profile) {
        setProfile(response.profile);
        updateUser({ headline: response.profile.headline });
        setIsDirty(false);
        setIsEditing(false);
        showAlert("success", "Profile updated successfully!");
      }
    } catch (err) {
      showAlert(
        "error",
        err.response?.data?.message || "Failed to update profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to open edit mode with a clean state
  const handleStartEdit = () => {
    setIsDirty(false);
    setIsEditing(true);
  };

  // Updates form values and marks form as modified
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFormData({
        headline: profile.headline || "",
        bio: profile.bio || "",
        location: profile.location || "",
        githubUrl: profile.githubUrl || "",
        portfolioUrl: profile.portfolioUrl || "",
      });
    }
    setIsDirty(false);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading your profile...</p>
      </div>
    );
  }

  const avatarSrc = getAvatarUrl(profile?.avatarUrl);
  const firstName = profile?.firstName || user?.firstName || "Dawit";
  const lastName = profile?.lastName || user?.lastName || "Mahabaw";
  const fullName = `${firstName} ${lastName}`.trim();
  const email = profile?.email || user?.email || "";
  const headline = profile?.headline || "Full Stack Developer";
  const location = profile?.location || "Addis Ababa, Ethiopia";
  const githubHref = formatGithubHref(profile?.githubUrl);
  const portfolioHref = formatPortfolioHref(profile?.portfolioUrl);
  const bio =
    profile?.bio ||
    "I'm a full stack developer with a strong interest in modern web technologies. I enjoy solving problems, learning new skills, and building projects that make a difference. This forum is a great place for me to share knowledge and grow with the community.";
  const quote = profile?.bio
    ? `"${profile.bio}"`
    : '"Passionate about building useful web applications and always eager to learn new technologies. Currently focusing on React, Node.js and the MERN stack."';
  const questionsCount = profile?.questionsCount ?? 0;
  const answersCount = profile?.answersCount ?? 0;
  const joinedFull = formatJoinedFull(profile?.createdAt);
  const joinedShort = formatJoinedShort(profile?.createdAt);

  return (
    <div className={styles.profileContainer}>
      {/* Top Banner with subtle wave background */}
      <div className={styles.banner}>
        <div className={styles.bannerBackdrop} />
        <div className={styles.bannerContent}>
          <div className={styles.bannerLeft}>
            <span className={styles.bannerGreeting}>Welcome back,</span>
            <h1 className={styles.bannerName}>{fullName}</h1>
            <p className={styles.bannerHeadline}>{headline}</p>

            <div className={styles.bannerMetaRow}>
              {email && (
                <div className={styles.bannerMetaItem}>
                  <Mail size={15} />
                  <span>{email}</span>
                </div>
              )}
              {location && (
                <div className={styles.bannerMetaItem}>
                  <MapPin size={15} />
                  <span>{location}</span>
                </div>
              )}
              {githubHref && (
                <div className={styles.bannerMetaItem}>
                  <GitHubIcon size={15} />
                  <a
                    href={githubHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.bannerGithubLink}
                  >
                    GitHub
                  </a>
                </div>
              )}
              {portfolioHref && (
                <div className={styles.bannerMetaItem}>
                  <Globe size={15} />
                  <a
                    href={portfolioHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.bannerGithubLink}
                  >
                    Portfolio
                  </a>
                </div>
              )}
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              className={styles.editProfileButton}
              onClick={handleStartEdit}
            >
              <Pencil size={15} />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Feedback Notifications */}
      {feedback.message && (
        <div
          className={`${styles.alert} ${
            feedback.type === "error" ? styles.alertError : styles.alertSuccess
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className={styles.mainGrid}>
        {/* Left Column Card */}
        <div className={styles.leftCard}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper}>
              {avatarSrc && !avatarError ? (
                <img
                  src={avatarSrc}
                  alt={fullName}
                  className={styles.avatarImage}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className={styles.avatarFallback}>{getInitials()}</div>
              )}

              <button
                type="button"
                className={styles.cameraBadge}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                title="Change profile picture"
                aria-label="Change profile picture"
              >
                <Camera size={15} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/png, image/jpeg, image/webp"
                style={{ display: "none" }}
              />
            </div>

            {isUploadingAvatar && (
              <small className={styles.uploadNotice}>Uploading photo...</small>
            )}

            <h2 className={styles.profileName}>{fullName}</h2>
            <p className={styles.profileRole}>{headline}</p>
          </div>

          {/* 3-Part Stat Box */}
          <div className={styles.statBox}>
            <div className={styles.statCol}>
              <MessageSquare size={16} className={styles.iconBlue} />
              <span className={styles.statNumber}>{questionsCount}</span>
              <span className={styles.statLabel}>Questions</span>
            </div>

            <div className={styles.statDivider} />

            <div className={styles.statCol}>
              <CheckCircle size={16} className={styles.iconGreen} />
              <span className={styles.statNumber}>{answersCount}</span>
              <span className={styles.statLabel}>Answers</span>
            </div>

            <div className={styles.statDivider} />

            <div className={styles.statCol}>
              <Calendar size={16} className={styles.iconBlue} />
              <span className={styles.statJoinedLabel}>Joined</span>
              <span className={styles.statJoinedDate}>{joinedShort}</span>
            </div>
          </div>

          {/* Meta Info List */}
          <div className={styles.leftMetaList}>
            {email && (
              <div className={styles.leftMetaItem}>
                <Mail size={16} className={styles.metaIcon} />
                <span>{email}</span>
              </div>
            )}

            {location && (
              <div className={styles.leftMetaItem}>
                <MapPin size={16} className={styles.metaIcon} />
                <span>{location}</span>
              </div>
            )}

            {githubHref && (
              <div className={styles.leftMetaItem}>
                <GitHubIcon size={16} className={styles.metaIcon} />
                <a
                  href={githubHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={styles.leftGithubLink}
                >
                  GitHub
                </a>
              </div>
            )}

            {portfolioHref && (
              <div className={styles.leftMetaItem}>
                <Globe size={16} className={styles.metaIcon} />
                <a
                  href={portfolioHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={styles.leftGithubLink}
                >
                  Portfolio
                </a>
              </div>
            )}
          </div>

          {/* Bio Quote */}
          <p className={styles.quoteText}>{quote}</p>
        </div>

        {/* Right Column Cards */}
        <div className={styles.rightColumn}>
          {isEditing ? (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.headerIcon}>
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className={styles.cardTitle}>Edit Profile Information</h3>
                  <p className={styles.cardSubtitle}>
                    Update your public profile details and information.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitProfile} className={styles.editForm}>
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label htmlFor="headline">Headline / Role</label>
                    <input
                      id="headline"
                      type="text"
                      maxLength={150}
                      value={formData.headline}
                      onChange={(e) =>
                        handleFieldChange("headline", e.target.value)
                      }
                      placeholder="e.g. Full Stack Developer"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="location">Location</label>
                    <input
                      id="location"
                      type="text"
                      maxLength={100}
                      value={formData.location}
                      onChange={(e) =>
                        handleFieldChange("location", e.target.value)
                      }
                      placeholder="e.g. Addis Ababa, Ethiopia"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label htmlFor="githubUrl">GitHub Profile URL</label>
                    <input
                      id="githubUrl"
                      type="text"
                      maxLength={255}
                      value={formData.githubUrl}
                      onChange={(e) =>
                        handleFieldChange("githubUrl", e.target.value)
                      }
                      placeholder="e.g. https://github.com/username"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="portfolioUrl">Portfolio / Website URL</label>
                    <input
                      id="portfolioUrl"
                      type="text"
                      maxLength={255}
                      value={formData.portfolioUrl}
                      onChange={(e) =>
                        handleFieldChange("portfolioUrl", e.target.value)
                      }
                      placeholder="e.g. https://yourportfolio.com"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="bio">About Me (Bio)</label>
                  <textarea
                    id="bio"
                    rows={5}
                    maxLength={1000}
                    value={formData.bio}
                    onChange={(e) => handleFieldChange("bio", e.target.value)}
                    placeholder="Tell the community about yourself, your background, and learning journey..."
                  />
                  <small className={styles.hint}>
                    {1000 - formData.bio.length} characters remaining.
                  </small>
                </div>

                <div className={styles.editButtonRow}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.saveButton}
                    disabled={isSaving || !isDirty}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Card 1: About Me */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.headerIcon}>
                    <Contact size={18} />
                  </div>
                  <h3 className={styles.cardTitle}>About Me</h3>
                </div>
                <p className={styles.aboutMeText}>{bio}</p>
              </div>

              {/* Card 2: Profile Details */}
              <div className={styles.card}>
                <div className={styles.cardHeaderWithAction}>
                  <div className={styles.cardHeaderLeft}>
                    <div className={styles.headerIcon}>
                      <User size={18} />
                    </div>
                    <h3 className={styles.cardTitle}>Profile Details</h3>
                  </div>

                  <button
                    type="button"
                    className={styles.cardActionEdit}
                    onClick={handleStartEdit}
                    title="Edit Profile Details"
                    aria-label="Edit Profile Details"
                  >
                    <Pencil size={15} />
                  </button>
                </div>

                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <User size={16} className={styles.detailIcon} />
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>First Name</span>
                      <span className={styles.detailValue}>{firstName}</span>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <User size={16} className={styles.detailIcon} />
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Last Name</span>
                      <span className={styles.detailValue}>{lastName}</span>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <Mail size={16} className={styles.detailIcon} />
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Email Address</span>
                      <span className={styles.detailValue}>
                        {email || "Not specified"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <MapPin size={16} className={styles.detailIcon} />
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Location</span>
                      <span className={styles.detailValue}>{location}</span>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <Hourglass size={16} className={styles.detailIcon} />
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Headline</span>
                      <span className={styles.detailValue}>{headline}</span>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <Calendar size={16} className={styles.detailIcon} />
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Member Since</span>
                      <span className={styles.detailValue}>{joinedFull}</span>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <GitHubIcon size={16} className={styles.detailIcon} />
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>GitHub</span>
                      {githubHref ? (
                        <a
                          href={githubHref}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={styles.detailGithubLink}
                        >
                          {profile?.githubUrl}
                        </a>
                      ) : (
                        <span className={styles.detailValue}>
                          Not specified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <Globe size={16} className={styles.detailIcon} />
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Portfolio</span>
                      {portfolioHref ? (
                        <a
                          href={portfolioHref}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={styles.detailGithubLink}
                        >
                          {profile?.portfolioUrl}
                        </a>
                      ) : (
                        <span className={styles.detailValue}>
                          Not specified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Recent Activity */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.headerIcon}>
                    <Activity size={18} />
                  </div>
                  <h3 className={styles.cardTitle}>Recent Activity</h3>
                </div>

                <div className={styles.activityGrid}>
                  <button
                    type="button"
                    className={styles.activityBox}
                    onClick={() => navigate("/my-questions")}
                  >
                    <div className={styles.activityLeft}>
                      <div className={styles.activityIconBlue}>
                        <MessageSquare size={18} />
                      </div>
                      <div className={styles.activityMeta}>
                        <span className={styles.activityNumber}>
                          {questionsCount}
                        </span>
                        <span className={styles.activityLabel}>
                          Questions Asked
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className={styles.activityChevron}
                    />
                  </button>

                  <div className={styles.activityBox}>
                    <div className={styles.activityLeft}>
                      <div className={styles.activityIconGreen}>
                        <CheckCircle size={18} />
                      </div>
                      <div className={styles.activityMeta}>
                        <span className={styles.activityNumber}>
                          {answersCount}
                        </span>
                        <span className={styles.activityLabel}>
                          Answers Provided
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className={styles.activityChevron}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
