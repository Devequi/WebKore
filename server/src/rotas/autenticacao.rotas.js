import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";

import { requireAuth } from "../intermediario/autenticacao.js";
import { prisma } from "../lib/prisma.js";
import { getJwtSecret } from "../lib/environment.js";
import { publicUserSelect, teamRelations, visibleRecords, visibleTeams, visibleTrainings } from "../lib/acesso.js";
import { birthDate as validateBirthDate, email as validateEmail, HttpError, password as validatePassword, sendError, text } from "../lib/validacao.js";
import {
  normalizeRole,
  toClientMembership,
  toClientTeam,
  toClientTraining,
  toPublicUser
} from "../lib/serializadores.js";

export const authRouter = Router();

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    getJwtSecret(),
    {
      expiresIn: "7d"
    }
  );
}

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
      visibleUserMap.set(membership.athlete.id, toPublicUser(membership.athlete, membership));
    });
  });

  const trainings = await prisma.training.findMany({
    where: visibleTrainings(user),
    include: {
      team: true,
      records: visibleRecords(user)
    },
    orderBy: {
      date: "desc"
    }
  });

  return {
    user: toPublicUser(user),
    state: {
      users: Array.from(visibleUserMap.values()),
      teams: teams.map(toClientTeam),
      memberships: memberships.map(toClientMembership),
      trainings: trainings.map((training) => toClientTraining(training, training.team))
    }
  };
}

authRouter.post("/register", async (request, response) => {
  try {
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

    const user = await prisma.user.create({
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

    const payload = await buildSessionPayload(user.id);

    return response.status(201).json({
      token: signToken(user),
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
      token: signToken(user),
      user: payload.user,
      state: payload.state
    });
  } catch (error) {
    return sendError(response, error, "Erro ao realizar login.");
  }
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
    const { email, name, password, photo, birthDate } = request.body;

    const data = {};
    if (birthDate !== undefined) data.birthDate = validateBirthDate(birthDate);
    if (name !== undefined) data.name = text(name, "Nome");
    if (email !== undefined) data.email = validateEmail(email);
    if (photo !== undefined) data.photoUrl = photo === null || photo === "" ? null : text(photo, "Foto");
    if (password !== undefined) data.passwordHash = await bcrypt.hash(validatePassword(password, true), 10);

    const user = await prisma.user.update({
      where: { id: request.user.id },
      data
    });

    const payload = await buildSessionPayload(user.id);

    return response.json(payload);
  } catch (error) {
    return sendError(response, error, "Erro ao atualizar conta.");
  }
});

authRouter.delete("/me", requireAuth, async (request, response) => {
  try {
    await prisma.$transaction(async (transaction) => {
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
