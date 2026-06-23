import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BillingProvider } from "./BillingContext";
import Dashboard from "./Dashboard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BillingProvider>
      <Dashboard />
    </BillingProvider>
  </React.StrictMode>,
);
