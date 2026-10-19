import { SidebarProvider } from "./context/SidebarContext.jsx";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <SidebarProvider>
      <AppRoutes />
    </SidebarProvider>
  );
}

export default App;
