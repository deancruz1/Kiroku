import "server-only";
import axios from "axios";
import { applyMalPolicy } from "@/lib/mal-client";
import { ATTEMPT_TIMEOUT_MS } from "@/lib/jikan-policy";
import { MAL_BASE_URL } from "@/lib/upstream";

export const malApi = axios.create({
  baseURL: MAL_BASE_URL,
  timeout: ATTEMPT_TIMEOUT_MS,
});

// Read on each request so the ID stays on the server and out of the bundle.
applyMalPolicy(malApi, { getClientId: () => process.env.MAL_CLIENT_ID });

export function isMalConfigured() {
  return Boolean(process.env.MAL_CLIENT_ID);
}
