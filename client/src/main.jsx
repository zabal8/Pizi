import * as React from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";

import "./styles.css";
import "./modules.css";

const root = createRoot(document.getElementById("root"));

root.render(
  React.createElement(React.StrictMode, null, React.createElement(App)),
);
