// ============================================================
// MY QUESTIONS PAGE
// ============================================================

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import QuestionCard from "../../components/QuestionCard/QuestionCard.jsx";
import { listQuestions } from "../../services/questionService.js";
import styles from "./MyQuestions.module.css";

const MyQuestions = () => {
  // Allows the user to navigate to different pages
  const navigate = useNavigate();

  // Store the user's questions and page status
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch the user's questions when the component loads
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        // Request only questions created by the current user
        const data = await listQuestions({ mine: true });

        // Save the returned questions in state
        setQuestions(data.questions);
      } catch (requestError) {
        // Display the server error message if the request fails
        setError(
          requestError.response?.data?.message || "Could not load your topics.",
        );
      } finally {
        // Loading is finished whether the request succeeds or fails
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, []);

  return (
    <section className={styles.page}>
      {/* Page header containing the title and new question button */}
      <header className={styles.hero}>
        <div>
          <span>Your workspace</span>
          <h2>Your topics</h2>

          <p>
            Only questions you created. Open one to read answers or add
            follow-ups. Rows use the same left accent as your threads on Home.
          </p>
        </div>

        {/* Navigate to the page for creating a new question */}
        <button onClick={() => navigate("/questions/ask")} type="button">
          <Plus size={17} />
          New question
        </button>
      </header>

      {/* Show a loading message while questions are being fetched */}
      {isLoading && <div className={styles.state}>Loading your topics…</div>}

      {/* Show an error message when the request fails */}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* Show an empty state when the user has no questions */}
      {!isLoading && !error && !questions.length && (
        <div className={styles.state}>
          <h3>You have not posted a question yet</h3>

          <p>Ask your first question to start your personal topic list.</p>

          {/* Allow the user to create their first question */}
          <button onClick={() => navigate("/questions/ask")} type="button">
            Ask a question
          </button>
        </div>
      )}

      {/* Display the questions when they are successfully loaded */}
      {!isLoading && !error && questions.length > 0 && (
        <section className={styles.list}>
          {/* Create a QuestionCard for each question */}
          {questions.map((question) => (
            <QuestionCard key={question.questionHash} question={question} />
          ))}
        </section>
      )}
    </section>
  );
};

export default MyQuestions;
