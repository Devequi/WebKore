import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../intermediario/autenticacao.js";
import { currentDocuments, legalStatus, recordDecision } from "../lib/legal.js";
import { HttpError, sendError } from "../lib/validacao.js";
export const legalRouter = Router();
legalRouter.get("/documents", async (_req, res) => {
  try { res.json({ documents: await currentDocuments(prisma) }); } catch (e) { sendError(res, e); }
});
legalRouter.get("/documents/:type/:version", async (req, res) => {
  try {
    const doc = await prisma.legalDocument.findUnique({ where: { type_version: { type: req.params.type, version: req.params.version } } });
    if (!doc || doc.publishedAt > new Date() || doc.effectiveAt > new Date()) throw new HttpError(404, "Documento não encontrado.");
    res.json(doc);
  } catch (e) { sendError(res, e); }
});
legalRouter.get("/me", requireAuth, async (req, res) => {
  try { res.json(await legalStatus(prisma, req.user.id)); } catch (e) { sendError(res, e); }
});
legalRouter.post("/me/decisions", requireAuth, async (req, res) => {
  try { res.json(await recordDecision(prisma, req.user.id, req.body)); } catch (e) { sendError(res, e); }
});
