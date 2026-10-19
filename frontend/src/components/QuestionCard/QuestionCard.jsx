import { ArrowUpRight, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import styles from "./QuestionCard.module.css";

const formatRelativeTime = (value) => {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Recently";
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000),
  );

  if (elapsedSeconds < 60) return "Just now";

  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Reusable question summary for the dashboard and personal-topic list.
const QuestionCard = ({ question, variant = "card" }) => {
  const navigate = useNavigate();
  const questionHash = question.questionHash || question.question_hash;
  const author = question.author || {};
  const answerCount = Number(question.answerCount) || 0;
  const authorName =
    `${author.firstName || ""} ${author.lastName || ""}`.trim() ||
    "Forum member";
  const isFeedRow = variant === "feed";

  const handleClick = () => {
    if (questionHash) {
      navigate(`/questions/${encodeURIComponent(questionHash)}`);
    }
  };

  const getInitials = () => {
    const first = author.firstName?.[0] || "";
    const last = author.lastName?.[0] || "";

    return `${first}${last}`.toUpperCase() || "U";
  };

  return (
    <button
      aria-label={`Open question: ${question.title}`}
      className={`${styles.card} ${isFeedRow ? styles.feedRow : ""}`}
      onClick={handleClick}
      type="button"
    >
      <div className={styles.avatar}>{getInitials()}</div>

      <div className={styles.content}>
        <h3 className={styles.title}>{question.title}</h3>

        <p className={styles.excerpt}>{question.content}</p>

        <div className={styles.meta}>
          <span className={styles.replies}>
            <MessageCircle aria-hidden="true" size={14} />
            {answerCount} {answerCount === 1 ? "reply" : "replies"}
          </span>
          <span>by {authorName}</span>
          <span>{formatRelativeTime(question.createdAt)}</span>
        </div>
      </div>

      {question.isOwner && <span className={styles.yours}>YOURS</span>}
      {isFeedRow && (
        <ArrowUpRight aria-hidden="true" className={styles.openIcon} size={19} />
      )}
    </button>
  );
};

export default QuestionCard;
