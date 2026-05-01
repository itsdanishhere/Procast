import { asyncHandler } from "../../shared/http/async-handler";
import { reflectionService } from "./reflection.service";

export class ReflectionController {
  list = asyncHandler(async (request, response) => {
    response.json({ reflections: await reflectionService.list(request.auth!.userId) });
  });

  create = asyncHandler(async (request, response) => {
    const reflection = await reflectionService.create(request.auth!.userId, request.body);
    response.status(201).json({ reflection });
  });
}

export const reflectionController = new ReflectionController();
