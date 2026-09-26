import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("Revise uses its supplied logo for web and native app branding", () => {
  const config = readFileSync(
    new URL("../src-tauri/tauri.conf.json", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(
    new URL("../src/App.css", import.meta.url),
    "utf8",
  );
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(
    existsSync(new URL("../src/assets/logo/logo.png", import.meta.url)),
    true,
  );
  assert.doesNotMatch(config, /canvas\/src-tauri\/icons/);
  assert.match(config, /icons\/icon\.icns/);
  assert.match(html, /href="\/src\/assets\/logo\/logo\.png"/);
  assert.doesNotMatch(html, /favicon\.svg/);
  assert.match(styles, /--shared-ui-accent:\s*#FFA800/i);
});

test("Revise actions use the shared button component", () => {
  const session = readFileSync(
    new URL("../src/components/review-session.tsx", import.meta.url),
    "utf8",
  );
  assert.match(session, /@productivity-os\/shared-ui\/components\/ui\/button/);
  assert.doesNotMatch(session, /<button\b/);
});

test("Revise receives the shared tooltip and application context menu provider", () => {
  const main = readFileSync(
    new URL("../src/main.tsx", import.meta.url),
    "utf8",
  );
  assert.match(main, /<SharedUiProvider>/);
});

test("Revise routes standalone and compact session windows to separate feature shells", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const dashboard = readFileSync(
    new URL("../src/features/dashboard/dashboard.tsx", import.meta.url),
    "utf8",
  );
  const library = readFileSync(
    new URL("../src/features/library/library-sidebar.tsx", import.meta.url),
    "utf8",
  );
  const native = readFileSync(
    new URL("../src-tauri/src/lib.rs", import.meta.url),
    "utf8",
  );
  const config = readFileSync(
    new URL("../src-tauri/tauri.conf.json", import.meta.url),
    "utf8",
  );

  assert.match(app, /sessionId/);
  assert.match(app, /<ReviewWindow/);
  assert.match(app, /<StandaloneWorkspace/);
  assert.match(dashboard, /ChartContainer/);
  assert.match(dashboard, /from "recharts"/);
  assert.match(library, /assets\/logo\/logo\.png/);
  assert.match(native, /inner_size\(860\.0, 680\.0\)/);
  assert.match(native, /AppActivity::ReviseNotebookReview/);
  assert.match(native, /revise:start-session/);
  assert.match(config, /productivity-revise/);
  assert.match(config, /"width": 1360/);
  assert.doesNotMatch(native, /std::process::Command/);
});

test("Revise closes its window after persisting close-session state", () => {
  const reviewWindow = readFileSync(
    new URL("../src/features/review/review-window.tsx", import.meta.url),
    "utf8",
  );
  const capability = JSON.parse(
    readFileSync(
      new URL("../src-tauri/capabilities/default.json", import.meta.url),
      "utf8",
    ),
  ) as { permissions: string[] };

  assert.match(reviewWindow, /getCurrentWindow\(\)\.close\(\)/);
  assert.ok(capability.permissions.includes("core:window:allow-close"));
});
