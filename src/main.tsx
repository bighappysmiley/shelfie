import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/open-sauce-sans/400.css";
import "@fontsource/open-sauce-sans/500.css";
import "./index.css";
import { initTheme, watchSystemTheme } from "./lib/theme";
import App from "./App";

initTheme();
watchSystemTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
