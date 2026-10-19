import { ArrowRight, Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import QuestionCard from "../../components/QuestionCard/QuestionCard.jsx";
import { getSavedQuestions } from "../../services/questionService.js";

import styles from "./SavedQuestions.module.css";

// Displays the authenticated user's persistent list of questions saved for later.
const SavedQuestions = () => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSavedQuestions = async () => {
      try {
        const data = await getSavedQuestions();

        setQuestions(data.questions);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Could not load your saved questions.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedQuestions();
  }, []);

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            Your reading list
          </span>

          <h2>Saved Questions</h2>

          <p>
            Keep useful technical discussions in one place and
            return to them whenever you have time to read, answer,
            or review the solution.
          </p>
        </div>

        <div
          className={styles.count}
          aria-label={`${questions.length} saved questions`}
        >
          <Bookmark size={17} />

          {questions.length} saved
        </div>
      </header>

      {isLoading && (
        <div className={styles.state}>
          Loading your saved questions…
        </div>
      )}

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && !questions.length && (
        <div className={styles.empty}>
          <div
            className={styles.emptyIcon}
            aria-hidden="true"
          >
            <Bookmark size={22} />
          </div>

          <h3>No saved questions yet</h3>

          <p>
            Open a question and choose <strong>Save</strong> when
            you want to keep it for later.
          </p>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            Browse questions
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {!isLoading && !error && questions.length > 0 && (
        <section
          className={styles.list}
          aria-label="Saved questions list"
        >
          {questions.map((question) => (
            <QuestionCard
              key={question.questionHash}
              question={question}
            />
          ))}
        </section>
      )}
    </section>
  );
};

export default SavedQuestions;