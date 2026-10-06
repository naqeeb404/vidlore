import { spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import path from "node:path";
import { fromRoot } from "../paths";
import type { Render } from "../providers/types";

/**
 * Runs the Python worker directly (RENDER_DRIVER=local) or inside the Docker image
 * (RENDER_DRIVER=docker). Both share storage with this process through LOCAL_STORAGE_DIR.
 * In background mode the worker is detached and reports progress through the signed webhook.
 */
export function localRender(mode: "local" | "docker"): Render {
  return async (timeline, timelineKey, opts) => {
    const workerDir = fromRoot(process.env.WORKER_DIR ?? "./worker");
    const storageDir = fromRoot(process.env.LOCAL_STORAGE_DIR ?? "./storage");

    const [cmd, args] =
      mode === "local"
        ? [
            fromRoot(
              process.env.WORKER_PYTHON ||
                (process.platform === "win32" ? "./worker/.venv/Scripts/python.exe" : "./worker/.venv/bin/python"),
            ),
            ["-m", "vidlore_worker", "--timeline", timelineKey],
          ]
        : [
            "docker",
            [
              "run", "--rm",
              "-e", "STORAGE_DRIVER=local",
              "-e", "LOCAL_STORAGE_DIR=/storage",
              "-e", "RENDER_WEBHOOK_SECRET",
              "--add-host", "host.docker.internal:host-gateway",
              "-v", `${storageDir}:/storage`,
              process.env.WORKER_IMAGE ?? "vidlore-worker",
              "--timeline", timelineKey,
            ],
          ];
    const env = { ...process.env, STORAGE_DRIVER: "local", LOCAL_STORAGE_DIR: storageDir, PYTHONIOENCODING: "utf-8" };

    if (opts?.background) {
      const logDir = path.join(storageDir, "jobs", timeline.jobId, "work");
      mkdirSync(logDir, { recursive: true });
      const log = openSync(path.join(logDir, "worker.log"), "a");
      const child = spawn(cmd, args as string[], { cwd: workerDir, env, detached: true, stdio: ["ignore", log, log], windowsHide: true });
      await new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      child.unref();
      return { done: false };
    }

    await new Promise<void>((resolve, reject) => {
      const child = spawn(cmd, args as string[], { cwd: workerDir, stdio: "inherit", env });
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(`Render worker exited with code ${code}`)),
      );
    });
    return { done: true };
  };
}
