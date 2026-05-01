import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

import { authService } from "../auth/auth.service";
import { timerService } from "../timer-system/timer.service";
import { logger } from "../../shared/logger";

const clientsByUser = new Map<string, Set<WebSocket>>();

export function broadcastToUser(userId: string, payload: unknown) {
  const clients = clientsByUser.get(userId);
  if (!clients) return;
  const message = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, request) => {
    const url = new URL(request.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    const auth = token ? authService.verifyAccessToken(token) : null;
    if (!auth) {
      socket.close(1008, "Unauthorized");
      return;
    }

    const clients = clientsByUser.get(auth.userId) ?? new Set<WebSocket>();
    clients.add(socket);
    clientsByUser.set(auth.userId, clients);

    socket.on("message", async (raw) => {
      try {
        const message = JSON.parse(String(raw));
        if (message.type === "timer:sync") {
          const session = await timerService.active(auth.userId);
          socket.send(JSON.stringify({ type: "timer:state", session }));
        }
      } catch (error) {
        logger.warn({ error }, "Invalid websocket message");
      }
    });

    socket.on("close", () => {
      clients.delete(socket);
      if (clients.size === 0) clientsByUser.delete(auth.userId);
    });

    socket.send(JSON.stringify({ type: "connected", userId: auth.userId }));
  });

  return wss;
}
