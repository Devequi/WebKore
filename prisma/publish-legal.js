import { readFile } from "node:fs/promises";
import { prisma } from "../server/src/db/prisma.js";
import { canonicalJSON, documentData } from "../server/src/domain/legal.js";
import { initialLegalDocuments } from "../shared/legalDocuments.js";
// Local operator CLI only; no unauthenticated publication route.
try {
  const input = process.argv[2] ? JSON.parse(await readFile(process.argv[2], "utf8")) : initialLegalDocuments;
  const documents = (Array.isArray(input) ? input : [input]).map(documentData);
  if (documents.some(doc => doc.type === "CONSENT") && !process.argv.includes("--allow-consent")) throw new Error("Finalidade opcional exige consumidor implementado e revisão de impacto; confirme explicitamente com --allow-consent após essa verificação.");
  await prisma.$transaction(async tx => {
    for (const doc of documents) {
      const existing = await tx.legalDocument.findUnique({ where: { id: doc.id } });
      if (existing) {
        if (Object.keys(doc).some(key => canonicalJSON(existing[key]) !== canonicalJSON(doc[key]))) throw new Error(`Versão imutável: ${doc.id}. Publique outra versão.`);
      } else await tx.legalDocument.create({ data: doc });
    }
  });
  console.log(`Publicação conferida: ${documents.length} documento(s).`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
