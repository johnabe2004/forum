import { Bold, Code2, Italic, Link2, Send, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";

import {
  createQuestion,
  getDraftCoach,
} from "../../services/questionService.js";
import styles from "./PostQuestion.module.css";

const PostQuestion = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [error, setError] = useState("");
  const [coachError, setCoachError] = useState("");
  const [isCoaching, setIsCoaching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef(null);

  const applyFormatting = ({ before, after, placeholder = "text" }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end) || placeholder;
    const nextValue = `${content.slice(0, start)}${before}${selectedText}${after}${content.slice(end)}`;

    setContent(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursorStart = start + before.length;
      const nextCursorEnd = nextCursorStart + selectedText.length;
      textarea.setSelectionRange(nextCursorStart, nextCursorEnd);
    });
  };
  //post question page validation>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  const validateQuestion = () => {
    if (title.trim().length < 5)
      return "Title must contain at least 5 characters.";
    if (content.trim().length < 10)
      return "Details must contain at least 10 characters.";
    return "";
  };
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  const handleCoach = async () => {
    setCoachError("");
    // Clear previous AI suggestions
    setCoachFeedback("");
  
    if (!title.trim() && !content.trim()) {
      setCoachError(
        "Write a title or some details before asking for suggestions.",
      );
      return;
    }

    setIsCoaching(true);
    try {
      setCoachFeedback(
        await getDraftCoach({ title: title.trim(), content: content.trim() }),
      );
    } catch (requestError) {
      setCoachError(
        requestError.response?.data?.message ||
          "AI suggestions are unavailable right now.",
      );
    } finally {
      setIsCoaching(false);
    }
  };
  //post question page>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateQuestion();
    setError(validationError);
    if (validationError) return;

    setIsSubmitting(true);
    try {
      const question = await createQuestion({
        title: title.trim(),
        content: content.trim(),
      });
      navigate(`/questions/${question.questionHash}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not post your question. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span>Ask the cohort</span>
        <h2>Publish to the forum</h2>
        <p>
          Public threads help the whole cohort. Write as if a classmate will
          debug your issue tomorrow. They only know what you put on the page.
        </p>
      </header>
      <aside className={styles.guidance}>
        <h3>Write questions people can answer in one pass</h3>
        <p>
          Mentors volunteer their time. Give them runnable context, expected vs
          actual behavior, and a tight scope so they can reproduce the issue
          without guessing your setup.
        </p>
        <h4>Checklist before you post</h4>
        <ul>
          <li>
            <b>Title as a headline</b> that states the symptom and tech stack.
          </li>
          <li>
            <b>Repro steps</b> numbered, with environment details when they
            matter.
          </li>
          <li>
            <b>Minimal code</b> in fenced markdown blocks; trim unrelated lines.
          </li>
          <li>
            <b>Exact errors</b> copied verbatim, including useful stack-trace
            snippets.
          </li>
        </ul>
        <h4>Validation rules (enforced by the form)</h4>
        <ul>
          <li>
            <b>Title length:</b> between 5 and 255 characters.
          </li>
          <li>
            <b>Body length:</b> a minimum of 10 characters describing your
            problem.
          </li>
          <li>
            <b>Single topic:</b> split unrelated bugs into separate threads.
          </li>
        </ul>
      </aside>
      {/* QUESTION CREATION FORM >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> */}

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="question-title">Title</label>
          <small>
            Be specific and imagine you are asking a question to another person.
          </small>
          <input
            id="question-title"
            maxLength="255"
            onChange={(event) => {
              setTitle(event.target.value);
              setCoachFeedback(null);
            }}
            placeholder="e.g. How do I handle state management using Context API in React?"
            value={title}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="question-content">
            What are the details of your problem?
          </label>
          <small>
            Introduce the problem and expand on what you put in the title.
            Minimum 10 characters.
          </small>
          <div className={styles.editor}>
            <div
              className={styles.editorToolbar}
              aria-label="Formatting options"
            >
              <button
                aria-label="Bold"
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyFormatting({
                    before: "**",
                    after: "**",
                    placeholder: "bold text",
                  });
                }}
                type="button"
                className={styles.formatButton}
              >
                <Bold size={16} />
              </button>
              <button
                aria-label="Italic"
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyFormatting({
                    before: "*",
                    after: "*",
                    placeholder: "italic text",
                  });
                }}
                type="button"
                className={styles.formatButton}
              >
                <Italic size={16} />
              </button>
              <button
                aria-label="Code block"
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyFormatting({
                    before: "\n```\n",
                    after: "\n```\n",
                    placeholder: "code",
                  });
                }}
                type="button"
                className={styles.formatButton}
              >
                <Code2 size={16} />
              </button>
              <button
                aria-label="Insert link"
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyFormatting({
                    before: "[",
                    after: "](https://example.com)",
                    placeholder: "link text",
                  });
                }}
                type="button"
                className={styles.formatButton}
              >
                <Link2 size={16} />
              </button>
              <span>{content.length} characters</span>
            </div>
            <textarea
              id="question-content"
              ref={textareaRef}
              onChange={(event) => {
                setContent(event.target.value);
                setCoachFeedback(null);
              }}
              placeholder="Include all the information someone would need to answer your question… You can use Markdown to format your code!"
              value={content}
            />
          </div>
        </div>
        <div className={styles.coachRow}>
          <button
            className={styles.coachButton}
            disabled={isCoaching}
            onClick={handleCoach}
            type="button"
          >
            <Sparkles size={16} />
            {isCoaching ? "Reviewing draft…" : "AI suggestions"}
          </button>
          <p>Suggestions only. You still choose what to post.</p>
        </div>
        {coachError && (
          <div className={styles.error} role="alert">
            {coachError}
          </div>
        )}
        {coachFeedback?.tips?.length > 0 && (
          <aside className={styles.coachPanel}>
            <h3>AI draft suggestions</h3>
            <ul>
              {coachFeedback.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </aside>
        )}
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        <footer className={styles.actions}>
          <button
            className={styles.cancel}
            onClick={() => navigate(-1)}
            type="button"
          >
            Cancel
          </button>
          <button
            className={styles.submit}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Posting…" : "Post Question"}
            <Send size={16} />
          </button>
        </footer>
      </form>
    </section>
  );
};

export default PostQuestion;
