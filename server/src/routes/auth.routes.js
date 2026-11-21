import bcrypt from "bcryptjs";
import { Router } from "express";
import { positionRankings } from "../../../shared/evaluations.js";
import { normalizeModality } from "../../../shared/criteria.js";
import { calculateAge } from "../../../shared/birthDate.js";

import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../db/prisma.js";
import { issueSession } from "../auth/sessions.js";
import { registrationDocuments, assertConsentAge, legalStatus, strictKeys } from "../domain/legal.js";
import { profileInclude, publicUserSelect, teamRelations, visibleRecords, visibleTeams, visibleTrainings } from "../auth/access.js";
import { birthDate as validateBirthDate, email as validateEmail, HttpError, password as validatePassword, sendError, text } from "../lib/validation.js";
import {
  normalizeRole,
  toClientMembership,
  toClientTeam,
  toClientTraining,
  toPublicUser
} from "../lib/serializers.js";

export const authRouter = Router();

async function buildSessionPayload(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId }, select: publicUserSelect
  });

  if (!user) return null;

  const teams = await prisma.team.findMany({
    where: visibleTeams(user),
    include: teamRelations(user),
    orderBy: {
      createdAt: "desc"
    }
  });

  const memberships = teams.flatMap((team) => team.memberships)
    .sort((first, second) => second.createdAt - first.createdAt);

  const visibleUserMap = new Map([[user.id, toPublicUser(user)]]);

  teams.forEach((team) => {
    visibleUserMap.set(team.coach.id, toPublicUser(team.coach));

    team.memberships.forEach((membership) => {
      const athlete = toPublicUser(membership.athlete, membership);
      if (user.role === "ATHLETE" || membership.status === "APPROVED") {
        visibleUserMap.set(athlete.id, athlete);
      } else if (!visibleUserMap.has(athlete.id)) {
        const { id, name, photo, role } = athlete;
        visibleUserMap.set(id, { id, name, photo, role });
      }
    });
  });

  const trainings = await prisma.training.findMany({
    where: visibleTrainings(user),
    include: {
      team: { include: profileInclude },
      records: visibleRecords(user)
    },
    orderBy: {
      date: "desc"
    }
  });

  const clientTrainings = trainings.map((training) => toClientTraining(training, training.team));
  const teamRankings = user.role === "COACH" ? Object.fromEntries(teams
    .filter((team) => normalizeModality(team.modality) === "Futsal")
    .map((team) => [team.id, positionRankings(
      team.memberships.filter((membership) => membership.status === "APPROVED").map((membership) => toPublicUser(membership.athlete, membership)),
      clientTrainings.filter((training) => training.teamId === team.id)
    )])) : {};
  return {
    user: toPublicUser(user),
    legal: await legalStatus(prisma, user.id),
    state: {
      users: Array.from(visibleUserMap.values()),
      teams: teams.map((team) => toClientTeam(team, user)),
      memberships: memberships.map(toClientMembership),
      trainings: clientTrainings,
      goals: user.role === "ATHLETE" ? await prisma.personalGoal.findMany({ where: { membership: { athleteId: user.id, status: "APPROVED" } }, orderBy: { createdAt: "desc" } }) : [],
      teamRankings
    }
  };
}

authRouter.post("/register", async (request, response) => {
  try {
    strictKeys(request.body, ["email", "name", "password", "role", "birthDate", "legal"]);
    const { email, name, password, role, birthDate } = request.body;

    if (!name || !email || !password || !role) {
      return response.status(400).json({
        message: "Informe nome, e-mail, senha e perfil."
      });
    }

    const normalizedEmail = validateEmail(email);

    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) throw new HttpError(400, "Perfil inválido.");
    const normalizedBirthDate = normalizedRole === "ATHLETE" ? validateBirthDate(birthDate) : null;
    const normalizedName = text(name, "Nome");
    validatePassword(password, true);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (existingUser) {
      return response.status(409).json({
        message: "Ja existe uma conta com este e-mail."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async transaction => {
      const choices = await registrationDocuments(transaction, request.body.legal);
      assertConsentAge({ role: normalizedRole, birthDate: normalizedBirthDate }, choices);
      const created = await transaction.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role: normalizedRole,
        birthDate: normalizedBirthDate,
        photoUrl: normalizedName
          .split(" ")
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase()
      }
      });
      await transaction.legalDecision.createMany({ data: choices.map(({ doc, action }) => ({
        userId: created.id, documentId: doc.id, action, purpose: doc.purpose, requestKey: `registration-${doc.id}`
      })) });
      return created;
    });

    const payload = await buildSessionPayload(user.id);

    return response.status(201).json({
      token: await issueSession(user),
      legal: payload.legal,
      user: payload.user,
      state: payload.state
    });
  } catch (error) {
    return sendError(response, error, "Erro ao cadastrar usuario.");
  }
});

authRouter.post("/login", async (request, response) => {
  try {
    const { email, password, role } = request.body;

    const normalizedEmail = validateEmail(email);
    validatePassword(password);
    const normalizedRole = role === undefined ? null : normalizeRole(role);
    if (role !== undefined && !normalizedRole) throw new HttpError(400, "Perfil inválido.");

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user || (normalizedRole && user.role !== normalizedRole) || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({
        message: "Credenciais invalidas."
      });
    }

    const payload = await buildSessionPayload(user.id);

    return response.json({
      token: await issueSession(user),
      legal: payload.legal,
      user: payload.user,
      state: payload.state
    });
  } catch (error) {
    return sendError(response, error, "Erro ao realizar login.");
  }
});

