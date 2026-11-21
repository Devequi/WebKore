import { criteriaFor, PROFILE_VERSION, validateTypedCriteria } from "../../../shared/evaluations.js";
import { Router } from "express";
import { randomBytes, randomUUID } from "node:crypto";

import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";
import { coachIdentitySelect, teamRelations, visibleTeams } from "../auth/access.js";
import { normalizeStatus, toClientMembership, toClientTeam } from "../lib/serializers.js";
import { criteriaError, defaultQualitativeCriteria, getTeamCriteria, metricCatalog, normalizeModality } from "../../../shared/criteria.js";
import { membershipPatch, normalizeTeamCode } from "../../../shared/contracts.js";
import { date as validateUpdatedAt, HttpError, sendError, text, validateParam } from "../lib/validation.js";

export const teamsRouter = Router();

teamsRouter.use(requireAuth);
teamsRouter.param("teamId", validateParam);
teamsRouter.param("athleteId", validateParam);

teamsRouter.get("/", async (request, response) => {
  try {
    if (request.query.code !== undefined) {
      const code = normalizeTeamCode(text(request.query.code, "Código"));
      const team = await prisma.team.findUnique({ where: {
        code, ...(request.user.role === "COACH" ? { coachId: request.user.id } : {})
      }, select: {
        id: true, name: true, modality: true, code: true, coachId: true, coach: { select: coachIdentitySelect }
      } });
      return response.json(team ? [{ ...team, modality: normalizeModality(team.modality) || team.modality,
        coach: { id: team.coach.id, name: team.coach.name } }] : []);
    }
    const teams = await prisma.team.findMany({
      where: visibleTeams(request.user),
      include: teamRelations(request.user),
      orderBy: {
        createdAt: "desc"
      }
    });

    return response.json(teams.map((team) => toClientTeam(team, request.user)));
  } catch (error) {
    return sendError(response, error, "Erro ao buscar equipes.");
  }
});

teamsRouter.post("/", async (request, response) => {
  try {
    const { modality: rawModality, name } = request.body;
    const modality = normalizeModality(rawModality);

    if (request.user.role !== "COACH") {
      return response.status(403).json({
        message: "Apenas treinadores podem criar equipes."
      });
    }

    if (!modality || !name) {
      return response.status(400).json({
        message: "Informe nome e modalidade da equipe."
      });
    }
    const normalizedName = text(name, "Nome da equipe");
    const code = `WK-TEAM-${randomBytes(8).toString("hex").toUpperCase()}`;

    const teamId = randomUUID();
    const team = await prisma.team.create({
      data: {
        id: teamId,
        name: normalizedName,
        modality,
        code,
        coachId: request.user.id,
        objectiveCriteria: metricCatalog[modality] || metricCatalog.Futsal,
        qualitativeCriteria: defaultQualitativeCriteria,
        ...(modality === "Futsal" ? { evaluationProfiles: { create: ["GOALKEEPER", "OUTFIELD"].map((role) => ({
          modality, role, schemaVersion: PROFILE_VERSION, criteria: { create: ["QUALITATIVE", "QUANTITATIVE"].flatMap((kind) => criteriaFor({ id: teamId, modality }, role, kind)) }
        })) } } : {})
      }
    });

    const teamWithRelations = await prisma.team.findUnique({
      where: { id: team.id },
      include: teamRelations(request.user)
    });

    return response.status(201).json(toClientTeam(teamWithRelations));
  } catch (error) {
    return sendError(response, error, "Erro ao criar equipe.");
  }
});

teamsRouter.post("/join", async (request, response) => {
  try {
    const { code } = request.body;

    if (request.user.role !== "ATHLETE") {
      return response.status(403).json({
        message: "Apenas atletas podem solicitar entrada."
      });
    }

    if (!code) {
      return response.status(400).json({
        message: "Informe o codigo da equipe."
      });
    }
    text(code, "Código");

    const team = await prisma.team.findUnique({
      where: {
        code: normalizeTeamCode(code)
      }
    });

    if (!team) {
      return response.status(404).json({
        message: "Equipe nao encontrada."
      });
    }

    await prisma.membership.updateMany({
      where: { teamId: team.id, athleteId: request.user.id, status: "REJECTED" },
      data: { status: "PENDING" }
    });
    const membership = await prisma.membership.upsert({
      where: {
        teamId_athleteId: {
          teamId: team.id,
          athleteId: request.user.id
        }
      },

      update: {},

      create: {
        teamId: team.id,
        athleteId: request.user.id,
        status: "PENDING"
      }
    });

    return response.status(201).json(toClientMembership(membership));
  } catch (error) {
    return sendError(response, error, "Erro ao solicitar entrada na equipe.");
  }
});

