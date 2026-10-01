import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@productivity-os/shared-ui/globals.css";
import { SharedUiProvider } from "@productivity-os/shared-ui/components/shared-ui-provider";
import { NativeThemeSync } from "@productivity-os/shared-ui/components/native-theme-sync";
import { ThemeProvider } from "@productivity-os/shared-ui/components/theme-provider";
import { Toaster } from "@productivity-os/shared-ui/components/ui/toaster";
import { App } from "./App";
import "./App.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      defaultTheme="system"
      storageKey="revise-theme"
      systemThemeMigrationVersion="2026-09"
    >
      <SharedUiProvider>
        <NativeThemeSync />
        <App />
        <Toaster />
      </SharedUiProvider>
    </ThemeProvider>
  </StrictMode>,
);
