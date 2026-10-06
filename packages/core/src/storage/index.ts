import { fromRoot } from "../paths";
import { LocalStorage, signFileKey } from "./local";
import type { Storage } from "./types";

let instance: Storage | undefined;

export function getStorage(): Storage {
  if (instance) return instance;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  switch (driver) {
    case "local":
      instance = new LocalStorage(fromRoot(process.env.LOCAL_STORAGE_DIR ?? "./storage"));
      break;
    default:
      throw new Error(`Unknown STORAGE_DRIVER ${driver}`);
  }
  return instance;
}

export const keys = {
  job: (jobId: string) => `jobs/${jobId}/job.json`,
  jobPrefix: (jobId: string) => `jobs/${jobId}`,
  usage: (day: string) => `usage/${day}.json`,
  scene: (jobId: string, n: number) => `jobs/${jobId}/scenes/${n}.jpg`,
  sceneVideo: (jobId: string, n: number) => `jobs/${jobId}/scenes/${n}.mp4`,
  sceneClip: (jobId: string, n: number) => `jobs/${jobId}/scenes/${n}.clip.json`,
  timeline: (jobId: string) => `jobs/${jobId}/timeline.json`,
  work: (jobId: string) => `jobs/${jobId}/work`,
  video: (jobId: string) => `jobs/${jobId}/video.mp4`,
  thumbnail: (jobId: string) => `jobs/${jobId}/thumbnail.jpg`,
};

export { LocalStorage, signFileKey };
export type { Storage };
