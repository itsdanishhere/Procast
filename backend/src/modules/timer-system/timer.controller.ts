import { asyncHandler } from "../../shared/http/async-handler";
import { timerService } from "./timer.service";

export class TimerController {
  start = asyncHandler(async (request, response) => {
    const session = await timerService.start({ userId: request.auth!.userId, ...request.body });
    response.status(201).json({ session });
  });

  active = asyncHandler(async (request, response) => {
    const session = await timerService.active(request.auth!.userId);
    response.json({ session });
  });

  list = asyncHandler(async (request, response) => {
    const limit = Number(request.query.limit ?? 25);
    const sessions = await timerService.list(request.auth!.userId, Number.isFinite(limit) ? limit : 25);
    response.json({ sessions });
  });

  pause = asyncHandler(async (request, response) => {
    const session = await timerService.pause(request.auth!.userId, String(request.params.sessionId));
    response.json({ session });
  });

  resume = asyncHandler(async (request, response) => {
    const session = await timerService.resume(request.auth!.userId, String(request.params.sessionId));
    response.json({ session });
  });

  heartbeat = asyncHandler(async (request, response) => {
    const session = await timerService.heartbeat(request.auth!.userId, String(request.params.sessionId), request.body);
    response.json({ session });
  });

  complete = asyncHandler(async (request, response) => {
    const result = await timerService.complete(request.auth!.userId, String(request.params.sessionId));
    response.json(result);
  });

  abandon = asyncHandler(async (request, response) => {
    const session = await timerService.abandon(request.auth!.userId, String(request.params.sessionId), request.body);
    response.json({ session });
  });
}

export const timerController = new TimerController();
