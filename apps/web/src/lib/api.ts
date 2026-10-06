"use client";

import type { PublicJob } from "@vidlore/core";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(rest.body ? { "content-type": "application/json" } : {}),
      ...(token ? { "x-owner-token": token } : {}),
      ...headers,
    },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong. Please try again.", res.status, data.code);
  return data;
}

export type JobResponse = { job: PublicJob };
