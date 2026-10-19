import { Router } from "express";
import { randomBytes } from "node:crypto";

import { requireAuth } from "../intermediario/autenticacao.js";
import { prisma } from "../lib/prisma.js";
import { coachIdentitySelect, teamRelations, visibleTeams } from "../lib/acesso.js";
import { normalizeStatus, toClientMembership, toClientTeam } from "../lib/serializadores.js";
import { criteriaError, defaultQualitativeCriteria, getTeamCriteria, metricCatalog, normalizeModality } from "../../../shared/criteria.js";
import { membershipPatch, normalizeTeamCode } from "../../../shared/contracts.js";
import { date as validateUpdatedAt, HttpError, sendError, text, validateParam } from "../lib/validacao.js";

export const teamsRouter = Router();

teamsRouter.use(requireAuth);
teamsRouter.param("teamId", validateParam);
teamsRouter.param("athleteId", validateParam);

teamsRouter.get("/", async (request, response) => {
  try {
    if (request.query.code !== undefined) {
      const code = normalizeTeamCode(text(request.query.code, "Código"));
      const team = await prisma.team.findUnique({ where: { code }, select: {
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

    return response.json(teams.map(toClientTeam));
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

    const team = await prisma.team.create({
      data: {
        name: normalizedName,
        modality,
        code,
        coachId: request.user.id,
        objectiveCriteria: metricCatalog[modality] || metricCatalog.Futsal,
        qualitativeCriteria: defaultQualitativeCriteria
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
          }
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
    const { modality: rawModality, name, objectiveCriteria, qualitativeCriteria, expectedUpdatedAt } = request.body;
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

    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        coachId: request.user.id
      }
    });

    if (!team) {
      return response.status(404).json({ message: "Equipe nao encontrada." });
    }

    await prisma.team.delete({
      where: { id: teamId }
    });

    return response.status(204).send();
  } catch (error) {
    return sendError(response, error, "Erro ao excluir equipe.");
  }
});

teamsRouter.patch("/:teamId/athletes/:athleteId", async (request, response) => {
  try {
    const { athleteId, teamId } = request.params;
    let data;
    try { data = membershipPatch(request.body); }
    catch (error) { throw new HttpError(400, error.message); }

    const canEdit =
      request.user.role === "ATHLETE"
        ? request.user.id === athleteId
        : Boolean(
            await prisma.team.findFirst({
              where: {
                id: teamId,
                coachId: request.user.id
              }
            })
          );

    if (!canEdit) {
      return response.status(403).json({ message: "Voce nao tem permissao para editar este atleta." });
    }

    const membership = await prisma.membership.update({
      where: {
        teamId_athleteId: {
          teamId,
          athleteId
        }
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

    const canRemove =
      request.user.role === "ATHLETE"
        ? request.user.id === athleteId
        : Boolean(
            await prisma.team.findFirst({
              where: {
                id: teamId,
                coachId: request.user.id
              }
            })
          );

    if (!canRemove) {
      return response.status(403).json({ message: "Voce nao tem permissao para remover este vinculo." });
    }

    await prisma.membership.delete({
      where: {
        teamId_athleteId: {
          teamId,
          athleteId
        }
      }
    });

    return response.status(204).send();
  } catch (error) {
    return sendError(response, error, "Erro ao remover atleta.");
  }
});
