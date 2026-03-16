import React from "react";
import ReactDOM from "react-dom/client";
import PlaygroundApp from "@/app/PlaygroundApp";
import "@/styles.css";

const rootElement = document.getElementById("playground-app-root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <PlaygroundApp />
    </React.StrictMode>,
  );
}
