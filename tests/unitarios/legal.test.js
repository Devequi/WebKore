import test from "node:test";
import assert from "node:assert/strict";
import { initialLegalDocuments } from "../../shared/legalDocuments.js";
import { documentData, documentHash, registrationDocuments, legalStatus, assertConsentAge, recordDecision } from "../../server/src/domain/legal.js";
const docs = initialLegalDocuments.map(documentData);
const db = { legalDocument: { findMany: async () => docs } };
const valid = { termsId: docs[1].id, privacyId: docs[0].id, acceptTerms: true, acknowledgePrivacy: true };
test("cadastro distingue aceite, ciência e ausência de consentimento", async () => {
  const choices = await registrationDocuments(db, valid);
  assert.deepEqual(choices.map(c => c.action), ["ACCEPT", "ACKNOWLEDGE"]);
  for (const patch of [{ acceptTerms: false }, { acceptTerms: "true" }, { acknowledgePrivacy: false }, { termsId: "old" }, { userId: "other" }, { consents: [{ documentId: docs[0].id, granted: true }] }]) {
    await assert.rejects(() => registrationDocuments(db, { ...valid, ...patch }));
  }
});
test("hash determinístico e validação de publicação imutável", () => {
  assert.equal(docs[0].contentHash, documentHash(initialLegalDocuments[0].content));
  assert.equal(documentHash([{ title: "Título", text: "Texto" }]), documentHash([{ text: "Texto", title: "Título" }]));
  assert.notEqual(docs[0].contentHash, documentHash([{ title: "Outro", text: "texto" }]));
  for (const patch of [{ type: "FAKE" }, { effectiveAt: "invalid" }, { content: [] }, { purpose: "UNEXPECTED" }]) assert.throws(() => documentData({ ...initialLegalDocuments[0], ...patch }));
});
test("todas as idades mantêm cadastro; consentimento do menor não vira autorização parental", () => {
  for (const birthDate of [new Date(), new Date("2010-01-01"), new Date("2020-01-01"), null]) {
    const user = { role: "ATHLETE", birthDate };
    assert.doesNotThrow(() => assertConsentAge(user, [{ doc: docs[1], action: "ACCEPT" }]));
    assert.doesNotThrow(() => assertConsentAge(user, [{ doc: { type: "CONSENT" }, action: "DECLINE" }]));
    assert.throws(() => assertConsentAge(user, [{ doc: { type: "CONSENT" }, action: "GRANT" }]));
  }
});
test("nova edição não força aceite; novo requisito e finalidade não herdam decisões", async () => {
  const previous = { ...docs[1] };
  const changed = { ...previous, id: "TERMS-new", version: "new" };
  const consent = { ...docs[0], id: "CONSENT-new", type: "CONSENT", purpose: "FIXTURE", requirementKey: "new-purpose" };
  const history = [{ action: "ACCEPT", document: previous }, { action: "ACKNOWLEDGE", document: docs[0] },
    { action: "GRANT", purpose: "FIXTURE", document: { ...consent, requirementKey: "old-purpose" } }];
  const fake = { legalDocument: { findMany: async () => [changed, docs[0], consent] }, legalDecision: { findMany: async args => { assert.equal(args.where.userId, "self"); return history; } } };
  let status = await legalStatus(fake, "self");
  assert.equal(status.pending.length, 0); assert.equal(status.consents[0].granted, false);
  changed.requirementKey = "terms-material-change";
  status = await legalStatus(fake, "self"); assert.equal(status.pending[0].id, changed.id);
  fake.legalDocument.findMany = async () => { throw new Error("offline"); };
  await assert.rejects(() => legalStatus(fake, "self"), /offline/);
});
test("payload não pode escolher outro usuário nem alterar histórico", async () => {
  for (const body of [{ userId: "other" }, { occurredAt: "fake" }, { action: "UPDATE" }]) {
    await assert.rejects(() => recordDecision({}, "self", { documentId: docs[0].id, action: "ACKNOWLEDGE", requestKey: "request-123", ...body }));
  }
});
