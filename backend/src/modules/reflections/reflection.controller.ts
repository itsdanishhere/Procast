import { asyncHandler } from "../../shared/http/async-handler";
import { reflectionService } from "./reflection.service";

export class ReflectionController {
  list = asyncHandler(async (request, response) => {
    const includeDeleted = request.query.deleted === "true";
    response.json({
      reflections: includeDeleted
        ? await reflectionService.listDeleted(request.auth!.userId)
        : await reflectionService.list(request.auth!.userId)
    });
  });

  create = asyncHandler(async (request, response) => {
    const reflection = await reflectionService.create(request.auth!.userId, request.body);
    response.status(201).json({ reflection });
  });

  softDelete = asyncHandler(async (request, response) => {
    const reflection = await reflectionService.softDelete(request.auth!.userId, String(request.params.reflectionId));
    response.json({ reflection });
  });

  restore = asyncHandler(async (request, response) => {
    const reflection = await reflectionService.restore(request.auth!.userId, String(request.params.reflectionId));
    response.json({ reflection });
  });

  permanentlyDelete = asyncHandler(async (request, response) => {
    const result = await reflectionService.permanentlyDelete(request.auth!.userId, String(request.params.reflectionId));
    response.json(result);
  });
}

export const reflectionController = new ReflectionController();
