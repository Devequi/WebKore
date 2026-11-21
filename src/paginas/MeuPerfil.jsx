import { useId, useState } from "react";
import { ChevronDown, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { Avatar } from "../componentes/ui/Avatar.jsx";
import { Button } from "../componentes/ui/Botao.jsx";
import { BirthDateField } from "../componentes/ui/CampoNascimento.jsx";
import { useConfirmation } from "../componentes/ui/Confirmacao.jsx";
import { ProfileSection } from "../componentes/ui/SecaoPerfil.jsx";
import { validateBirthDate } from "../../shared/birthDate.js";
import { useTodayDate } from "../hooks/useTodayDate.js";
import { PrivacyProfile } from "../componentes/ui/Privacidade.jsx";
import "../styles/Profile.css";

const tabs = [{ label: "Dados pessoais", icon: UserRound }, { label: "Privacidade e segurança", icon: ShieldCheck }];
function Feedback({ value }) {
  return value ? <p className={`form-feedback form-feedback--${value.type}`} role={value.type === "error" ? "alert" : "status"}>{value.text}</p> : null;
}

// Both profiles edit only the account supplied by the authenticated application shell.
export function MyProfilePage({ currentUser, actions, onLogout }) {
  const athlete = currentUser.role === "athlete", today = useTodayDate(), id = useId();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(() => ({ name: currentUser.name, email: currentUser.email,
    photo: currentUser.photo || "", birthDate: currentUser.birthDate || "", currentPassword: "" }));
  const [passwords, setPasswords] = useState({ currentPassword: "", password: "" });
  const [pending, setPending] = useState("");
  const [feedback, setFeedback] = useState(null), [passwordFeedback, setPasswordFeedback] = useState(null), [deleteFeedback, setDeleteFeedback] = useState(null);
  const { confirmAction, confirmation } = useConfirmation();
  const change = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const emailChanged = form.email.trim().toLowerCase() !== currentUser.email;
  const createdAt = new Date(currentUser.createdAt);
  const hasCreatedAt = Boolean(currentUser.createdAt) && Number.isFinite(createdAt.getTime());

  async function save(event) {
    event.preventDefault();
    if (pending) return;
    setPending("profile"); setFeedback(null);
    try {
      if (!form.name.trim() || form.name.length > 191) throw new Error("Informe um nome válido com até 191 caracteres.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || form.email.length > 191) throw new Error("Informe um e-mail válido com até 191 caracteres.");
      const patch = { name: form.name.trim(), email: form.email.trim().toLowerCase() };
      if (athlete) {
        if (form.birthDate) validateBirthDate(form.birthDate, today);
        if (currentUser.birthDate && !form.birthDate) throw new Error("Informe a data de nascimento.");
        patch.photo = form.photo;
        if (form.birthDate) patch.birthDate = form.birthDate;
      }
      if (emailChanged) patch.currentPassword = form.currentPassword;
      await actions.updateUser({ patch });
      setForm(current => ({ ...current, name: patch.name, email: patch.email, currentPassword: "" }));
      setFeedback({ type: "success", text: "Alterações salvas." });
    } catch (error) { setFeedback({ type: "error", text: error.message || "Não foi possível salvar o perfil." }); }
    finally { setPending(""); }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (pending) return;
    setPending("password"); setPasswordFeedback(null);
    try {
      if (passwords.password.length < 6 || new TextEncoder().encode(passwords.password).length > 72) throw new Error("A nova senha deve ter pelo menos 6 caracteres e no máximo 72 bytes.");
      await actions.updateUser({ patch: passwords });
      setPasswords({ currentPassword: "", password: "" });
      setPasswordFeedback({ type: "success", text: "Senha alterada. Entre novamente para continuar." });
    } catch (error) { setPasswordFeedback({ type: "error", text: error.message || "Não foi possível alterar a senha." }); }
    finally { setPending(""); }
  }

  async function deleteAccount() {
    if (pending || !await confirmAction({ title: "Excluir conta?", label: "Excluir conta",
      description: athlete ? "A exclusão remove sua conta, vínculos, registros esportivos e decisões legais do banco ativo. Cópias já exportadas e backups não são apagados por esta operação." : "A exclusão remove sua conta, decisões legais e todas as equipes e treinos que você criou. Cópias já exportadas e backups não são apagados por esta operação." })) return;
    setPending("delete"); setDeleteFeedback(null);
    try { await actions.deleteUser(); onLogout(); }
    catch (error) { setDeleteFeedback({ type: "error", text: error.message || "Não foi possível excluir a conta." }); }
    finally { setPending(""); }
  }

  function moveTab(event) {
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : ["ArrowRight", "ArrowLeft"].includes(event.key) ? 1 - tab : null;
    if (next === null) return;
    event.preventDefault(); setTab(next); document.getElementById(`${id}-tab-${next}`)?.focus();
  }

  return <div className="profile-page">
    {confirmation}
    <div className="profile-frame">
      <header className="profile-identity">
        <Avatar name={currentUser.name} photo={currentUser.photo} />
        <div className="profile-identity__name"><h2>{currentUser.name}</h2><span className="profile-role" aria-label="Perfil de acesso">{athlete ? "Atleta" : "Treinador"}</span></div>
        {hasCreatedAt && <p className="profile-created">Conta criada em <time dateTime={createdAt.toISOString()}>{createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time></p>}
      </header>
      <div className="profile-tabbar"><div className="profile-tabs" role="tablist" aria-label="Seções do perfil" onKeyDown={moveTab}>
        {tabs.map(({ label, icon: Icon }, index) => <button key={label} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={tab === index} tabIndex={tab === index ? 0 : -1} onClick={() => setTab(index)}><Icon size={17} aria-hidden="true" />{label}</button>)}
      </div></div>
      <div className="profile-content" role="tabpanel" id={`${id}-panel-0`} aria-labelledby={`${id}-tab-0`} hidden={tab !== 0}>
        <ProfileSection title="Informações pessoais" description="Mantenha seus dados de cadastro atualizados.">
          <form className="profile-form" onSubmit={save} aria-busy={pending === "profile"}>
            <fieldset disabled={Boolean(pending)}>
              <label>Nome completo<input required maxLength={191} autoComplete="name" value={form.name} onChange={e => change("name", e.target.value)} /></label>
              <label>E-mail<input required maxLength={191} type="email" autoComplete="email" value={form.email} onChange={e => change("email", e.target.value)} /></label>
              {athlete && <div className="profile-field-pair">
                <label>Iniciais<input maxLength={3} value={form.photo} onChange={e => change("photo", e.target.value.toUpperCase())} /></label>
                <BirthDateField value={form.birthDate} required={Boolean(currentUser.birthDate)} showFormattedDate={false} onChange={value => change("birthDate", value)} />
              </div>}
              {emailChanged && <label>Senha atual para alterar o e-mail<input required type="password" autoComplete="current-password" value={form.currentPassword} onChange={e => change("currentPassword", e.target.value)} /></label>}
              <Feedback value={feedback} />
              <div className="profile-save"><Button type="submit">{pending === "profile" ? "Salvando..." : "Salvar alterações"}</Button></div>
            </fieldset>
          </form>
        </ProfileSection>
      </div>
      <div className="profile-content" role="tabpanel" id={`${id}-panel-1`} aria-labelledby={`${id}-tab-1`} hidden={tab !== 1}>
        <ProfileSection title="Acesso à conta" description="Gerencie sua senha de acesso.">
          <details className="profile-password"><summary><KeyRound size={18} aria-hidden="true" /><span><strong>Alterar senha</strong><small>Encerra as sessões atuais após a alteração.</small></span><ChevronDown size={17} aria-hidden="true" /></summary>
            <form className="profile-form" onSubmit={changePassword} aria-busy={pending === "password"}>
              <fieldset disabled={Boolean(pending)}>
                <label>Senha atual<input required type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={e => setPasswords(current => ({ ...current, currentPassword: e.target.value }))} /></label>
                <label>Nova senha<input required type="password" minLength={6} autoComplete="new-password" aria-describedby={`${id}-password-hint`} value={passwords.password} onChange={e => setPasswords(current => ({ ...current, password: e.target.value }))} /></label>
                <small id={`${id}-password-hint`}>Pelo menos 6 caracteres e no máximo 72 bytes. Após salvar, entre novamente.</small>
                <Feedback value={passwordFeedback} /><Button type="submit" variant="secondary">{pending === "password" ? "Alterando..." : "Alterar senha"}</Button>
              </fieldset>
            </form>
          </details>
        </ProfileSection>
        <PrivacyProfile currentUser={currentUser} />
      </div>
    </div>
    <footer className="profile-delete"><div><h3>Encerrar conta</h3><p>Remova sua conta e os dados associados.</p><Feedback value={deleteFeedback} /></div><Button type="button" variant="ghost" disabled={Boolean(pending)} onClick={deleteAccount}>Excluir conta</Button></footer>
  </div>;
}
