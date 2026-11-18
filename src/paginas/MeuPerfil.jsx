import { Save, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Avatar } from "../componentes/ui/Avatar.jsx";
import { Button } from "../componentes/ui/Botao.jsx";
import { BirthDateField } from "../componentes/ui/CampoNascimento.jsx";
import { useConfirmation } from "../componentes/ui/Confirmacao.jsx";
import { formatAge, isDateOnly, validateBirthDate } from "../../shared/birthDate.js";
import { formatDate } from "../utils/formatters.js";
import { useTodayDate } from "../hooks/useTodayDate.js";
import "../styles/paginasAtleta/AthleteExperience.css";
import "../styles/paginasTreinador/ConfigsTreinador.css";

// This page accepts only the authenticated account, never a team or an arbitrary user ID.
export function MyProfilePage({ currentUser, actions, onLogout }) {
  const athlete = currentUser.role === "athlete";
  const roleLabel = athlete ? "Atleta" : "Treinador";
  const today = useTodayDate();
  const [form, setForm] = useState(() => ({ name: currentUser.name, email: currentUser.email,
    photo: currentUser.photo || "", birthDate: currentUser.birthDate || "", password: "" }));
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { confirmAction, confirmation } = useConfirmation();
  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));

  async function save(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFeedback(null);
    try {
      if (!form.name.trim() || form.name.length > 191) throw new Error("Informe um nome válido com até 191 caracteres.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || form.email.length > 191) throw new Error("Informe um e-mail válido com até 191 caracteres.");
      const patch = { name: form.name.trim(), email: form.email.trim().toLowerCase() };
      if (athlete) {
        if (form.birthDate) validateBirthDate(form.birthDate, today);
        if (currentUser.birthDate && !form.birthDate) throw new Error("Informe a data de nascimento.");
        patch.photo = form.photo;
        if (form.birthDate) patch.birthDate = form.birthDate;
      } else if (form.password) {
        if (form.password.length < 6 || new TextEncoder().encode(form.password).length > 72) throw new Error("A nova senha deve ter pelo menos 6 caracteres e no máximo 72 bytes.");
        patch.password = form.password;
      }
      await actions.updateUser({ patch });
      change("password", "");
      setFeedback({ type: "success", text: "Perfil atualizado." });
    } catch (error) {
      setFeedback({ type: "error", text: error.message || "Não foi possível salvar o perfil." });
    } finally { setPending(false); }
  }

  async function deleteAccount() {
    if (pending || !await confirmAction({ title: "Excluir conta?", label: "Excluir conta",
      description: "A exclusão da conta também remove todas as equipes que você criou." })) return;
    setPending(true);
    setFeedback(null);
    try { await actions.deleteUser(); onLogout(); }
    catch (error) { setFeedback({ type: "error", text: error.message || "Não foi possível excluir a conta." }); }
    finally { setPending(false); }
  }

  return <div className={`page-stack ${athlete ? "athlete-experience" : "coach-experience"}`}>
    {confirmation}
    <section className="panel">
      <div className="athlete-profile-header">
        <Avatar name={currentUser.name} photo={currentUser.photo} size="lg" />
        <div><span className="eyebrow">{roleLabel}</span><h2>{currentUser.name}</h2><p>Informações pessoais e da sua conta WebKore.</p></div>
      </div>
      <dl className="athlete-facts">
        <div><dt>Nome completo</dt><dd>{currentUser.name}</dd></div>
        <div><dt>E-mail</dt><dd>{currentUser.email}</dd></div>
        <div><dt>Identificação da conta</dt><dd>{currentUser.id}</dd></div>
        <div><dt>Perfil de acesso</dt><dd>{roleLabel}</dd></div>
        {isDateOnly(String(currentUser.createdAt || "").slice(0, 10)) && <div><dt>Conta criada em</dt><dd>{formatDate(String(currentUser.createdAt).slice(0, 10))}</dd></div>}
        {athlete && <><div><dt>Data de nascimento</dt><dd>{isDateOnly(currentUser.birthDate) ? formatDate(currentUser.birthDate) : "Não informada"}</dd></div>
          <div><dt>Idade</dt><dd>{formatAge(currentUser.birthDate, today)}</dd></div></>}
      </dl>
    </section>
    <section className="panel settings-panel">
      <div className="section-heading"><div><span className="eyebrow">Dados pessoais e conta</span><h2>Editar perfil</h2></div></div>
      {feedback && <p className={`form-feedback form-feedback--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}
      <div className="settings-grid">
        <form className="settings-form" onSubmit={save} aria-busy={pending}>
          <fieldset className="athlete-profile-fields" disabled={pending}>
            <label>Nome completo<input required maxLength={191} autoComplete="name" value={form.name} onChange={event => change("name", event.target.value)} /></label>
            <label>E-mail<input required maxLength={191} type="email" autoComplete="email" value={form.email} onChange={event => change("email", event.target.value)} /></label>
            {athlete ? <>
              <label>Foto ou iniciais<input maxLength={3} value={form.photo} onChange={event => change("photo", event.target.value.toUpperCase())} /></label>
              <BirthDateField value={form.birthDate} required={Boolean(currentUser.birthDate)} onChange={value => change("birthDate", value)} />
            </> : <label>Nova senha<input type="password" minLength={6} autoComplete="new-password" placeholder="Preencha somente para alterar a senha" value={form.password} onChange={event => change("password", event.target.value)} /></label>}
            <Button type="submit" icon={Save}>{pending ? "Salvando..." : "Salvar perfil"}</Button>
          </fieldset>
        </form>
        <div className="privacy-box">
          <ShieldCheck size={28} aria-hidden="true" /><strong>Informações da conta</strong>
          <p>{roleLabel}. Seus dados pessoais são atualizados na sua própria conta.</p>
          {!athlete && <div className="settings-actions"><Button type="button" variant="danger" icon={Trash2} disabled={pending} onClick={deleteAccount}>Excluir conta</Button></div>}
        </div>
      </div>
    </section>
  </div>;
}
