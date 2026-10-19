import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const SidebarContext = createContext(null);

const STORAGE_KEY = "evangadi_sidebar_open";
const MOBILE_BREAKPOINT = 900;

// Helper to safely read saved sidebar preference
const getSavedSidebarState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved !== null ? saved === "true" : true;
};

// Helper to persist preference only on desktop
const persistSidebarPreference = (isOpen) => {
  if (window.innerWidth > MOBILE_BREAKPOINT) {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
  }
};

export const SidebarProvider = ({ children }) => {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth <= MOBILE_BREAKPOINT
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      return false;
    }
    return getSavedSidebarState();
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      persistSidebarPreference(next);
      return next;
    });
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    persistSidebarPreference(false);
  }, []);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
    persistSidebarPreference(true);
  }, []);

  // Handle responsive resize between desktop and mobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile((prevMobile) => {
        if (!prevMobile && mobile) {
          // Entering mobile: close sidebar drawer
          setIsSidebarOpen(false);
        } else if (prevMobile && !mobile) {
          // Returning to desktop: restore saved preference
          setIsSidebarOpen(getSavedSidebarState());
        }
        return mobile;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Shortcut key (Ctrl+B or Cmd+B) to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        isMobile,
        toggleSidebar,
        closeSidebar,
        openSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};
