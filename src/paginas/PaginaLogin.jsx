import { LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { PublicHeader } from "../componentes/layout/CabecalhoPublico.jsx";
import { Button } from "../componentes/ui/Botao.jsx";
import { BirthDateField } from "../componentes/ui/CampoNascimento.jsx";
import "../styles/paginasPublicas/LoginPage.css";

const initialLogin = {
  email: "",
  password: "",
  role: "coach",
};

const initialRegister = {
  birthDate: "",
  name: "",
  email: "",
  password: "",
  role: "coach",
  consent: false,
};

export function LoginPage({ onLogin, onRegister, notice }) {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitLogin(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      const result = await onLogin(loginForm);
      setFeedback(result.ok ? "" : result.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRegistro(event) {
    event.preventDefault();

    if (!registerForm.consent) {
      setFeedback("Aceite o consentimento LGPD para criar a conta.");
      return;
    }

    try {
      setSubmitting(true);
      const result = await onRegister(registerForm);
      setFeedback(result.ok ? "" : result.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <PublicHeader />
      {notice && <p className="form-feedback" role="status">{notice}</p>}

      <section className="auth-hero">
        <div className="auth-copy">
          <span className="eyebrow">
            Plataforma de desempenho esportivo
          </span>

          <h1>
            Transforme dados
            <br />
            em gráficos.
          </h1>

          <p>
            Registre treinos, acompanhe atletas e visualize a evolução da sua
            equipe através de métricas, dashboards e indicadores de desempenho.
          </p>

          <div className="auth-actions">
            <Button
              icon={LogIn}
              onClick={() => {
                setMode("login");
                setFeedback("");
              }}
              type="button"
            >
              Fazer login
            </Button>

            <Button
              icon={UserPlus}
              onClick={() => {
                setMode("register");
                setFeedback("");
              }}
              type="button"
              variant="secondary"
            >
              Criar conta
            </Button>
          </div>
        </div>

        {mode === "login" ? (
          <form className="auth-form" onSubmit={submitLogin}>
            <div className="form-header">
              <strong>Bem-vindo de volta</strong>

              <span>
                Entre para acessar sua equipe, atletas e relatórios.
              </span>
            </div>

            <label>
              E-mail
              <input
                placeholder="seuemail@exemplo.com"
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
                type="email"
                value={loginForm.email}
              />
            </label>

            <label>
              Senha
              <input
                placeholder="Digite sua senha"
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
                type="password"
                value={loginForm.password}
              />
            </label>

            <label>
              Perfil
              <select
                onChange={(event) =>
                  setLoginForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                value={loginForm.role}
              >
                <option value="coach">Treinador</option>
                <option value="athlete">Atleta</option>
              </select>
            </label>

            {feedback && (
              <p className="form-feedback">
                {feedback}
              </p>
            )}

            <Button disabled={submitting} icon={LogIn} type="submit">
              {submitting ? "Entrando..." : "Acessar painel"}
            </Button>

            <Button
              icon={UserPlus}
              onClick={() => {
                setMode("register");
                setFeedback("");
              }}
              type="button"
              variant="ghost"
            >
              Criar nova conta
            </Button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitRegistro}>
            <div className="form-header">
              <strong>Crie sua conta</strong>

              <span>
                Comece a registrar treinos e acompanhar evolução esportiva.
              </span>
            </div>

            <label>
              Perfil
              <select
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
                value={registerForm.role}
              >
                <option value="athlete">Atleta</option>
                <option value="coach">Treinador</option>
              </select>
            </label>

            <label>
              Nome completo
              <input
                placeholder="Digite seu nome completo"
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
                value={registerForm.name}
              />
            </label>

            <label>
              E-mail
              <input
                placeholder="email@exemplo.com"
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
                type="email"
                value={registerForm.email}
              />
            </label>

            <label>
              Senha
              <input
                placeholder="Mínimo de 6 caracteres"
                minLength="6"
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
                type="password"
                value={registerForm.password}
              />
            </label>

            {registerForm.role === "athlete" && (
              <BirthDateField
                value={registerForm.birthDate}
                onChange={(birthDate) => setRegisterForm((current) => ({ ...current, birthDate }))}
                required
              />
            )}

            <label className="checkbox-line">
              <input
                checked={registerForm.consent}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    consent: event.target.checked,
                  }))
                }
                type="checkbox"
              />

              <span>
                Autorizo o tratamento dos meus dados para fins de gestão
                esportiva.
              </span>
            </label>

            {feedback && (
              <p className="form-feedback">
                {feedback}
              </p>
            )}

            <Button disabled={submitting} icon={UserPlus} type="submit">
              {submitting ? "Criando..." : "Criar conta"}
            </Button>

            <Button
              icon={LogIn}
              onClick={() => {
                setMode("login");
                setFeedback("");
              }}
              type="button"
              variant="ghost"
            >
              Voltar ao login
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
