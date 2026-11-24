import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";
import { profileInclude } from "../auth/access.js";
import { HttpError, validateParam } from "../lib/validation.js";
import { evaluationRole } from "../../../shared/evaluations.js";
import { configuredMetrics, validGoal } from "../../../shared/personalGoals.js";

export const goalsRouter = Router();
goalsRouter.use(requireAuth);
goalsRouter.param("teamId", validateParam);
goalsRouter.param("goalId", validateParam);
async function save(request, response, next) {
  try {
    if (request.user.role !== "ATHLETE") throw new HttpError(403, "Ação exclusiva do atleta.");
    const { teamId, goalId } = request.params;
    const payload = request.body;
    const archive = goalId && payload.archived === true;
    const fields = archive ? ["archived"] : ["metric", "target", "deadline", "direction"];
    if (Object.keys(payload).some(key => !fields.includes(key))) throw new HttpError(400, "Campos de meta inválidos.");
    await prisma.$transaction(async tx => {
      const membership = await tx.membership.findFirst({ where: { teamId, athleteId: request.user.id, status: "APPROVED" },
        include: { team: { include: profileInclude } } });
      if (!membership) throw new HttpError(404, "Equipe não encontrada.");
      const scope = { id: goalId, membershipId: membership.id, archived: false };
      if (goalId && !await tx.personalGoal.findFirst({ where: scope })) throw new HttpError(404, "Meta não encontrada.");
      let data = { archived: true };
      if (!archive) {
        const metric = configuredMetrics(membership.team, membership.position).find(item => item.id === payload.metric);
        if (!metric || !validGoal(payload.target, payload.direction, payload.deadline ?? null, metric.unit)) throw new HttpError(400, "Confira o critério, o alvo e o prazo da meta.");
        data = { metric: metric.id, label: metric.label, unit: metric.unit, target: payload.target, direction: payload.direction,
          deadline: payload.deadline ?? null, profile: evaluationRole(membership.team.modality, membership.position) || "TEAM" };
      }
      if (goalId) {
        const result = await tx.personalGoal.updateMany({ where: scope, data });
        if (!result.count) throw new HttpError(404, "Meta não encontrada.");
      } else await tx.personalGoal.create({ data: { ...data, membershipId: membership.id } });
    });
    response.sendStatus(204);
  } catch (error) { next(error); }
}
goalsRouter.post("/:teamId", save);
goalsRouter.patch("/:teamId/:goalId", save);
