import { goalkeeperFields as goalkeeperStatsFields } from "../../../shared/evaluations.js";
import { prepareEvaluation, prepareMeasurements, prepareStats, recordContext } from "../domain/evaluations.js";
import { profileInclude, recordInclude, trainingTeamScope, visibleRecords, visibleTrainings } from "../auth/access.js";
import { fromStoredMetric, toStoredMetric } from "../domain/metrics.js";
import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";
import { normalizeTrainingType, toClientTraining } from "../lib/serializers.js";
import { date as validateDate, HttpError, id, sendError, text, validateMetrics, validateNotes, validateParam, validatePresence } from "../lib/validation.js";

export const trainingsRouter = Router();

trainingsRouter.use(requireAuth);
for (const name of ["teamId", "trainingId", "athleteId"]) trainingsRouter.param(name, validateParam);

trainingsRouter.get("/team/:teamId", async (request, response) => {
  try {
    const { teamId } = request.params;

    const team = await prisma.team.findFirst({
      where: { id: teamId, ...trainingTeamScope(request.user) }
    });

    if (!team) {
      return response.status(404).json({ message: "Equipe nao encontrada." });
    }

    const trainings = await prisma.training.findMany({
      where: { teamId, ...visibleTrainings(request.user) },

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

      if (record.evaluation !== undefined) validateNotes(record.evaluation, ["technique", "physicalCondition", "participation", "teamwork"]);
    }
    if (new Set(athleteIds).size !== athleteIds.length) throw new HttpError(400, "Atleta repetido no treino.");

    const training = await prisma.$transaction(async (transaction) => {
      const team = await transaction.team.findFirst({ where: { id: teamId, coachId: request.user.id }, include: profileInclude });
      if (!team) throw new HttpError(404, "Equipe não encontrada.");
      const memberships = await transaction.membership.findMany({ where: { teamId, status: "APPROVED", athleteId: { in: athleteIds }, athlete: { role: "ATHLETE" } } });
      if (memberships.length !== athleteIds.length) throw new HttpError(404, "Atleta aprovado não encontrado nesta equipe.");
      const normalizedType = normalizeTrainingType(type);
      if (!normalizedType) throw new HttpError(400, "Tipo de treino inválido.");
      const created = await transaction.training.create({
        data: { teamId, date: parsedDate, type: normalizedType, description: description || "",
          records: { create: records.map((record) => {
            const metrics = record.metrics === undefined ? undefined : validateMetrics(record.metrics);
            const context = recordContext(team, memberships.find((item) => item.athleteId === record.athleteId));
            if (context.modalitySnapshot === "Futsal" && record.evaluation) throw new HttpError(400, "Envie as notas por critério para avaliar futsal.");
            if (record.present === false && (record.ratings !== undefined || record.evaluation !== undefined)) throw new HttpError(400, "Atletas ausentes não podem receber uma nova avaliação.");
            const evaluation = record.ratings !== undefined ? prepareEvaluation(context, team, record.ratings) : record.evaluation;
            const stats = record.goalkeeperStats === undefined ? null : prepareStats(context, record.goalkeeperStats);
            const futsal = context.modalitySnapshot === "Futsal";
            if (record.measurements !== undefined && !futsal) throw new HttpError(400, "Medidas por perfil são exclusivas do futsal.");
            const hasMeasurements = record.measurements !== undefined || futsal && (record.metrics !== undefined || evaluation);
            if (record.present === false && hasMeasurements) throw new HttpError(400, "Atletas ausentes não podem receber medidas.");
            const measurements = hasMeasurements ? prepareMeasurements(context, team, record.measurements === undefined ? {} : record.measurements,
              metrics && Object.fromEntries(metrics)) : null;
            return { athleteId: record.athleteId, present: record.present ?? true, ...context,
              ...(measurements ? { measurementsInitialized: true, measurements: { create: measurements } } : {}),
              ...(evaluation ? { evaluation: { create: evaluation } } : {}),
              ...(stats ? { goalkeeperStats: { create: stats } } : {}),
              ...(!futsal && metrics?.length ? { metrics: { create: metrics.map(([name, value]) => ({ name, value: toStoredMetric(value) })) } } : {}) };
          }) }
        }, include: { records: { include: recordInclude } }
      });
      return toClientTraining(created, team);
    }, { isolationLevel: "Serializable" });

    return response.status(201).json(training);
  } catch (error) {
    return sendError(response, error, "Erro ao criar treino.");
  }
});

trainingsRouter.patch("/:trainingId/athletes/:athleteId", async (request, response) => {
  try {
    if (request.user.role !== "COACH") throw new HttpError(403, "Apenas treinadores podem editar treinos.");
    const { athleteId, trainingId } = request.params;
    const { metrics, present, ratings, expectedMetrics, goalkeeperStats, measurements } = request.body;
    validatePresence(present);

    if (Array.isArray(metrics) || Array.isArray(expectedMetrics)) throw new HttpError(400, "Envie métricas por nome para atualizar o treino.");
    if (metrics !== undefined) validateMetrics(metrics);
    if (expectedMetrics !== undefined) validateMetrics(expectedMetrics);

    const updated = await prisma.$transaction(async (transaction) => {
      const training = await transaction.training.findFirst({
        where: { id: trainingId, team: { coachId: request.user.id } }, include: { team: { include: profileInclude } }
      });
      if (!training) throw new HttpError(404, "Treino não encontrado.");
      const existing = await transaction.trainingRecord.findUnique({
        where: { trainingId_athleteId: { trainingId, athleteId } }, include: recordInclude
      });
      if (!existing) throw new HttpError(404, "Registro não encontrado.");
      if (!existing.evaluation && existing.modalitySnapshot === "Futsal" && !existing.roleSnapshot && (ratings !== undefined || goalkeeperStats !== undefined || measurements !== undefined)) {
        const membership = await transaction.membership.findFirst({ where: { teamId: training.teamId, athleteId, status: "APPROVED" } });
        const context = recordContext({ modality: existing.modalitySnapshot }, membership);
        existing.positionSnapshot = context.positionSnapshot;
        existing.roleSnapshot = context.roleSnapshot;
        await transaction.trainingRecord.update({ where: { id: existing.id }, data: { positionSnapshot: context.positionSnapshot, roleSnapshot: context.roleSnapshot } });
      }
      // Existing records without a snapshot remain legacy. New records retain their original position.
      if (ratings !== undefined && (present ?? existing.present) === false) throw new HttpError(400, "Atletas ausentes não podem ser avaliados.");
      const evaluationData = ratings === undefined ? null : prepareEvaluation(existing, training.team, ratings, existing.evaluation);
      if (evaluationData?.criteria && existing.evaluation) {
        await transaction.evaluationCriterion.deleteMany({ where: { evaluationId: existing.evaluation.id } });
      }
      const stats = goalkeeperStats === undefined ? null : prepareStats(existing, goalkeeperStats,
        existing.goalkeeperStats ? Object.fromEntries(Object.keys(goalkeeperStatsFields).map((key) => [key, existing.goalkeeperStats[key]])) : undefined);
      const futsal = (existing.evaluation?.modality || existing.modalitySnapshot) === "Futsal";
      const oldMetricNames = new Set(existing.metrics.map((item) => item.name));
      const legacyMetrics = Object.fromEntries(Object.entries(metrics || {}).filter(([name]) => !futsal || oldMetricNames.has(name)));
      const profileMetrics = Object.fromEntries(Object.entries(metrics || {}).filter(([name]) => futsal && !oldMetricNames.has(name)));
      const hasMeasurements = measurements !== undefined || Object.keys(profileMetrics).length > 0 || futsal && ratings !== undefined && !existing.measurementsInitialized && existing.roleSnapshot;
      if (measurements !== undefined && !futsal) throw new HttpError(400, "Medidas por perfil são exclusivas do futsal.");
      if (hasMeasurements && (present ?? existing.present) === false) throw new HttpError(400, "Atletas ausentes não podem receber medidas.");
      const measurementData = hasMeasurements ? prepareMeasurements(existing, training.team, measurements === undefined ? {} : measurements, profileMetrics) : null;
      const record = await transaction.trainingRecord.update({
        where: { id: existing.id },
        data: {
          ...(present !== undefined ? { present } : {}),
          ...(measurementData ? { measurementsInitialized: true, measurements: { deleteMany: {}, create: measurementData } } : {}),
          ...(evaluationData ? { evaluation: { upsert: { create: evaluationData, update: evaluationData } } } : {}),
          ...(stats ? { goalkeeperStats: { upsert: { create: stats, update: stats } } } : {})
        }, include: { metrics: true }
      });
      for (const [name, expected] of Object.entries(expectedMetrics || {})) {
        if (fromStoredMetric(record.metrics.find((metric) => metric.name === name)?.value) !== expected) {
          throw new HttpError(409, "A métrica foi alterada em outra operação. Atualize o painel e tente novamente.");
        }
      }
      for (const [name, value] of Object.entries(legacyMetrics)) {
        const stored = toStoredMetric(value);
        await transaction.sportMetric.upsert({
          where: { recordId_name: { recordId: record.id, name } },
          create: { recordId: record.id, name, value: stored }, update: { value: stored }
        });
      }
      const result = await transaction.training.findUnique({
        where: { id: trainingId }, include: { records: { include: recordInclude } }
      });
      return toClientTraining(result, training.team);
    }, { isolationLevel: "Serializable" });
    return response.json(updated);
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

    const { count } = await prisma.training.deleteMany({
      where: {
        id: trainingId,
        team: {
          coachId: request.user.id
        }
      }
    });

    if (!count) {
      return response.status(404).json({ message: "Treino nao encontrado." });
    }

    return response.status(204).send();
  } catch (error) {
    return sendError(response, error, "Erro ao excluir treino.");
  }
});
