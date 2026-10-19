import { Outlet } from "react-router-dom";

import { useSidebar } from "../../context/SidebarContext.jsx";
import AppFooter from "../AppFooter/AppFooter.jsx";
import Navbar from "../Navbar/Navbar.jsx";
import Sidebar from "../Sidebar/Sidebar.jsx";
import styles from "./Layout.module.css";

// Shared layout for authenticated application pages.
const Layout = () => {
  const { isSidebarOpen, isMobile, closeSidebar } = useSidebar();

  return (
    <div className={styles.shell}>
      <Sidebar />

      {isMobile && isSidebarOpen && (
        <div
          aria-hidden="true"
          className={styles.backdrop}
          onClick={closeSidebar}
        />
      )}

      <div
        className={`${styles.content} ${
          !isSidebarOpen ? styles.contentExpanded : ""
        }`}
      >
        <Navbar />

        <main className={styles.page}>
          <Outlet />

          {/* Shared footer appears below every authenticated page */}
          <AppFooter />
        </main>
      </div>
    </div>
  );
};

export default Layout;
