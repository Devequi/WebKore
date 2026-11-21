import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { PublicHeader } from "../../components/layout/PublicHeader.jsx";
import { LegalLinks, LegalText } from "./Privacy.jsx";
import { Button } from "../../components/ui/Button.jsx";
export function LegalDocumentPage() {
  const [document, setDocument] = useState(null), [error, setError] = useState("");
  const params = new URLSearchParams(window.location.search);
  const type = params.get("tipo") || (window.location.pathname === "/termos" ? "TERMS" : "PRIVACY");
  async function load() {
    try {
      setError("");
      const version = params.get("versao");
      const doc = version ? await api.legalDocument(type, version) : (await api.legalDocuments()).documents.find(d => d.type === type);
      if (!doc) throw new Error("Documento ainda não publicado."); setDocument(doc);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);
  return <main className="legal-page"><PublicHeader /><nav className="legal-links"><a href="/">Voltar ao WebKore</a><LegalLinks /></nav>
    <div className="panel">{error ? <><p role="alert">{error}</p><Button onClick={load}>Tentar novamente</Button></> : document ? <LegalText document={document} /> : <p role="status">Carregando documento...</p>}</div>
  </main>;
}
