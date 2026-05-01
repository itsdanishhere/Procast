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
    const session = await timerService.complete(request.auth!.userId, String(request.params.sessionId));
    response.json({ session });
  });

  abandon = asyncHandler(async (request, response) => {
    const session = await timerService.abandon(request.auth!.userId, String(request.params.sessionId), request.body.reason);
    response.json({ session });
  });
}

export const timerController = new TimerController();
