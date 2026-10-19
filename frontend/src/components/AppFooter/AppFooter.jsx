import styles from "./AppFooter.module.css";

// Shared footer for authenticated application pages.
const AppFooter = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.brand}>
        <strong>Evangadi Forum</strong>

        <p>
          A practice space for technical Q&A, peer feedback, and AI-assisted
          search, built for Evangadi learners and mentors.
        </p>

        <small className={styles.copyright}>
          © 2026 Evangadi Forum. For educational use.
        </small>
      </div>

      <nav className={styles.links} aria-label="Footer navigation">
        <a href="#about">About</a>
        <a href="#privacy">Privacy</a>
        <a href="#terms">Terms</a>
        <a href="#contact">Contact</a>
      </nav>
    </footer>
  );
};

export default AppFooter;
