import {
  HelpCircle,
  MessageSquare,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  deleteAdminQuestion,
  deleteAdminUser,
  getAdminQuestions,
  getAdminUsers,
  getDashboardStats,
} from "../../services/adminService.js";
import styles from "./Admin.module.css";

const Admin = () => {
  const { user: currentUser } = useAuth();

  // Active tab state: 'users' or 'questions'
  const [activeTab, setActiveTab] = useState("users");

  // Overview statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuestions: 0,
    totalAnswers: 0,
  });

  // Table lists
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);

  // Search states
  const [userSearch, setUserSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");

  // Loading & status states
  const [isLoading, setIsLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState({ type: "", text: "" });

  // Confirmation modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: "", // 'user' or 'question'
    targetId: null,
    targetTitle: "",
  });

  // ============================================================
  // DATA FETCHING
  // ============================================================

  // Load dashboard overview statistics
  const loadStats = async () => {
    try {
      const data = await getDashboardStats();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    }
  };

  // Load users with search filter
  const loadUsers = async (search = "") => {
    try {
      setIsLoading(true);
      const data = await getAdminUsers(search);
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        text: err.response?.data?.message || "Could not load users list.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load questions with search filter
  const loadQuestions = async (search = "") => {
    try {
      setIsLoading(true);
      const data = await getAdminQuestions(search);
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (err) {
      setAlertMessage({
        type: "error",
        text: err.response?.data?.message || "Could not load questions list.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadStats();
    loadUsers();
  }, []);

  // Handle switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setAlertMessage({ type: "", text: "" });
    if (tab === "users") {
      loadUsers(userSearch);
    } else {
      loadQuestions(questionSearch);
    }
  };

  // Search debouncing for users
  useEffect(() => {
    if (activeTab === "users") {
      const timer = setTimeout(() => {
        loadUsers(userSearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [userSearch]);

  // Search debouncing for questions
  useEffect(() => {
    if (activeTab === "questions") {
      const timer = setTimeout(() => {
        loadQuestions(questionSearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [questionSearch]);


    // Automatically dismiss the alert notification after 4 seconds
  useEffect(() => {
    if (alertMessage.text) {
      const timer = setTimeout(() => {
        setAlertMessage({ type: "", text: "" });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [alertMessage]);


  // ============================================================
  // CONFIRMATION MODAL & ACTIONS
  // ============================================================

  const openDeleteModal = (type, targetId, targetTitle) => {
    setModal({
      isOpen: true,
      type,
      targetId,
      targetTitle,
    });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      type: "",
      targetId: null,
      targetTitle: "",
    });
  };

  const handleConfirmDelete = async () => {
    try {
      if (modal.type === "user") {
        const response = await deleteAdminUser(modal.targetId);
        setAlertMessage({
          type: "success",
          text: response.message || "User removed successfully.",
        });
        loadUsers(userSearch);
      } else if (modal.type === "question") {
        const response = await deleteAdminQuestion(modal.targetId);
        setAlertMessage({
          type: "success",
          text: response.message || "Question deleted successfully.",
        });
        loadQuestions(questionSearch);
      }
      loadStats();
    } catch (err) {
      setAlertMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "An error occurred while deleting the item.",
      });
    } finally {
      closeModal();
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className={styles.adminContainer}>
      {/* 1. Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <ShieldCheck size={26} />
        </div>
        <div className={styles.headerText}>
          <h2>Admin Dashboard</h2>
          <p>Monitor forum metrics, manage users, and moderate discussions.</p>
        </div>
      </div>

      {/* Alert Notification */}
      {alertMessage.text && (
        <div
          className={
            alertMessage.type === "success"
              ? styles.alertSuccess
              : styles.alertError
          }
        >
          {alertMessage.text}
        </div>
      )}

      {/* 2. Overview Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap}>
            <Users size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statTitle}>Total Users</span>
            <span className={styles.statValue}>{stats.totalUsers}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap}>
            <HelpCircle size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statTitle}>Total Questions</span>
            <span className={styles.statValue}>{stats.totalQuestions}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap}>
            <MessageSquare size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statTitle}>Total Answers</span>
            <span className={styles.statValue}>{stats.totalAnswers}</span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabButton} ${
            activeTab === "users" ? styles.activeTab : ""
          }`}
          onClick={() => handleTabChange("users")}
        >
          <Users size={16} />
          User Management
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${
            activeTab === "questions" ? styles.activeTab : ""
          }`}
          onClick={() => handleTabChange("questions")}
        >
          <HelpCircle size={16} />
          Question Moderation
        </button>
      </div>

      {/* 4. Tab 1: User Management */}
      {activeTab === "users" && (
        <div className={styles.contentCard}>
          <div className={styles.searchBar}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyState}>
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyState}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = Number(u.user_id) === Number(currentUser?.userId);
                    return (
                      <tr key={u.user_id}>
                        <td>
                          <strong>
                            {u.first_name} {u.last_name}
                          </strong>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span
                            className={
                              u.role === "admin"
                                ? styles.badgeAdmin
                                : styles.badgeUser
                            }
                          >
                            {u.role || "user"}
                          </span>
                        </td>
                        <td>{formatDate(u.created_at)}</td>
                        <td>
                          {isSelf ? (
                            <span className={styles.selfLabel}>— (You)</span>
                          ) : (
                            <button
                              type="button"
                              className={styles.deleteButton}
                              onClick={() =>
                                openDeleteModal(
                                  "user",
                                  u.user_id,
                                  `${u.first_name} ${u.last_name}`,
                                )
                              }
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Question Moderation */}
      {activeTab === "questions" && (
        <div className={styles.contentCard}>
          <div className={styles.searchBar}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search questions or author..."
              value={questionSearch}
              onChange={(e) => setQuestionSearch(e.target.value)}
            />
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Author</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className={styles.emptyState}>
                      Loading questions...
                    </td>
                  </tr>
                ) : questions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className={styles.emptyState}>
                      No questions found.
                    </td>
                  </tr>
                ) : (
                  questions.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <strong>{q.title}</strong>
                        <span className={styles.subText}>
                          {q.content?.length > 80
                            ? `${q.content.substring(0, 80)}...`
                            : q.content}
                        </span>
                      </td>
                      <td>
                        {q.first_name} {q.last_name}
                        <span className={styles.subText}>{q.email}</span>
                      </td>
                      <td>{formatDate(q.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() =>
                            openDeleteModal("question", q.id, q.title)
                          }
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Confirmation Modal */}
      {modal.isOpen && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div
            className={styles.modalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>
              {modal.type === "user" ? "Remove User" : "Delete Question"}
            </h3>
            <p className={styles.modalMessage}>
              Are you sure you want to{" "}
              {modal.type === "user" ? "remove" : "delete"}{" "}
              <strong>"{modal.targetTitle}"</strong>?
              {modal.type === "user" &&
                " All questions and answers associated with this user will also be removed."}
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmDeleteBtn}
                onClick={handleConfirmDelete}
              >
                {modal.type === "user" ? "Remove User" : "Delete Question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
