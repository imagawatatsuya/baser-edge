import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ConsoleErrorBoundary } from "./components/ConsoleErrorBoundary";
import { adminRouter } from "./router";
import "./layout/admin.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConsoleErrorBoundary>
      <AuthProvider>
        <RouterProvider router={adminRouter} />
      </AuthProvider>
    </ConsoleErrorBoundary>
  </StrictMode>,
);
