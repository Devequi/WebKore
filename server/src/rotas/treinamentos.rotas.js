import { Router } from "express";

import { requireAuth } from "../intermediario/autenticacao.js";
import { prisma } from "../lib/prisma.js";
import { visibleRecords } from "../lib/acesso.js";
import { evaluationDataFromRatings, normalizeTrainingType, toClientTraining } from "../lib/serializadores.js";
import { date as validateDate, HttpError, id, sendError, text, validateMetrics, validateNotes, validateParam, validatePresence } from "../lib/validacao.js";

export const trainingsRouter = Router();

trainingsRouter.use(requireAuth);
for (const name of ["teamId", "trainingId", "athleteId"]) trainingsRouter.param(name, validateParam);

function metricsToCreate(metrics) {
  if (Array.isArray(metrics)) {
    return metrics.map((metric) => ({
      name: metric.name,
      value: Number(metric.value) || 0
    }));
  }

  return Object.entries(metrics || {}).map(([name, value]) => ({
    name,
    value: Number(value) || 0
  }));
}

trainingsRouter.get("/team/:teamId", async (request, response) => {
  try {
    const { teamId } = request.params;

    const team = await prisma.team.findFirst({
      where:
        request.user.role === "COACH"
          ? {
              id: teamId,
              coachId: request.user.id
            }
          : {
              id: teamId,
              memberships: {
                some: {
                  athleteId: request.user.id,
                  status: "APPROVED"
                }
              }
            }
    });

    if (!team) {
      return response.status(404).json({ message: "Equipe nao encontrada." });
    }

    const trainings = await prisma.training.findMany({
      where: {
        teamId,
        ...(request.user.role === "ATHLETE" ? { records: { some: { athleteId: request.user.id } } } : {})
      },

      include: {
        records: visibleRecords(request.user)
      },

      orderBy: {
        date: "desc"
      }
    });

    return response.json(trainings.map((training) => toClientTraining(training, team)));
  } catch (error) {
    return sendError(response, error, "Erro ao buscar treinos.");
  }
});

trainingsRouter.post("/", async (request, response) => {
  try {
    const {
      date,
      description,
      records = [],
      teamId,
      type
    } = request.body;

    if (request.user.role !== "COACH") {
      return response.status(403).json({
        message: "Apenas treinadores podem criar treinos."
      });
    }

    if (!date || !teamId || !type) {
      return response.status(400).json({
        message: "Informe data, equipe e tipo do treino."
      });
    }
    id(teamId);
    const parsedDate = validateDate(date);
    if (description !== undefined && description !== null) text(description, "Descrição", { empty: true });
    if (!Array.isArray(records)) throw new HttpError(400, "Registros de treino inválidos.");
    const athleteIds = [];
    for (const record of records) {
      if (!record || typeof record !== "object" || Array.isArray(record)) throw new HttpError(400, "Registro inválido.");
      athleteIds.push(id(record.athleteId));
      validatePresence(record.present);
      if (record.ratings !== undefined) validateNotes(record.ratings);
      if (record.evaluation !== undefined) validateNotes(record.evaluation, ["technique", "physicalCondition", "participation", "teamwork"]);
      if (record.metrics !== undefined) validateMetrics(record.metrics);
    }
    if (new Set(athleteIds).size !== athleteIds.length) throw new HttpError(400, "Atleta repetido no treino.");

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

    if (athleteIds.length && await prisma.membership.count({ where: { teamId, status: "APPROVED",
      athleteId: { in: athleteIds }, athlete: { role: "ATHLETE" } } }) !== athleteIds.length) {
      throw new HttpError(404, "Atleta aprovado não encontrado nesta equipe.");
    }

    const normalizedType = normalizeTrainingType(type);

    if (!normalizedType) {
      return response.status(400).json({
        message: "Tipo de treino invalido."
      });
    }

    const training = await prisma.training.create({
      data: {
        teamId,
        date: parsedDate,
        type: normalizedType,
        description: description || "",

        records: {
          create: records.map((record) => ({
            athleteId: record.athleteId,
            present: record.present ?? true,

            ...(record.evaluation || record.ratings
              ? {
                  evaluation: {
                    create: record.evaluation || evaluationDataFromRatings(record.ratings, team)
                  }
                }
              : {}),

            metrics: {
              create: metricsToCreate(record.metrics)
            }
          }))
        }
      },

      include: {
        records: {
          include: {
            evaluation: true,
            metrics: true
          }
        }
      }
    });

    return response.status(201).json(toClientTraining(training, team));
  } catch (error) {
    return sendError(response, error, "Erro ao criar treino.");
  }
});

trainingsRouter.patch("/:trainingId/athletes/:athleteId", async (request, response) => {
  try {
    const { athleteId, trainingId } = request.params;
    const { metrics, present, ratings } = request.body;
    validatePresence(present);
    if (ratings !== undefined) validateNotes(ratings);
    if (Array.isArray(metrics)) throw new HttpError(400, "Envie métricas por nome para atualizar o treino.");
    if (metrics !== undefined) validateMetrics(metrics);

    if (request.user.role !== "COACH") {
      return response.status(403).json({ message: "Apenas treinadores podem editar treinos." });
    }

    const training = await prisma.training.findFirst({
      where: {
        id: trainingId,
        team: {
          coachId: request.user.id
        }
      },
      include: {
        team: true
      }
    });

    if (!training) {
      return response.status(404).json({ message: "Treino nao encontrado." });
    }

    const evaluationData = ratings ? evaluationDataFromRatings(ratings, training.team, false) : null;
    const record = await prisma.trainingRecord.update({
      where: {
        trainingId_athleteId: {
          trainingId,
          athleteId
        }
      },
      data: {
        ...(present !== undefined ? { present: Boolean(present) } : {}),
        ...(ratings
          ? {
              evaluation: {
                upsert: {
                  create: { ...evaluationDataFromRatings({}, training.team), ...evaluationData },
                  update: evaluationData
                }
              }
            }
          : {}),
      },
      include: {
        evaluation: true,
        metrics: true
      }
    });

    if (metrics) {
      await Promise.all(
        Object.entries(metrics).map(([name, value]) =>
          prisma.sportMetric.upsert({
            where: {
              recordId_name: {
                recordId: record.id,
                name
              }
            },
            create: {
              recordId: record.id,
              name,
              value: Number(value) || 0
            },
            update: {
              value: Number(value) || 0
            }
          })
        )
      );
    }

    const updatedTraining = await prisma.training.findUnique({
      where: { id: trainingId },
      include: {
        records: {
          include: {
            evaluation: true,
            metrics: true
          }
        }
      }
    });

    return response.json(toClientTraining(updatedTraining, training.team));
  } catch (error) {
    return sendError(response, error, "Erro ao atualizar treino.");
  }
});

trainingsRouter.delete("/:trainingId", async (request, response) => {
  try {
    const { trainingId } = request.params;

    if (request.user.role !== "COACH") {
      return response.status(403).json({ message: "Apenas treinadores podem excluir treinos." });
    }

    const training = await prisma.training.findFirst({
      where: {
        id: trainingId,
        team: {
          coachId: request.user.id
        }
      }
    });

    if (!training) {
      return response.status(404).json({ message: "Treino nao encontrado." });
    }

    await prisma.training.delete({
      where: { id: trainingId }
    });

    return response.status(204).send();
  } catch (error) {
    return sendError(response, error, "Erro ao excluir treino.");
  }
});
