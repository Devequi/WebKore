import { createHash } from "node:crypto";
import { HttpError } from "./validacao.js";
import { calculateAge } from "../../../shared/birthDate.js";

// MySQL JSON may reorder object keys. Canonical form keeps hashes stable after storage.
export function canonicalJSON(value) {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const documentHash = content => createHash("sha256").update(canonicalJSON(content)).digest("hex");
export function documentData(input) {
  const { type, version, title, content, effectiveAt, requirementKey, changeSummary, purpose = "" } = input;
  if (!["PRIVACY", "TERMS", "CONSENT"].includes(type) ||
      ![version, title, requirementKey, changeSummary].every(v => typeof v === "string" && v.trim() && v.length <= 191) || typeof version !== "string" || !/^[A-Za-z0-9._-]{1,100}$/.test(version) ||
      !Array.isArray(content) || !content.length || content.some(s => !s || typeof s.title !== "string" || typeof s.text !== "string") ||
      JSON.stringify(content).length > 60000 || !Number.isFinite(Date.parse(effectiveAt)) ||
      typeof purpose !== "string" || (type === "CONSENT" ? !/^[A-Z][A-Z0-9_]{1,63}$/.test(purpose) : purpose !== "")) {
    throw new HttpError(400, "Documento jurídico inválido.");
  }
  const contentHash = documentHash(content);
  return { id: `${type}-${version}`, type, version, title, content, effectiveAt: new Date(effectiveAt), requirementKey,
    changeSummary, purpose, contentHash };
}

export async function currentDocuments(db, now = new Date()) {
  const all = await db.legalDocument.findMany({ where: { effectiveAt: { lte: now }, publishedAt: { lte: now } },
    orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }] });
  const found = new Set();
  return all.filter(doc => { const key = `${doc.type}:${doc.purpose}`; if (found.has(key)) return false; found.add(key); return true; });
}

export function strictKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) {
    throw new HttpError(400, "Campos de decisão inválidos.");
  }
}

export async function registrationDocuments(db, input) {
  strictKeys(input, ["termsId", "privacyId", "acceptTerms", "acknowledgePrivacy", "consents"]);
  if (input.acceptTerms !== true || input.acknowledgePrivacy !== true) throw new HttpError(400, "Confirme o aceite dos Termos e a ciência da Política separadamente.");
  const docs = await currentDocuments(db);
  const terms = docs.find(d => d.type === "TERMS"), privacy = docs.find(d => d.type === "PRIVACY");
  if (!terms || !privacy) throw new HttpError(503, "Documentos ainda não publicados. Tente novamente mais tarde.");
  if (terms.id !== input.termsId || privacy.id !== input.privacyId) throw new HttpError(409, "Os documentos foram atualizados. Consulte as versões vigentes e confirme novamente.");
  const consents = input.consents ?? [];
  if (!Array.isArray(consents) || consents.length > 30) throw new HttpError(400, "Consentimentos inválidos.");
  const purposes = new Set();
  const choices = consents.map(choice => {
    strictKeys(choice, ["documentId", "granted"]);
    const doc = docs.find(d => d.type === "CONSENT" && d.id === choice.documentId);
    if (!doc || typeof choice.granted !== "boolean" || purposes.has(doc.purpose)) throw new HttpError(400, "Finalidade ou decisão inválida.");
    purposes.add(doc.purpose);
    return { doc, action: choice.granted ? "GRANT" : "DECLINE" };
  });
  return [{ doc: terms, action: "ACCEPT" }, { doc: privacy, action: "ACKNOWLEDGE" }, ...choices];
}

export function assertConsentAge(user, choices) {
  // No verified guardian mechanism exists. Never infer parental consent from the athlete.
  if (choices.some(c => c.doc.type === "CONSENT" && c.action !== "DECLINE") && user.role === "ATHLETE" &&
      (calculateAge(user.birthDate?.toISOString().slice(0, 10)) ?? -1) < 18) {
    throw new HttpError(400, "Consentimentos opcionais não estão disponíveis para atletas menores ou sem idade informada; o cadastro esportivo continua disponível.");
  }
}

export async function legalStatus(db, userId) {
  const [documents, history] = await Promise.all([
    currentDocuments(db), db.legalDecision.findMany({ where: { userId }, include: { document: true }, orderBy: { sequence: "desc" } })
  ]);
  const pending = documents.filter(doc => doc.type !== "CONSENT" && !history.some(e =>
    e.document.type === doc.type && e.document.requirementKey === doc.requirementKey && e.action === (doc.type === "TERMS" ? "ACCEPT" : "ACKNOWLEDGE")));
  const seen = new Set();
  const consents = history.filter(e => { if (!e.purpose || seen.has(e.purpose)) return false; seen.add(e.purpose); return true; })
    .map(e => ({ purpose: e.purpose, granted: e.action === "GRANT" && documents.some(d => d.type === "CONSENT" && d.purpose === e.purpose && d.requirementKey === e.document.requirementKey), decision: e }));
  return { documents, history, pending, consents };
}

export async function recordDecision(db, userId, input) {
  strictKeys(input, ["documentId", "action", "requestKey"]);
  if (typeof input.documentId !== "string" || typeof input.requestKey !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(input.requestKey) ||
      !["ACCEPT", "ACKNOWLEDGE", "GRANT", "REVOKE", "DECLINE"].includes(input.action)) throw new HttpError(400, "Decisão inválida.");
  return db.$transaction(async tx => {
    // Serialize per account: simultaneous retries/revoke/grant cannot overwrite history.
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
    const replay = await tx.legalDecision.findUnique({ where: { userId_requestKey: { userId, requestKey: input.requestKey } } });
    if (replay) {
      if (replay.documentId !== input.documentId || replay.action !== input.action) throw new HttpError(409, "Chave de requisição já utilizada para outra decisão.");
      return replay;
    }
    const doc = await tx.legalDocument.findUnique({ where: { id: input.documentId } });
    const current = await currentDocuments(tx);
    const validAction = doc && (doc.type === "TERMS" ? input.action === "ACCEPT" : doc.type === "PRIVACY" ? input.action === "ACKNOWLEDGE" : ["GRANT", "DECLINE", "REVOKE"].includes(input.action));
    if (!validAction || (!current.some(d => d.id === doc.id) && input.action !== "REVOKE")) throw new HttpError(409, "Documento ou ação indisponível. Atualize os documentos.");
    const last = await tx.legalDecision.findFirst({ where: { userId, ...(doc.type === "CONSENT" ? { purpose: doc.purpose } : { documentId: doc.id }) }, orderBy: { sequence: "desc" }, include: { document: true } });
    if (doc.type === "CONSENT") {
      if (input.action === "REVOKE" && (!last || last.documentId !== doc.id || !["GRANT", "REVOKE"].includes(last.action))) throw new HttpError(409, "Não há concessão correspondente para revogar.");
      if (input.action === "GRANT") assertConsentAge(await tx.user.findUniqueOrThrow({ where: { id: userId } }), [{ doc, action: input.action }]);
    }
    // Each explicit request key has a durable receipt, even if state was already equal.
    // Otherwise retrying an unrecorded key after an intervening revocation could grant again.
    return tx.legalDecision.create({ data: { userId, documentId: doc.id, action: input.action, purpose: doc.purpose, requestKey: input.requestKey } });
  });
}
