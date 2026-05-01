import { asyncHandler } from "../../shared/http/async-handler";
import { taskService } from "./task.service";

export class TaskController {
  list = asyncHandler(async (request, response) => {
    response.json({ tasks: await taskService.list(request.auth!.userId) });
  });

  create = asyncHandler(async (request, response) => {
    const task = await taskService.create(request.auth!.userId, request.body);
    response.status(201).json({ task });
  });

  update = asyncHandler(async (request, response) => {
    const task = await taskService.update(request.auth!.userId, String(request.params.taskId), request.body);
    response.json({ task });
  });
}

export const taskController = new TaskController();
