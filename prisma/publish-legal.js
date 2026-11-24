import { readFile } from "node:fs/promises";
import "../server/src/config/environment.js";
import { prisma } from "../server/src/db/prisma.js";
import { canonicalJSON, currentDocuments, documentData } from "../server/src/domain/legal.js";
import { initialLegalDocuments } from "../shared/legalDocuments.js";
// Local operator CLI only; no unauthenticated publication route.
try {
  if (process.env.NODE_ENV === "production" && !process.argv[2]) {
    throw new Error("Informe o arquivo com os documentos aprovados para produção.");
  }
  const demo = process.argv[2] === "--demo";
  const file = demo ? new URL("./legal-demo.json", import.meta.url) : process.argv[2];
  const input = file ? JSON.parse(await readFile(file, "utf8")) : initialLegalDocuments;
  const documents = (Array.isArray(input) ? input : [input]).map(documentData);
  if (process.env.NODE_ENV === "production" && documents.some(doc =>
    initialLegalDocuments.some(template => documentData(template).contentHash === doc.contentHash) ||
    doc.content.some(section => /PENDENTE DE DEFINIÇÃO/i.test(section.text)))) {
    throw new Error("Documentos preliminares precisam de revisão antes da publicação.");
  }
  if (documents.some(doc => doc.type === "CONSENT") && !process.argv.includes("--allow-consent")) throw new Error("Finalidade opcional exige consumidor implementado e revisão de impacto; confirme explicitamente com --allow-consent após essa verificação.");
  await prisma.$transaction(async tx => {
    const current = demo ? await currentDocuments(tx) : [];
    for (const doc of documents) {
      // Keep any independently published current version in effect.
      const active = current.find(item => item.type === doc.type);
      if (demo && active && active.id !== doc.id && active.version !== "homolog-2026-11-24.1") continue;
      const existing = await tx.legalDocument.findUnique({ where: { id: doc.id } });
      if (existing) {
        if (Object.keys(doc).some(key => canonicalJSON(existing[key]) !== canonicalJSON(doc[key]))) throw new Error(`Versão imutável: ${doc.id}. Publique outra versão.`);
      } else if (demo) {
        await tx.legalDocument.createMany({ data: [doc], skipDuplicates: true });
      } else await tx.legalDocument.create({ data: doc });
    }
  });
  console.log(`Publicação conferida: ${documents.length} documento(s).`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
