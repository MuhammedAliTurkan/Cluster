// src/services/callApi.js
import { publishApp } from "./ws";

const startDest = import.meta?.env?.VITE_WS_CALLS_START_DEST || "/app/call.invite";
const respondDest = import.meta?.env?.VITE_WS_CALLS_RESP_DEST || "/app/call.response";

export function startDMCall({ channelId, mode = "VIDEO" }) {
  if (!channelId) throw new Error("channelId required");
  publishApp(startDest, { channelId, mode });
}

export function respondCall({ channelId, type }) {
  if (!channelId) throw new Error("channelId required");
  publishApp(respondDest, { channelId, type });
}

export const callApi = { startDMCall, respondCall };
