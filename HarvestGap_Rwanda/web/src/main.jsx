import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DataProvider } from "./data";
import { FarmProvider } from "./farm";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <DataProvider>
        <FarmProvider>
          <App />
        </FarmProvider>
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>
);
