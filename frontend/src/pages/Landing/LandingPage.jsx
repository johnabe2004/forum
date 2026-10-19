import { motion as Motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  MessageSquare,
  Search,
  Layers,
  PenSquare,
  ArrowRight,
  CheckCircle2,
  FileText,
  Database,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";

import styles from "./LandingPage.module.css";

const LandingPage = () => {
  const navigate = useNavigate();

  const { isAuthenticated } = useAuth();

  const scrollToHowItWorks = () => {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={styles.page}>
      {/* ------------------------------------------------------
       * STICKY HEADER
       * ------------------------------------------------------ */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button
            type="button"
            className={styles.brand}
            onClick={() => navigate("/")}
            aria-label="Evangadi Forum home"
          >
            <span className={styles.brandMark} aria-hidden>
              <MessageSquare size={20} strokeWidth={2} />
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>Evangadi Forum</span>
              <span className={styles.brandLine}>
                Learn together. Ask with context.
              </span>
            </span>
          </button>

          <nav className={styles.nav} aria-label="Landing page sections">
            <button
              type="button"
              className={styles.navLink}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Overview
            </button>
            <button
              type="button"
              className={styles.navLink}
              onClick={() =>
                document
                  .getElementById("course-rag")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Course RAG
            </button>
            <button
              type="button"
              className={styles.navLink}
              onClick={scrollToHowItWorks}
            >
              How it works
            </button>
          </nav>

          {/*
           * Buttons change depending on whether AuthContext
           * currently holds a logged-in user.
           */}
          <div className={styles.headerActions}>
            {isAuthenticated ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => navigate("/dashboard")}
              >
                Open forum
                <ArrowRight size={16} aria-hidden />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => navigate("/auth")}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() =>
                    navigate("/auth", { state: { register: true } })
                  }
                >
                  Create account
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------
         * HERO SECTION
         * ------------------------------------------------------ */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div>
              <Motion.p
                className={styles.eyebrow}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Sparkles size={14} aria-hidden />
                Keyword search + embedding similarity
              </Motion.p>

              <Motion.h1
                className={styles.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                A calm place for{" "}
                <span className={styles.titleAccent}>technical Q&A</span>
              </Motion.h1>

              <Motion.p
                className={styles.lead}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Post with enough context for peers to help in one pass. Search
                the archive by phrase or by meaning, keep your threads in one
                place, and ground questions in{" "}
                <strong className={styles.leadStrong}>course documents</strong>{" "}
                with retrieval-augmented generation (RAG) so answers cite the
                right syllabus, readings, and handouts.
              </Motion.p>

              <Motion.div
                className={styles.heroCtas}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() =>
                    navigate(isAuthenticated ? "/dashboard" : "/auth")
                  }
                >
                  {isAuthenticated ? "Go to home" : "Get started"}
                  <ArrowRight size={16} aria-hidden />
                </button>
                {!isAuthenticated && (
                  <button
                    type="button"
                    className={styles.btnOutline}
                    onClick={scrollToHowItWorks}
                  >
                    See how it works
                  </button>
                )}
              </Motion.div>
            </div>
            <aside className={styles.heroPanel} aria-label="What you get">
              <p className={styles.heroPanelLabel}>At a glance</p>
              <ul className={styles.heroPanelList}>
                <li>
                  <CheckCircle2 size={16} aria-hidden />
                  Markdown threads and replies
                </li>
                <li>
                  <CheckCircle2 size={16} aria-hidden />
                  Semantic search on question embeddings
                </li>
                <li>
                  <CheckCircle2 size={16} aria-hidden />
                  Optional AI draft tips when you ask or answer
                </li>
                <li>
                  <CheckCircle2 size={16} aria-hidden />
                  <span>
                    <strong className={styles.heroPanelStrong}>
                      Course RAG:
                    </strong>{" "}
                    upload or sync course materials, retrieve the best chunks
                    for each question, and answer with citations, not generic
                    web text.
                  </span>
                </li>
              </ul>
            </aside>
          </div>
        </section>

        {/* ------------------------------------------------------
         * COURSE RAG OVERVIEW
         * ------------------------------------------------------ */}
        <section
          className={styles.rag}
          id="course-rag"
          aria-labelledby="rag-heading"
        >
          <div className={styles.sectionInner}>
            <p className={styles.ragEyebrow}>Retrieval-augmented generation</p>
            <h2 className={styles.sectionTitle} id="rag-heading">
              Ground answers in your course library
            </h2>
            <p className={styles.sectionLead}>
              Forum search already helps you find <em>similar questions</em>{" "}
              from peers. RAG goes further: it finds{" "}
              <em>evidence inside your own documents</em> (readings, rubrics,
              lab specs) and surfaces those snippets when you write or review an
              answer.
            </p>
            <div className={styles.ragPipeline}>
              <article className={styles.ragStep}>
                <span className={styles.ragStepIcon} aria-hidden>
                  <FileText size={20} />
                </span>
                <h3 className={styles.ragStepTitle}>Ingest &amp; chunk</h3>
                <p className={styles.ragStepText}>
                  Upload or connect course files; split them into overlapping
                  chunks and store embeddings so retrieval stays fast and
                  auditable.
                </p>
              </article>
              <article className={styles.ragStep}>
                <span className={styles.ragStepIcon} aria-hidden>
                  <Database size={20} />
                </span>
                <h3 className={styles.ragStepTitle}>
                  Retrieve at question time
                </h3>
                <p className={styles.ragStepText}>
                  When you ask or search, the app pulls the top-matching chunks
                  from the cohort corpus, not just other threads.
                </p>
              </article>
              <article className={styles.ragStep}>
                <span className={styles.ragStepIcon} aria-hidden>
                  <Sparkles size={20} />
                </span>
                <h3 className={styles.ragStepTitle}>Grounded responses</h3>
                <p className={styles.ragStepText}>
                  Prompts quote or summarize retrieved spans, leaving room for
                  instructors to review sources.
                </p>
              </article>
            </div>
            <p className={styles.ragFootnote}>
              Live forum threads, semantic question search, draft/fit AI
              helpers, and this RAG pipeline work together: uploads and access
              control live in the Knowledge base per cohort.
            </p>
          </div>
        </section>

        {!isAuthenticated && (
          <>
            <section className={styles.capabilities}>
              <div className={styles.sectionInner}>
                <h2 className={styles.sectionTitle}>
                  Built for cohort coursework
                </h2>
                <p className={styles.sectionLead}>
                  Same patterns you use after sign-in, without a separate
                  "marketing product."
                </p>
                <div className={styles.cardGrid}>
                  <article className={styles.card}>
                    <div className={styles.cardIcon} aria-hidden>
                      <Search size={22} strokeWidth={1.75} />
                    </div>
                    <h3 className={styles.cardTitle}>Find related work</h3>
                    <p className={styles.cardBody}>
                      Keyword filters for exact matches, plus similarity search
                      when you're still shaping the right vocabulary.
                    </p>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardIcon} aria-hidden>
                      <MessageSquare size={22} strokeWidth={1.75} />
                    </div>
                    <h3 className={styles.cardTitle}>Readable threads</h3>
                    <p className={styles.cardBody}>
                      Questions and answers stay structured so the group can
                      reuse explanations before exams.
                    </p>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardIcon} aria-hidden>
                      <Sparkles size={22} strokeWidth={1.75} />
                    </div>
                    <h3 className={styles.cardTitle}>Lightweight AI help</h3>
                    <p className={styles.cardBody}>
                      Suggestions on your question draft. Always your choice to
                      apply or post.
                    </p>
                  </article>
                  <article className={styles.card}>
                    <div className={styles.cardIcon} aria-hidden>
                      <Layers size={22} strokeWidth={1.75} />
                    </div>
                    <h3 className={styles.cardTitle}>
                      RAG over your course library
                    </h3>
                    <p className={styles.cardBody}>
                      Upload PDFs and notes; the system retrieves the most
                      relevant passages when you ask.
                    </p>
                  </article>
                </div>
              </div>
            </section>

            {/* ----------------------------------------------------
             * HOW IT WORKS
             * ---------------------------------------------------- */}
            <section
              className={styles.process}
              id="how-it-works"
              aria-labelledby="how-heading"
            >
              <div className={styles.sectionInner}>
                <h2 className={styles.sectionTitle} id="how-heading">
                  How it works
                </h2>
                <p className={styles.sectionLead}>
                  Four steps from question to searchable knowledge for the next
                  person.
                </p>
                <ol className={styles.steps}>
                  <li className={styles.step}>
                    <span className={styles.stepIcon} aria-hidden>
                      <PenSquare size={18} />
                    </span>
                    <div>
                      <h3 className={styles.stepTitle}>Ask with context</h3>
                      <p className={styles.stepText}>
                        Title, environment, and what you tried, so peers can
                        reproduce before they teach.
                      </p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.stepIcon} aria-hidden>
                      <MessageSquare size={18} />
                    </span>
                    <div>
                      <h3 className={styles.stepTitle}>Get answers</h3>
                      <p className={styles.stepText}>
                        Replies live in one thread with markdown, visible to
                        everyone in the cohort.
                      </p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.stepIcon} aria-hidden>
                      <Search size={18} />
                    </span>
                    <div>
                      <h3 className={styles.stepTitle}>Search two ways</h3>
                      <p className={styles.stepText}>
                        Classic keyword search, or semantic search when you want
                        "questions like this one."
                      </p>
                    </div>
                  </li>
                  <li className={styles.step}>
                    <span className={styles.stepIcon} aria-hidden>
                      <Layers size={18} />
                    </span>
                    <div>
                      <h3 className={styles.stepTitle}>Own your trail</h3>
                      <p className={styles.stepText}>
                        Your topics list keeps authorship clear, so you can
                        revisit what you've asked.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </section>

            {/* ----------------------------------------------------
             * BOTTOM CALL TO ACTION
             * ---------------------------------------------------- */}
            <section className={styles.cta}>
              <div className={styles.ctaInner}>
                <h2 className={styles.ctaTitle}>Ready when you are</h2>
                <p className={styles.ctaText}>
                  Create a free learner account to post, reply, and search the
                  forum index.
                </p>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => navigate("/auth")}
                >
                  Create free account
                  <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {/* ------------------------------------------------------
       * FOOTER
       * ------------------------------------------------------ */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <p className={styles.footerBrand}>Evangadi Forum</p>
            <p className={styles.footerMeta}>
              © {new Date().getFullYear()} · Learner-led Q&A
            </p>
          </div>
          <div className={styles.footerLinks}>
            <button
              type="button"
              className={styles.footerLink}
              onClick={() => navigate("/auth")}
            >
              Sign in
            </button>
            <span className={styles.footerDot} aria-hidden>
              ·
            </span>
            <a href="#" className={styles.footerLinkAnchor}>
              Privacy
            </a>
            <span className={styles.footerDot} aria-hidden>
              ·
            </span>
            <a href="#" className={styles.footerLinkAnchor}>
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
