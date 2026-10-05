import { spawn } from "node:child_process";
import path from "node:path";
import type { Render } from "../providers/types";

/**
 * Runs the Python worker directly (RENDER_DRIVER=local) or inside the Docker image
 * (RENDER_DRIVER=docker). Both share storage with this process through LOCAL_STORAGE_DIR.
 */
export function localRender(mode: "local" | "docker"): Render {
  return async (_timeline, timelineKey) => {
    const workerDir = path.resolve(process.env.WORKER_DIR ?? "./worker");
    const storageDir = path.resolve(process.env.LOCAL_STORAGE_DIR ?? "./storage");

    const [cmd, args, cwd] =
      mode === "local"
        ? [
            path.resolve(process.env.WORKER_PYTHON ?? "./worker/.venv/Scripts/python.exe"),
            ["-m", "vidlore_worker", "--timeline", timelineKey],
            workerDir,
          ]
        : [
            "docker",
            [
              "run", "--rm",
              "-e", "STORAGE_DRIVER=local",
              "-e", "LOCAL_STORAGE_DIR=/storage",
              "-v", `${storageDir}:/storage`,
              process.env.WORKER_IMAGE ?? "vidlore-worker",
              "--timeline", timelineKey,
            ],
            workerDir,
          ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn(cmd, args as string[], {
        cwd: cwd as string,
        stdio: "inherit",
        env: { ...process.env, STORAGE_DRIVER: "local", LOCAL_STORAGE_DIR: storageDir },
      });
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(`Render worker exited with code ${code}`)),
      );
    });
    return { done: true };
  };
}
