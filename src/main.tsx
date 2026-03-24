import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { useAuthStore } from "./store/authStore";

useAuthStore.getState().restoreSession().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
