import { useEffect, useId, useRef, useState } from "react";
import { Download, ExternalLink, ShieldCheck, X } from "lucide-react";
import { api } from "../../services/api.js";
import { Button } from "../../components/ui/Button.jsx";
import { CollapsiblePanel } from "../../components/ui/CollapsiblePanel.jsx";
import { ProfileSection } from "../profile/ProfileSection.jsx";
import { calculateAge } from "../../../shared/birthDate.js";
import "./Privacy.css";

const actionLabel = { ACCEPT: "Aceite dos Termos", ACKNOWLEDGE: "Ciência da Política", GRANT: "Consentimento concedido", REVOKE: "Consentimento revogado", REVOKE_AGE: "Consentimento revogado após correção da idade", DECLINE: "Consentimento recusado" };
const date = value => new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const href = doc => `/${doc.type === "TERMS" ? "termos" : "privacidade"}?tipo=${encodeURIComponent(doc.type)}&versao=${encodeURIComponent(doc.version)}`;
function containDialogFocus(event) {
  if (event.key !== "Tab") return;
  const elements = [...event.currentTarget.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),summary,[tabindex="0"]')].filter(el => el.getClientRects().length);
  const first = elements[0], last = elements.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}
export function LegalText({ document }) {
  return <article className="legal-text"><h2>{document.title}</h2>
    <p className="legal-meta">Versão {document.version} · Vigência: {date(document.effectiveAt)} · Publicação: {date(document.publishedAt)}</p>
    <p><strong>Alterações:</strong> {document.changeSummary}</p>
    {document.content.map((section, index) => <section key={index}><h3>{section.title}</h3><p>{section.text}</p></section>)}
    <details><summary>Integridade do documento (SHA-256)</summary><code>{document.contentHash}</code></details>
  </article>;
}
export function LegalLinks() {
  return <nav className="legal-links" aria-label="Documentos legais"><a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a><a href="/termos" target="_blank" rel="noopener">Termos de Uso</a></nav>;
}
export function RegistrationPrivacy({ value, onChange, role, birthDate }) {
  const [documents, setDocuments] = useState([]), [error, setError] = useState("");
  const dialog = useRef(null), trigger = useRef(null), titleId = useId();
  const terms = documents.find(d => d.type === "TERMS"), privacy = documents.find(d => d.type === "PRIVACY");
  async function load() {
    setError("");
    try { const result = await api.legalDocuments(); setDocuments(result.documents); if (value && (!result.documents.some(d => d.id === value.termsId) || !result.documents.some(d => d.id === value.privacyId))) onChange(null); if (!result.documents.some(d => d.type === "TERMS") || !result.documents.some(d => d.type === "PRIVACY")) setError("Os documentos ainda não foram publicados."); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);
  function change(key, checked) {
    const sameVersion = value?.termsId === terms.id && value?.privacyId === privacy.id;
    onChange({ ...(sameVersion ? value : {}), termsId: terms.id, privacyId: privacy.id, [key]: checked });
  }
  const same = terms && privacy && value?.termsId === terms.id && value?.privacyId === privacy.id;
  const optionalAllowed = role !== "athlete" || (calculateAge(birthDate) ?? -1) >= 18;
  function close() { dialog.current.close(); trigger.current?.focus(); }
  return <div className="registration-privacy">
    <p>Conheça como o WebKore utiliza seus dados. Ciência da Política e aceite dos Termos são decisões separadas.</p>
    <LegalLinks />
    {error && <p role="alert">{error} <Button type="button" variant="ghost" onClick={load}>Tentar novamente</Button></p>}
    <Button type="button" variant="secondary" disabled={!terms || !privacy} onClick={event => { trigger.current = event.currentTarget; dialog.current.showModal(); }} icon={ShieldCheck}>Privacidade e proteção de dados</Button>
    <p role="status">{same && value.acceptTerms && value.acknowledgePrivacy ? "Termos aceitos e ciência da Política confirmada." : "Confirme suas decisões antes de criar a conta."}</p>
    <dialog ref={dialog} className="privacy-dialog" aria-labelledby={titleId} onKeyDown={containDialogFocus} onCancel={() => trigger.current?.focus()}>
      <header><h2 id={titleId}><ShieldCheck aria-hidden="true" size={22} /> Privacidade e proteção de dados</h2><button autoFocus type="button" aria-label="Fechar privacidade" onClick={close}><X aria-hidden="true" /></button></header>
      <div className="privacy-dialog__body" tabIndex={0}>
        <p>Seu treinador registra seus treinos e acompanha seu desempenho. Você consulta seus próprios dados e pode corrigir seu perfil. Leia no seu ritmo; rolar a página não concede consentimento.</p>
        {documents.filter(d => d.type !== "CONSENT").map(doc => <LegalText key={doc.id} document={doc} />)}
        {!documents.some(d => d.type === "CONSENT") ? <p>Não há tratamentos opcionais por consentimento publicados. Nenhuma autorização genérica será registrada.</p> : documents.filter(d => d.type === "CONSENT").map(doc => <section key={doc.id}><LegalText document={doc} />
          {optionalAllowed ? <label className="checkbox-line"><input type="checkbox" checked={Boolean(same && value.consents?.some(c => c.documentId === doc.id && c.granted))} onChange={e => change("consents", [...(same ? value.consents || [] : []).filter(c => c.documentId !== doc.id), { documentId: doc.id, granted: e.target.checked }])} />Autorizo somente esta finalidade (opcional). Desmarcado significa recusa; as demais funções continuam disponíveis.</label> : <p>Esta autorização opcional não está disponível para menores ou atletas sem idade informada. Você pode continuar seu cadastro esportivo.</p>}
        </section>)}
      </div>
      <footer><LegalLinks />
        <label className="checkbox-line"><input type="checkbox" checked={Boolean(same && value.acknowledgePrivacy)} onChange={e => change("acknowledgePrivacy", e.target.checked)} />Tomei ciência da Política de Privacidade, versão {privacy?.version}.</label>
        <label className="checkbox-line"><input type="checkbox" checked={Boolean(same && value.acceptTerms)} onChange={e => change("acceptTerms", e.target.checked)} />Aceito os Termos de Uso, versão {terms?.version}.</label>
        <div className="legal-actions"><Button type="button" variant="ghost" onClick={close}>Voltar ao cadastro</Button><Button type="button" onClick={close}>Confirmar decisões</Button></div>
      </footer>
    </dialog>
  </div>;
}

export function PrivacyProfile({ currentUser }) {
  const [status, setStatus] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const optionalAllowed = currentUser.role !== "athlete" || (calculateAge(currentUser.birthDate) ?? -1) >= 18;
  async function load() { try { setError(""); setStatus(await api.legalMe()); } catch (e) { setError(e.message); } }
  useEffect(() => { load(); }, []);
  async function decide(documentId, action) {
    setBusy(true); setError("");
    try { await api.legalDecision({ documentId, action, requestKey: crypto.randomUUID() }); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setError("");
    try {
      const data = await api.personalData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "webkore-meus-dados.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="privacy-profile">
    {error && <p role="alert">{error} <Button type="button" onClick={load} variant="ghost">Atualizar</Button></p>}
    {!status && !error && <p role="status">Carregando suas decisões...</p>}
    {status && <>
      <ProfileSection title="Documentos legais" description="Leia os documentos que orientam o uso do WebKore.">
      {status.pending.length > 0 && <p className="profile-data-copy" role="status">Há novas versões para consultar e confirmar.</p>}
      {status.documents.filter(d => d.type !== "CONSENT").map(doc => <div className="legal-document-row" key={doc.id}>
        <a className="profile-doc-title" href={href(doc)} target="_blank" rel="noopener" aria-label={`${doc.title} — ler documento completo`}>{doc.title}<ExternalLink size={14} aria-hidden="true" /></a>
        <span className="profile-doc-status">{status.pending.some(d => d.id === doc.id) ? "Pendente" : doc.type === "TERMS" ? "Aceite registrado" : "Ciência registrada"}</span>
        <p className="profile-doc-meta">Versão {doc.version} · Publicado em {new Date(doc.publishedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
        <details className="profile-doc-changes"><summary>O que mudou nesta versão</summary><p>{doc.changeSummary}</p></details>
        {status.pending.some(d => d.id === doc.id) && <Button disabled={busy} type="button" variant="secondary" onClick={() => decide(doc.id, doc.type === "TERMS" ? "ACCEPT" : "ACKNOWLEDGE")}>{doc.type === "TERMS" ? "Aceitar esta versão dos Termos" : "Confirmar ciência desta Política"}</Button>}
      </div>)}
      </ProfileSection>
      <ProfileSection title="Histórico de decisões" description="Versões e decisões registradas na sua conta.">
        <CollapsiblePanel title={`Ver registros (${status.history.length})`} initialOpen={false} className="profile-history">
          {!status.history.length && <p className="profile-data-copy">Nenhuma decisão registrada. Não foram criados aceites retroativos.</p>}
          <ul className="legal-history">{status.history.map(e => <li key={e.id}><strong>{actionLabel[e.action]}</strong><br /><a href={href(e.document)} target="_blank" rel="noopener">{e.document.title} · versão {e.document.version}</a><time dateTime={e.occurredAt}>{date(e.occurredAt)}</time>{e.purpose && <span>{e.purpose}</span>}</li>)}</ul>
        </CollapsiblePanel>
      </ProfileSection>
      {(status.documents.some(d => d.type === "CONSENT") || status.consents.length > 0) && <ProfileSection title="Consentimentos opcionais" description="Escolhas específicas, além do aceite dos Termos e da ciência da Política.">
      {status.documents.filter(d => d.type === "CONSENT").map(doc => <div key={doc.id} className="legal-document-row"><LegalText document={doc} />
        <p>Revogar encerra a autorização para esta finalidade. O acesso às demais funções permanece.</p>
        {optionalAllowed ? <Button disabled={busy} type="button" onClick={() => decide(doc.id, "GRANT")}>Autorizar esta finalidade</Button> : <p>Concessão opcional indisponível para menores ou atletas sem idade informada.</p>}{" "}
        <Button disabled={busy} type="button" variant="ghost" onClick={() => decide(doc.id, "DECLINE")}>Recusar</Button>
      </div>)}
      {status.consents.map(c => <div key={c.purpose}><p>{c.purpose}: {c.granted ? "Ativo" : "Inativo"}</p>{c.decision.action === "GRANT" && <Button disabled={busy} type="button" variant="secondary" onClick={() => decide(c.decision.documentId, "REVOKE")}>Revogar consentimento</Button>}</div>)}
      </ProfileSection>}
    </>}
    <ProfileSection title="Controle de dados" description="Acesse uma cópia das suas informações.">
      <p className="profile-data-copy">Baixe seus dados pessoais e os registros associados à sua conta.</p>
      <Button disabled={busy} type="button" variant="secondary" icon={Download} onClick={download}>Exportar meus dados</Button>
      <details className="profile-doc-changes" style={{ marginTop: "1rem" }}><summary>Correção, exclusão e contato</summary><p>Corrija informações na aba Dados pessoais. Para excluir a conta, use a opção ao final desta página. A exclusão remove dados do banco ativo, sem apagar backups ou arquivos já exportados.</p><p>O canal institucional para outros direitos ainda não foi definido pelo responsável. Consulte a Política de Privacidade para mais informações.</p></details>
    </ProfileSection>
  </div>;
}