teamsRouter.patch(
  "/:teamId/requests/:athleteId",
  async (request, response) => {
    try {
      const { athleteId, teamId } = request.params;
      const { status } = request.body;

      if (request.user.role !== "COACH") {
        return response.status(403).json({
          message: "Apenas treinadores podem responder solicitacoes."
        });
      }

      const allowedStatuses = [
        "PENDING",
        "APPROVED",
        "REJECTED"
      ];

      const normalizedStatus = normalizeStatus(status);

      if (!allowedStatuses.includes(normalizedStatus)) {
        return response.status(400).json({
          message: "Status invalido."
        });
      }

      // Garante que o treinador seja dono da equipe.
      const team = await prisma.team.findFirst({
        where: {
          id: teamId,
          coachId: request.user.id
        }
      });

      if (!team) {
        return response.status(404).json({
          message: "Equipe nao encontrada."
        });
      }

      const existingMembership =
        await prisma.membership.findUnique({
          where: {
            teamId_athleteId: {
              teamId,
              athleteId
            }
          }
        });

      if (!existingMembership) {
        return response.status(404).json({
          message: "Solicitacao nao encontrada."
        });
      }

      const membership = await prisma.membership.update({
        where: {
          teamId_athleteId: {
            teamId,
            athleteId
          },
          team: { coachId: request.user.id }
        },

        data: {
          status: normalizedStatus
        }
      });

      return response.json(toClientMembership(membership));
    } catch (error) {
      return sendError(response, error, "Erro ao atualizar solicitacao.");
    }
  }
);

teamsRouter.patch("/:teamId", async (request, response) => {
  try {
    const { teamId } = request.params;
    const { modality: rawModality, name, objectiveCriteria, qualitativeCriteria, evaluationProfiles, expectedUpdatedAt } = request.body;
    const modality = rawModality === undefined ? undefined : normalizeModality(rawModality);

    if (request.user.role !== "COACH") {
      return response.status(403).json({ message: "Apenas treinadores podem editar equipes." });
    }

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        coachId: request.user.id
      }
    });

    if (!team) {
      return response.status(404).json({ message: "Equipe nao encontrada." });
    }

    let profiles;
    if (evaluationProfiles !== undefined) {
      try {
        if (!Array.isArray(evaluationProfiles) || evaluationProfiles.length !== 2 ||
            new Set(evaluationProfiles.map((profile) => profile?.role)).size !== 2 ||
            evaluationProfiles.some((profile) => profile?.modality !== "Futsal" || !["GOALKEEPER", "OUTFIELD"].includes(profile.role)) ||
            (modality || normalizeModality(team.modality)) !== "Futsal") throw new Error("Informe os dois perfis: Jogadores de Linha e Goleiros.");
        profiles = evaluationProfiles.map((profile) => ({ role: profile.role, criteria: validateTypedCriteria(profile.criteria) }));
        const ids = profiles.flatMap((profile) => profile.criteria.map((item) => item.id));
        if (new Set(ids).size !== ids.length) throw new Error("Cada critério deve ter um identificador exclusivo.");
      } catch (error) { throw new HttpError(400, error.message); }
    }
    const data = {};
    if (name !== undefined && (typeof name !== "string" || !name.trim())) return response.status(400).json({ message: "Informe o nome da equipe." });
    if (modality !== undefined && (typeof modality !== "string" || !modality.trim())) return response.status(400).json({ message: "Informe a modalidade da equipe." });
    for (const [kind, value] of [["objective", objectiveCriteria], ["qualitative", qualitativeCriteria]]) {
      if (value !== undefined) {
        const error = criteriaError(value, kind);
        if (error) return response.status(400).json({ message: error });
      }
    }
    if (name !== undefined) data.name = text(name, "Nome da equipe");
    if (modality !== undefined) data.modality = modality;
    if (objectiveCriteria !== undefined) data.objectiveCriteria = objectiveCriteria;
    if (qualitativeCriteria !== undefined) data.qualitativeCriteria = qualitativeCriteria;

    const updated = await prisma.$transaction(async (transaction) => {
      // Detecta duas alterações de critérios baseadas na mesma versão da equipe.
      // O update condicional adquire o bloqueio antes de renomear métricas.
      const changed = await transaction.team.updateMany({
        where: { id: teamId, coachId: request.user.id, updatedAt: expectedUpdatedAt === undefined
          ? team.updatedAt : validateUpdatedAt(expectedUpdatedAt) },
        data: { ...data, updatedAt: new Date(Math.max(Date.now(), team.updatedAt.getTime() + 1)) }
      });
      if (!changed.count) throw new HttpError(409, "A equipe foi alterada em outra operação. Atualize o painel e tente novamente.");
      if (qualitativeCriteria && qualitativeCriteria.length < Math.min(getTeamCriteria(team, "qualitative").length, 4) &&
        await transaction.training.count({ where: { teamId } })) {
        throw new HttpError(409, "Um critério qualitativo usado em treinos não pode ser removido. Renomeie-o para preservar as notas.");
      }
      const previous = getTeamCriteria(team, "objective");
      if (objectiveCriteria && objectiveCriteria.length === previous.length) {
        for (const [index, nextName] of objectiveCriteria.entries()) {
          const previousName = previous[index];
          if (previousName !== nextName) {
            await transaction.sportMetric.updateMany({
              where: { name: previousName, record: { training: { teamId } } },
              data: { name: nextName }
            });
          }
        }
      }
      for (const profile of profiles || []) {
        const existingProfile = await transaction.evaluationProfile.findUnique({
          where: { teamId_modality_role: { teamId, modality: "Futsal", role: profile.role } }, include: { criteria: true }
        });
        const used = await transaction.profileCriterion.findMany({ where: { id: { in: profile.criteria.map((item) => item.id) } }, include: { profile: true } });
        if (used.some((item) => item.profile.teamId !== teamId || item.profile.role !== profile.role || item.profile.modality !== "Futsal" || item.kind !== profile.criteria.find((criterion) => criterion.id === item.id)?.kind)) {
          throw new HttpError(400, "Um critério não pode ser transferido de perfil, equipe ou tipo.");
        }
        const saved = await transaction.evaluationProfile.upsert({
          where: { teamId_modality_role: { teamId, modality: "Futsal", role: profile.role } },
          create: { teamId, modality: "Futsal", role: profile.role, schemaVersion: PROFILE_VERSION },
          update: { schemaVersion: PROFILE_VERSION, ...(existingProfile?.schemaVersion === 1 ? { legacyCriteria: existingProfile.criteria } : {}) }
        });
        // Soft removal keeps each ID tied to its original profile and type.
        await transaction.profileCriterion.updateMany({ where: { profileId: saved.id, id: { notIn: profile.criteria.map((item) => item.id) } }, data: { archived: true } });
        for (const item of profile.criteria) {
          if (used.some((previous) => previous.id === item.id)) {
            await transaction.profileCriterion.update({ where: { id: item.id }, data: { name: item.name, order: item.order, weight: item.weight, archived: false } });
          } else {
            // A concurrent attempt to reuse this ID in another team must conflict, never update its row.
            await transaction.profileCriterion.create({ data: { ...item, profileId: saved.id } });
          }
        }
      }
      return transaction.team.findUnique({ where: { id: teamId }, include: teamRelations(request.user) });
    });

    return response.json(toClientTeam(updated));
  } catch (error) {
    if (error.code === "P2002") return response.status(409).json({ message: "O nome do critério já existe no histórico. Nenhuma alteração foi aplicada." });
    return sendError(response, error, "Erro ao atualizar equipe.");
  }
});

