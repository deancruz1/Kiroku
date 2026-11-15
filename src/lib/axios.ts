import "server-only";
import axios from "axios";
import { applyJikanPolicy } from "@/lib/jikan-client";
import { ATTEMPT_TIMEOUT_MS } from "@/lib/jikan-policy";
import { UPSTREAM_BASE_URL } from "@/lib/upstream";

export const jikanApi = axios.create({
  baseURL: UPSTREAM_BASE_URL,
  timeout: ATTEMPT_TIMEOUT_MS,
});

// Time budget, retries and request spacing. The scheduler is per server
// instance (or browser tab), so it cuts self-inflicted 429s but cannot
// coordinate separate serverless instances.
applyJikanPolicy(jikanApi);
