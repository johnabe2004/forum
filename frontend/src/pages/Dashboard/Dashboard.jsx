// ============================================================
// HOME DASHBOARD
// ============================================================
//
// Shows the community feed, plus its authenticated-user summary
// and both keyword and semantic search result states.

import { BookOpen, MessageSquare, PenSquare, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import QuestionCard from "../../components/QuestionCard/QuestionCard.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  listQuestions,
  searchQuestions,
} from "../../services/questionService.js";
import styles from "./Dashboard.module.css";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("keyword")?.trim() || "";
  const mode = searchParams.get("mode") || "keyword";
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data =
          keyword && mode === "semantic"
            ? await searchQuestions(keyword)
            : await listQuestions({ search: keyword });
        setQuestions(data.results || data.questions || []);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
          "Could not load the discussion feed.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [keyword, mode]);

  const metrics = useMemo(
    () => ({
      questions: questions.length,
      replies: questions.reduce(
        (total, question) => total + (question.answerCount || 0),
        0,
      ),
      unanswered: questions.filter((question) => !question.answerCount).length,
      yours: questions.filter(
        (question) => Number(question.author?.id) === Number(user?.userId),
      ).length,
    }),
    [questions, user?.userId],
  );

  const firstName = user?.firstName || "there";
  const isSearch = Boolean(keyword);

  return (
    <section className={styles.page}>
      <header className={styles.welcomeCard}>
        <span className={styles.eyebrow}>
          {isSearch ? "Search results" : "Forum home"}
        </span>
        <h2>
          {isSearch
            ? `Results for “${keyword}”`
            : `Good to see you, ${firstName}.`}
        </h2>
        <p>
          {isSearch
            ? mode === "semantic"
              ? "AI found related discussions by meaning, not only matching words."
              : "These threads match your search words."
            : "Start a topic, revisit your own threads, or skim the live feed. Search above works from any page once you are back on Home."}
        </p>
        {!isSearch && (
          <>
            <div className={styles.quickLinks}>
              <button onClick={() => navigate("/questions/ask")} type="button">
                <span>
                  <PenSquare size={21} />
                </span>
                <b>New question</b>
                <small>Share context, errors, and what you already tried</small>
              </button>
              <button onClick={() => navigate("/my-questions")} type="button">
                <span>
                  <MessageSquare size={21} />
                </span>
                <b>Your topics</b>
                <small>Filtered list of threads you authored</small>
              </button>
              <button onClick={() => navigate("/rag-documents")} type="button">
                <span>
                  <BookOpen size={21} />
                </span>
                <b>Knowledge base</b>
                <small>
                  Course library, uploads, and retrieval-backed context
                </small>
              </button>
            </div>
            <div className={styles.metricsIntro}>
              Figures below describe the newest threads in this feed (up to 100
              from the API).
            </div>
            <div className={styles.metrics}>
              <div>
                <small>Questions</small>
                <strong>{metrics.questions}</strong>
              </div>
              <div>
                <small>Replies</small>
                <strong>{metrics.replies}</strong>
              </div>
              <div>
                <small>Unanswered</small>
                <strong>{metrics.unanswered}</strong>
              </div>
              <div>
                <small>Yours</small>
                <strong>{metrics.yours}</strong>
              </div>
            </div>
          </>
        )}
      </header>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {isLoading && (
        <div className={styles.loading}>Loading the latest discussions…</div>
      )}
      {!isLoading && !error && !questions.length && (
        <div className={styles.empty}>
          <h3>{isSearch ? "No matching discussions" : "No discussions yet"}</h3>
          <p>
            {isSearch
              ? "Try a different phrase or use more detail for AI Search."
              : "Be the first person to start a helpful technical discussion."}
          </p>
          {!isSearch && (
            <button onClick={() => navigate("/questions/ask")} type="button">
              <Plus size={16} />
              Ask a question
            </button>
          )}
        </div>
      )}
      {!isLoading && !error && questions.length > 0 && (
        <section className={styles.feed}>
          <header className={styles.feedHeader}>
            <div>
              <h2>{isSearch ? "Matching discussions" : "Discussion feed"}</h2>
              <p>
                {isSearch
                  ? "Open a thread to read its full context and replies."
                  : "Your threads use a slim left accent in this list."}
              </p>
            </div>
            {!isSearch && <span>Newest threads</span>}
          </header>
          {questions.map((question) => (
            <QuestionCard
              key={question.questionHash}
              question={question}
              variant="feed"
            />
          ))}
        </section>
      )}
    </section>
  );
};

export default Dashboard;