teamsRouter.delete("/:teamId", async (request, response) => {
  try {
    const { teamId } = request.params;

    if (request.user.role !== "COACH") {
      return response.status(403).json({ message: "Apenas treinadores podem excluir equipes." });
    }

    const { count } = await prisma.team.deleteMany({
      where: {
        id: teamId,
        coachId: request.user.id
      }
    });

    if (!count) {
      return response.status(404).json({ message: "Equipe nao encontrada." });
    }

    return response.status(204).send();
  } catch (error) {
    return sendError(response, error, "Erro ao excluir equipe.");
  }
});

teamsRouter.patch("/:teamId/athletes/:athleteId", async (request, response) => {
  try {
    const { athleteId, teamId } = request.params;
    if (request.user.role !== "COACH") {
      return response.status(403).json({ message: "Apenas treinadores podem editar dados do vínculo." });
    }

    const team = await prisma.team.findFirst({ where: { id: teamId, coachId: request.user.id }, select: { modality: true } });
    if (!team) throw new HttpError(404, "Equipe nao encontrada.");
    let data;
    try { data = membershipPatch(request.body, team.modality); }
    catch (error) { throw new HttpError(400, error.message); }

    const membership = await prisma.membership.update({
      where: {
        teamId_athleteId: {
          teamId,
          athleteId
        },
        team: { coachId: request.user.id }
      },
      data
    });

    return response.json(toClientMembership(membership));
  } catch (error) {
    return sendError(response, error, "Erro ao atualizar atleta.");
  }
});

teamsRouter.delete("/:teamId/athletes/:athleteId", async (request, response) => {
  try {
    const { athleteId, teamId } = request.params;

    if (request.user.role === "ATHLETE" && request.user.id !== athleteId) {
      return response.status(403).json({ message: "Voce nao tem permissao para remover este vinculo." });
    }

    const { count } = await prisma.membership.deleteMany({
      where: {
        teamId,
        athleteId,
        ...(request.user.role === "COACH" ? { team: { coachId: request.user.id } } : {})
      }
    });
    if (!count) throw new HttpError(404, "Vínculo não encontrado.");

    return response.status(204).send();
  } catch (error) {
    return sendError(response, error, "Erro ao remover atleta.");
  }
});
