import type { Render } from "../providers/types";
import { localRender } from "./local";

export function getRenderer(): Render {
  const driver = process.env.RENDER_DRIVER ?? "local";
  switch (driver) {
    case "local":
    case "docker":
      return localRender(driver);
    default:
      throw new Error(`Unknown RENDER_DRIVER ${driver}`);
  }
}
