import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nodeRequire = createRequire(import.meta.url);
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRunner = path.resolve(webRoot, "../api/test/run-browser-api.cjs");
const nextCli = nodeRequire.resolve("next/dist/bin/next");
const playwrightCli = nodeRequire.resolve("@playwright/test/cli");
const children = [];
let cleanupOnly = async () => {};

async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });
}

function start(command, args, cwd, env = process.env) {
  const child = spawn(command, args, { cwd, env, stdio: "inherit" });
  children.push(child);
  return child;
}

async function waitForUrl(url, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Test server exited before becoming ready: ${url}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        // A stale process can briefly answer on the same port while this child
        // is still failing with EADDRINUSE. Confirm the spawned server survives.
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (child.exitCode !== null) {
          throw new Error(`Test server exited during readiness: ${url}`);
        }
        return;
      }
    } catch {
      // Readiness polling continues until the bounded deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for test server: ${url}`);
}

function runPlaywright() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [playwrightCli, "test", ...process.argv.slice(2)],
      { cwd: webRoot, env: process.env, stdio: "inherit" },
    );
    children.push(child);
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

function stopChild(child) {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    child.kill("SIGTERM");
  }
}

async function main() {
  let status = 1;
  try {
    await Promise.all([assertPortFree(3011), assertPortFree(4011)]);
    ({ cleanupOnly } = nodeRequire("../../api/test/phase11-e2e-data.cjs"));
    const api = start(process.execPath, [apiRunner], webRoot);
    await waitForUrl("http://127.0.0.1:4011/docs", api);
    const web = start(
      process.execPath,
      [nextCli, "dev", "--port", "3011"],
      webRoot,
      {
        ...process.env,
        NODE_ENV: "test",
        SHOPMIND_E2E: "true",
        SHOPMIND_API_BASE_URL: "http://127.0.0.1:4011/api/v1",
      },
    );
    await waitForUrl("http://127.0.0.1:3011", web);
    status = await runPlaywright();
  } finally {
    for (const child of children.reverse()) stopChild(child);
    await cleanupOnly();
  }
  process.exit(status);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
