const publicBackendUrl =
  typeof process !== "undefined"
    ? process.env.BUN_PUBLIC_BACKEND_URL
    : undefined;

export const BACKEND_URL = publicBackendUrl ?? "http://localhost:3001";