authRouter.post("/logout", requireAuth, async (request, response) => {
  try {
    await prisma.authSession.deleteMany({ where: { id: request.sessionId, userId: request.user.id } });
    return response.status(204).send();
  } catch (error) { return sendError(response, error, "Erro ao encerrar sessão."); }
});

authRouter.get("/me", requireAuth, async (request, response) => {
  try {
    const payload = await buildSessionPayload(request.user.id);

    if (!payload) {
      return response.status(404).json({ message: "Usuario nao encontrado." });
    }

    return response.json(payload);
  } catch (error) {
    return sendError(response, error, "Erro ao buscar sessao.");
  }
});

authRouter.patch("/me", requireAuth, async (request, response) => {
  try {
    if (["role", "id", "userId", "passwordHash"].some((field) => Object.hasOwn(request.body, field))) {
      throw new HttpError(403, "Você não tem permissão para alterar a identidade ou o perfil de acesso da conta.");
    }
    const { email, name, password, currentPassword, photo, birthDate } = request.body;

    const account = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (!account) throw new HttpError(401, "Sessão inválida. Entre novamente.");
    const emailChanged = email !== undefined && validateEmail(email) !== account.email;
    if (password !== undefined || emailChanged) {
      if (typeof currentPassword !== "string" || currentPassword.length > 4096 || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
        throw new HttpError(403, "Informe a senha atual para alterar o e-mail ou a senha.");
      }
    }

    const data = {};
    if (birthDate !== undefined) data.birthDate = validateBirthDate(birthDate);
    if (name !== undefined) data.name = text(name, "Nome");
    if (email !== undefined) data.email = validateEmail(email);
    if (photo !== undefined) data.photoUrl = photo === null || photo === "" ? null : text(photo, "Foto");
    if (password !== undefined) data.passwordHash = await bcrypt.hash(validatePassword(password, true), 10);

    const user = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: request.user.id, authVersion: account.authVersion, passwordHash: account.passwordHash },
        data: { ...data, ...(password !== undefined ? { authVersion: { increment: 1 } } : {}) }
      });
      if (password !== undefined) await transaction.authSession.deleteMany({ where: { userId: request.user.id } });
      if (birthDate !== undefined && updated.role === "ATHLETE" && (calculateAge(updated.birthDate?.toISOString().slice(0, 10)) ?? -1) < 18) {
        const history = await transaction.legalDecision.findMany({ where: { userId: updated.id, purpose: { not: "" } }, orderBy: { sequence: "desc" } });
        const seen = new Set();
        for (const decision of history) {
          if (seen.has(decision.purpose)) continue;
          seen.add(decision.purpose);
          if (decision.action === "GRANT") await transaction.legalDecision.create({ data: {
            userId: updated.id, documentId: decision.documentId, purpose: decision.purpose, action: "REVOKE_AGE", requestKey: `age-correction-${decision.id}`
          } });
        }
      }
      return updated;
    });

    const payload = await buildSessionPayload(user.id);

    return response.json({ ...payload, ...(password !== undefined ? { reauthenticate: true } : {}) });
  } catch (error) {
    return sendError(response, error, "Erro ao atualizar conta.");
  }
});

authRouter.delete("/me", requireAuth, async (request, response) => {
  try {
    await prisma.$transaction(async (transaction) => {
      // TrainingRecord.athleteId is a legacy scalar, not a User foreign key.
      await transaction.trainingRecord.deleteMany({ where: { athleteId: request.user.id } });
      if (request.user.role === "COACH") {
        await transaction.team.deleteMany({
          where: {
            coachId: request.user.id
          }
        });
      }

      await transaction.user.delete({
        where: { id: request.user.id }
      });
    });

    return response.status(204).send();
  } catch (error) {
    return sendError(response, error, "Erro ao excluir conta.");
  }
});

authRouter.get("/me/data", requireAuth, async (request, response) => {
  try {
    const userId = request.user.id;
    const data = await prisma.$transaction(async tx => ({
      exportedAt: new Date().toISOString(),
      user: await tx.user.findUnique({ where: { id: userId }, select: publicUserSelect }),
      memberships: await tx.membership.findMany({ where: { athleteId: userId } }),
      goals: await tx.personalGoal.findMany({ where: { membership: { athleteId: userId } } }),
      ownedTeams: await tx.team.findMany({ where: { coachId: userId }, select: { id: true, name: true, modality: true, createdAt: true } }),
      records: await tx.trainingRecord.findMany({ where: { athleteId: userId }, include: {
        metrics: true, measurements: true, goalkeeperStats: true, evaluation: { include: { criteria: true } },
        training: { select: { date: true, type: true, teamId: true } }
      } }),
      legal: await legalStatus(tx, userId)
    }), { isolationLevel: "RepeatableRead" });
    return response.json(data);
  } catch (error) { return sendError(response, error, "Erro ao exportar dados pessoais."); }
});
