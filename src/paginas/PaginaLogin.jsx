import { Activity, Eye, EyeOff, LogIn, TrendingUp, UserPlus, Users } from "lucide-react";
import { useId, useRef, useState } from "react";
import { PublicHeader } from "../componentes/layout/CabecalhoPublico.jsx";
import { Button } from "../componentes/ui/Botao.jsx";
import { BirthDateField } from "../componentes/ui/CampoNascimento.jsx";
import "../styles/paginasPublicas/LoginPage.css";

const initialLogin = { email: "", password: "", role: "coach" };
const initialRegister = { birthDate: "", name: "", email: "", password: "", role: "coach", consent: false };

function PasswordField({ value, onChange, autoComplete, minLength, disabled }) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  return <div className="auth-field">
    <label htmlFor={inputId}>Senha</label>
    <div className="auth-password">
      <input id={inputId} name="password" type={visible ? "text" : "password"} required minLength={minLength}
        autoComplete={autoComplete} disabled={disabled} value={value} onChange={onChange}
        placeholder={minLength ? "Mínimo de 6 caracteres" : "Digite sua senha"} />
      <button className="auth-password__toggle" type="button" disabled={disabled} aria-controls={inputId}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"} aria-pressed={visible} onClick={() => setVisible(!visible)}>
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </div>
  </div>;
}

export function LoginPage({ onLogin, onRegister, notice }) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const titleId = useId();
  const feedbackId = useId();

  function changeMode(nextMode) {
    if (pending.current) return;
    setMode(nextMode);
    setFeedback("");
  }

  async function submitLogin(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setFeedback("");
    try {
      const result = await onLogin(loginForm);
      setFeedback(result.ok ? "" : result.message);
    } catch (error) {
      setFeedback(error.message || "Não foi possível entrar. Tente novamente.");
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  async function submitRegistro(event) {
    event.preventDefault();
    if (pending.current) return;
    if (!registerForm.consent) {
      setFeedback("Aceite o consentimento LGPD para criar a conta.");
      return;
    }
    pending.current = true;
    setSubmitting(true);
    setFeedback("");
    try {
      const result = await onRegister(registerForm);
      setFeedback(result.ok ? "" : result.message);
    } catch (error) {
      setFeedback(error.message || "Não foi possível criar a conta. Tente novamente.");
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  return <main className="auth-page auth-entry">
    <PublicHeader />
    {notice && <p className="form-feedback auth-notice" role="status">{notice}</p>}
    <section className="auth-hero">
      <div className="auth-copy">
        <span className="eyebrow">Plataforma de desempenho esportivo</span>
        <h1>Transforme desempenho em <span>evolução.</span></h1>
        <p>Gerencie sua equipe, acompanhe treinamentos e analise a evolução dos atletas em uma única plataforma.</p>
        <ul className="auth-features" aria-label="Recursos da plataforma">
          <li><Users size={22} aria-hidden="true" /><span>Gestão de equipes</span></li>
          <li><Activity size={22} aria-hidden="true" /><span>Treinamentos</span></li>
          <li><TrendingUp size={22} aria-hidden="true" /><span>Evolução dos atletas</span></li>
        </ul>
      </div>

      {mode === "login" ? <form key="login" className="auth-form" onSubmit={submitLogin} aria-labelledby={titleId}
        aria-describedby={feedback ? feedbackId : undefined} aria-busy={submitting}>
        <div className="form-header">
          <h2 id={titleId}>Bem-vindo de volta</h2>
          <p>Entre na sua conta para acompanhar sua equipe e seus resultados.</p>
        </div>
        <fieldset className="auth-fields" disabled={submitting}>
          <label>E-mail
            <input name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="seuemail@exemplo.com" required type="email"
              value={loginForm.email} onChange={event => setLoginForm(current => ({ ...current, email: event.target.value }))} />
          </label>
          <PasswordField autoComplete="current-password" value={loginForm.password} disabled={submitting}
            onChange={event => setLoginForm(current => ({ ...current, password: event.target.value }))} />
          <label>Perfil
            <select name="role" value={loginForm.role} onChange={event => setLoginForm(current => ({ ...current, role: event.target.value }))}>
              <option value="coach">Treinador</option><option value="athlete">Atleta</option>
            </select>
          </label>
        </fieldset>
        {feedback && <p className="form-feedback" id={feedbackId} role="alert">{feedback}</p>}
        <Button disabled={submitting} icon={LogIn} type="submit">{submitting ? "Entrando..." : "Entrar"}</Button>
        <div className="auth-alternative">
          <span>Ainda não tem uma conta?</span>
          <Button disabled={submitting} icon={UserPlus} onClick={() => changeMode("register")} type="button" variant="ghost">Criar conta</Button>
        </div>
      </form> : <form key="register" className="auth-form" onSubmit={submitRegistro} aria-labelledby={titleId}
        aria-describedby={feedback ? feedbackId : undefined} aria-busy={submitting}>
        <div className="form-header">
          <h2 id={titleId}>Crie sua conta</h2>
          <p>Comece a registrar treinos e acompanhar a evolução esportiva.</p>
        </div>
        <fieldset className="auth-fields" disabled={submitting}>
          <label>Perfil
            <select name="role" value={registerForm.role} onChange={event => setRegisterForm(current => ({ ...current, role: event.target.value }))}>
              <option value="athlete">Atleta</option><option value="coach">Treinador</option>
            </select>
          </label>
          <label>Nome completo
            <input name="name" autoComplete="name" placeholder="Digite seu nome completo" required value={registerForm.name}
              onChange={event => setRegisterForm(current => ({ ...current, name: event.target.value }))} />
          </label>
          <label>E-mail
            <input name="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="email@exemplo.com" required type="email"
              value={registerForm.email} onChange={event => setRegisterForm(current => ({ ...current, email: event.target.value }))} />
          </label>
          <PasswordField autoComplete="new-password" minLength={6} value={registerForm.password} disabled={submitting}
            onChange={event => setRegisterForm(current => ({ ...current, password: event.target.value }))} />
          {registerForm.role === "athlete" && <BirthDateField value={registerForm.birthDate} required
            onChange={birthDate => setRegisterForm(current => ({ ...current, birthDate }))} />}
          <label className="checkbox-line">
            <input name="consent" type="checkbox" checked={registerForm.consent}
              onChange={event => setRegisterForm(current => ({ ...current, consent: event.target.checked }))} />
            <span>Autorizo o tratamento dos meus dados para fins de gestão esportiva.</span>
          </label>
        </fieldset>
        {feedback && <p className="form-feedback" id={feedbackId} role="alert">{feedback}</p>}
        <Button disabled={submitting} icon={UserPlus} type="submit">{submitting ? "Criando..." : "Criar conta"}</Button>
        <div className="auth-alternative">
          <span>Já tem uma conta?</span>
          <Button disabled={submitting} icon={LogIn} onClick={() => changeMode("login")} type="button" variant="ghost">Voltar ao login</Button>
        </div>
      </form>}
    </section>
  </main>;
}
