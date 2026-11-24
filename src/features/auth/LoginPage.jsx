import { Eye, EyeOff } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "../../components/ui/Button.jsx";
import { BirthDateField } from "../../components/ui/BirthDateField.jsx";
import { LegalLinks, RegistrationPrivacy } from "../privacy/Privacy.jsx";
import "./LoginPage.css";

const initialLogin = { email: "", password: "", role: "coach" };
const initialRegister = { birthDate: "", name: "", email: "", password: "", role: "coach", legal: null };

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
    if (!registerForm.legal?.acceptTerms || !registerForm.legal?.acknowledgePrivacy) {
      setFeedback("Consulte os documentos e confirme separadamente os Termos e a ciência da Política.");
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

  return <main className={`auth-page auth-entry auth-entry--${mode}`}>
    {notice && <p className="form-feedback auth-notice" role="status">{notice}</p>}
    <section className="auth-hero">
      {mode === "login" ? <form key="login" className="auth-form auth-form--login" onSubmit={submitLogin} aria-labelledby={titleId}
        aria-describedby={feedback ? feedbackId : undefined} aria-busy={submitting}>
        <div className="form-header">
          <img className="login-mark" src="/icons/logoWK.png" alt="WebKore" />
          <h2 id={titleId}>Bem-vindo de volta</h2>
          <p>Entre na sua conta WebKore.</p>
        </div>
        <fieldset className="auth-fields" disabled={submitting}>
          <label>E-mail
            <input name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Seu e-mail" required type="email"
              value={loginForm.email} onChange={event => setLoginForm(current => ({ ...current, email: event.target.value }))} />
          </label>
          <PasswordField autoComplete="current-password" value={loginForm.password} disabled={submitting}
            onChange={event => setLoginForm(current => ({ ...current, password: event.target.value }))} />
          <label>Tipo de conta
            <select name="role" value={loginForm.role} onChange={event => setLoginForm(current => ({ ...current, role: event.target.value }))}>
              <option value="coach">Treinador</option><option value="athlete">Atleta</option>
            </select>
          </label>
        </fieldset>
        {feedback && <p className="form-feedback" id={feedbackId} role="alert">{feedback}</p>}
        <Button disabled={submitting} type="submit">{submitting ? "Entrando..." : "Entrar"}</Button>
        <p className="login-signup">Não tem conta? <button type="button" aria-label="Criar conta" disabled={submitting} onClick={() => changeMode("register")}>Criar</button></p>
      </form> : <form key="register" className="auth-form auth-form--register" onSubmit={submitRegistro} aria-labelledby={titleId}
        aria-describedby={feedback ? feedbackId : undefined} aria-busy={submitting}>
        <section className="register-account" aria-labelledby={titleId}>
          <div className="form-header">
            <img className="login-mark" src="/icons/logoWK.png" alt="WebKore" />
            <h2 id={titleId}>Crie sua conta</h2>
            <p>Preencha seus dados para começar.</p>
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
          </fieldset>
        </section>
        <fieldset className="auth-fields register-confirmations" disabled={submitting}>
          <legend>Privacidade e confirmações</legend>
          <RegistrationPrivacy role={registerForm.role} birthDate={registerForm.birthDate} value={registerForm.legal} onChange={legal => setRegisterForm(current => ({ ...current, legal }))} />
          {feedback && <p className="form-feedback" id={feedbackId} role="alert">{feedback}</p>}
          <div className="register-actions">
            <Button disabled={submitting} type="submit">{submitting ? "Criando..." : "Criar conta"}</Button>
            <Button disabled={submitting} onClick={() => changeMode("login")} type="button" variant="ghost">Voltar ao login</Button>
          </div>
        </fieldset>
      </form>}
    </section>
    {mode === "login" && <LegalLinks />}
  </main>;
}
