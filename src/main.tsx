import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/open-sauce-sans/400.css";
import "@fontsource/open-sauce-sans/500.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
