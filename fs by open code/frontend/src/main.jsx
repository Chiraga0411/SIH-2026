import React from "react";
import { createRoot } from "react-dom/client";
// Fonts are bundled from npm so the workbench makes no external requests.
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import App from "./App";
import "./index.css";
import "./campus/campus.css";

createRoot(document.getElementById("root")).render(<App />);
