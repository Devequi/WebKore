import {
  ChevronDown,
  Clipboard,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2
} from "lucide-react";

import { useEffect, useState } from "react";
import { Button } from "../../componentes/ui/Botao.jsx";
import { CoachProfileOverview } from "./PerfilTreinador.jsx";
import { downloadTeamReport } from "../../services/reports.js";
import "../../styles/paginasTreinador/ConfigsTreinador.css";

const modalidades = [
  "Futebol",
  "Vôlei",
  "Basquete",
  "Futsal",
  "Handebol"
];

export function SettingsPage({
  actions,
  currentUser,
  onLogout,
  state,
  team,
  view = "team"
}) {
  const [formConta, setFormConta] = useState({
    name: currentUser.name,
    email: currentUser.email,
    password: ""
  });

  const [formTime, setFormTime] = useState({
    name: team?.name || "",
    modality: team?.modality || "Futebol"
  });

  const [nomeObjetivo, setNomeObjetivo] = useState("");
  const [nomeQualitativo, setNomeQualitativo] = useState("");
  const [mensagem, setMensagem] = useState(null);
  const [criteriosAbertos, setCriteriosAbertos] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);

  useEffect(() => {
    setFormConta({
      name: currentUser.name,
      email: currentUser.email,
      password: ""
    });
  }, [currentUser.id, currentUser.name, currentUser.email]);

  useEffect(() => {
    setFormTime({
      name: team?.name || "",
      modality: team?.modality || "Futebol"
    });
  }, [team?.id, team?.name, team?.modality]);

  async function salvarConta(event) {
    event.preventDefault();
    if (savingAccount) return;
    setSavingAccount(true);
    setMensagem(null);
    try {
      if (!formConta.name.trim() || formConta.name.length > 191) throw new Error("Informe um nome válido com até 191 caracteres.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formConta.email.trim())) throw new Error("Informe um e-mail válido.");
      if (formConta.password && (formConta.password.length < 6 || new TextEncoder().encode(formConta.password).length > 72)) throw new Error("A nova senha deve ter pelo menos 6 caracteres e no máximo 72 bytes.");
      await actions.updateUser({
        userId: currentUser.id,
        patch: {
          name: formConta.name.trim(),
          email: formConta.email.trim().toLowerCase(),
          ...(formConta.password ? { password: formConta.password } : {})
        }
      });
      setFormConta((current) => ({ ...current, password: "" }));
      setMensagem({ area: "account", type: "success", text: "Conta atualizada." });
    } catch (error) {
      setMensagem({ area: "account", type: "error", text: error.message || "Não foi possível atualizar a conta." });
    } finally {
      setSavingAccount(false);
    }
  }

  async function salvarTime(event) {
    event.preventDefault();

    if (!team) return;
    if (savingTeam) return;
    setSavingTeam(true);
    setMensagem(null);
    try {
      if (!formTime.name.trim()) throw new Error("Informe o nome da equipe.");
      await actions.updateTeam({
        teamId: team.id,
        patch: formTime
      });
      setMensagem({ area: "team", type: "success", text: "Equipe atualizada." });
    } catch (error) {
      setMensagem({ area: "team", type: "error", text: error.message || "Não foi possível atualizar a equipe." });
    } finally {
      setSavingTeam(false);
    }
  }

  async function excluirConta() {
    if (
      !confirm(
        "Excluir sua conta tambem remove todas as equipes criadas por voce. Deseja continuar?"
      )
    ) {
      return;
    }

    try {
      await actions.deleteUser({
        userId: currentUser.id
      });
      onLogout();
    } catch (error) {
      setMensagem({ area: "account", type: "error", text: error.message || "Não foi possível excluir a conta." });
    }
  }

  async function excluirTime() {
    if (!team) return;

    if (
      !confirm(
        `Excluir "${team.name}" remove atletas vinculados, solicitacoes e treinos desta equipe. Deseja continuar?`
      )
    ) {
      return;
    }

    try {
      await actions.deleteTeam({
        teamId: team.id
      });
      setMensagem({ area: "team", type: "success", text: "Equipe excluída." });
    } catch (error) {
      setMensagem({ area: "team", type: "error", text: error.message || "Não foi possível excluir a equipe." });
    }
  }

  async function adicionarCriterio(event, tipo) {
    event.preventDefault();

    const nome =
      tipo === "objective"
        ? nomeObjetivo
        : nomeQualitativo;

    try {
      await actions.addCriterion({
        teamId: team.id,
        kind: tipo,
        name: nome
      });
      setMensagem({ area: "criteria", type: "success", text: "Critério adicionado." });
    } catch (error) {
      setMensagem({ area: "criteria", type: "error", text: error.message || "Não foi possível adicionar o critério." });
      return;
    }

    if (tipo === "objective") {
      setNomeObjetivo("");
    }

    if (tipo === "qualitative") {
      setNomeQualitativo("");
    }
  }

  async function removerCriterio(kind, name) {
    try {
      await actions.removeCriterion({ teamId: team.id, kind, name });
      setMensagem({ area: "criteria", type: "success", text: "Critério removido." });
    } catch (error) {
      setMensagem({ area: "criteria", type: "error", text: error.message || "Não foi possível remover o critério." });
    }
  }

  async function renomearCriterio(kind, previousName, nextName) {
    try {
      await actions.renameCriterion({ teamId: team.id, kind, previousName, nextName });
      setMensagem({ area: "criteria", type: "success", text: "Critério renomeado." });
    } catch (error) {
      setMensagem({ area: "criteria", type: "error", text: error.message || "Não foi possível renomear o critério." });
    }
  }

  function copiarCodigo() {
    if (team?.code) {
      navigator.clipboard?.writeText(team.code);
    }
  }

  function feedbackPara(area) {
    return mensagem?.area === area ? (
      <p className={`form-feedback form-feedback--${mensagem.type}`} role={mensagem.type === "error" ? "alert" : "status"}>
        {mensagem.text}
      </p>
    ) : null;
  }

  return (
    <div className="page-stack coach-experience coach-settings">
      {view === "profile" && <CoachProfileOverview currentUser={currentUser} state={state} />}
      {!team && feedbackPara("team")}
      {view === "team" && team && (
        <section className="panel settings-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Equipe</span>
              <h2>Configurações da equipe</h2>
            </div>
          </div>

          <div className="settings-grid">
            <form
              className="settings-form"
              onSubmit={salvarTime}
              aria-busy={savingTeam}
            >
              <fieldset className="athlete-profile-fields" disabled={savingTeam}>
              <label>
                Nome da equipe

                <input
                  onChange={(event) =>
                    setFormTime((current) => ({
                      ...current,
                      name: event.target.value
                    }))
                  }
                  required
                  maxLength={191}
                  value={formTime.name}
                />
              </label>

              <label>
                Modalidade esportiva

                <select
                  onChange={(event) =>
                    setFormTime((current) => ({
                      ...current,
                      modality: event.target.value
                    }))
                  }
                  value={formTime.modality}
                >
                  {modalidades.map((modalidade) => (
                    <option key={modalidade}>
                      {modalidade}
                    </option>
                  ))}
                </select>
              </label>

              <Button
                icon={Save}
                type="submit"
              >
                {savingTeam ? "Salvando..." : "Salvar equipe"}
              </Button>
              </fieldset>
            </form>

            <div className="privacy-box">
              <ShieldCheck size={28} />

              <strong>Código de acesso</strong>

              <p>{team.code}</p>

              <div className="settings-actions">
                <Button
                  icon={Clipboard}
                  onClick={copiarCodigo}
                  type="button"
                  variant="secondary"
                >
                  Copiar código
                </Button>

                <Button
                  icon={Trash2}
                  onClick={excluirTime}
                  type="button"
                  variant="danger"
                >
                  Excluir equipe
                </Button>
                <Button icon={RefreshCw} onClick={() => downloadTeamReport(state, team)} type="button" variant="secondary">Exportar relatório</Button>
              </div>
            </div>
          </div>
          {feedbackPara("team")}
        </section>
      )}

      {view === "team" && !team && <p className="empty-content">Selecione ou crie uma equipe para ajustar suas configurações.</p>}
      {view === "team" && team && (
        <section className="panel settings-panel criteria-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Critérios</span>
              <h2>Avaliação do treino</h2>
            </div>
            <button
              aria-controls="trainer-criteria-content"
              aria-expanded={criteriosAbertos}
              aria-label={criteriosAbertos ? "Recolher critérios" : "Expandir critérios"}
              className="criteria-toggle"
              onClick={() => setCriteriosAbertos((abertos) => !abertos)}
              type="button"
            >
              <ChevronDown aria-hidden="true" size={20} />
            </button>
          </div>

          <div
            className={`criteria-collapse ${criteriosAbertos ? "is-open" : ""}`}
            id="trainer-criteria-content"
            inert={!criteriosAbertos}
            aria-hidden={!criteriosAbertos}
          >
          <div className="criteria-grid">
            <GerenciarCriterio
              criteria={team.objectiveCriteria || []}
              newName={nomeObjetivo}
              onAdd={(event) =>
                adicionarCriterio(event, "objective")
              }
              onChangeNew={setNomeObjetivo}
              onRemove={(name) => removerCriterio("objective", name)}
              onRename={(nomeAntigo, nomeNovo) => renomearCriterio("objective", nomeAntigo, nomeNovo)}
              title="Objetivos"
            />

            <GerenciarCriterio
              criteria={team.qualitativeCriteria || []}
              newName={nomeQualitativo}
              onAdd={(event) =>
                adicionarCriterio(event, "qualitative")
              }
              onChangeNew={setNomeQualitativo}
              onRemove={(name) => removerCriterio("qualitative", name)}
              onRename={(nomeAntigo, nomeNovo) => renomearCriterio("qualitative", nomeAntigo, nomeNovo)}
              title="Qualitativos"
              maxCriteria={4}
            />
          </div>
          </div>
          {feedbackPara("criteria")}
        </section>
      )}

      {view === "profile" && <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Conta</span>
            <h2>Editar perfil</h2>
          </div>
        </div>

        <div className="settings-grid">
          <form
            className="settings-form"
            onSubmit={salvarConta}
            aria-busy={savingAccount}
          >
            <fieldset className="athlete-profile-fields" disabled={savingAccount}>
            <label>
              Nome completo

              <input
                onChange={(event) =>
                  setFormConta((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
                required
                maxLength={191}
                autoComplete="name"
                value={formConta.name}
              />
            </label>

            <label>
              E-mail

              <input
                onChange={(event) =>
                  setFormConta((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
                required
                maxLength={191}
                autoComplete="email"
                type="email"
                value={formConta.email}
              />
            </label>

            <label>
              Nova senha

              <input
                minLength="6"
                autoComplete="new-password"
                onChange={(event) =>
                  setFormConta((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
                placeholder="Digite uma senha forte"
                type="password"
                value={formConta.password}
              />
            </label>

            <Button
              icon={Save}
              type="submit"
            >
              {savingAccount ? "Salvando..." : "Salvar conta"}
            </Button>
            </fieldset>
          </form>

          <div className="privacy-box">
            <ShieldCheck size={28} />

            <strong>Privacidade por perfil</strong>

            <div className="settings-actions">
              <Button
                disabled={!team}
                icon={RefreshCw}
                onClick={() =>
                  downloadTeamReport(state, team)
                }
                type="button"
                variant="secondary"
              >
                Exportar relatório
              </Button>

              <Button
                icon={LogOut}
                onClick={onLogout}
                type="button"
                variant="ghost"
              >
                Logout
              </Button>

              <Button
                icon={Trash2}
                onClick={excluirConta}
                type="button"
                variant="danger"
              >
                Excluir conta
              </Button>
            </div>
          </div>
        </div>
        {feedbackPara("account")}
      </section>}
    </div>
  );
}

function GerenciarCriterio({
  criteria,
  newName,
  onAdd,
  onChangeNew,
  onRemove,
  onRename,
  title,
  maxCriteria = Infinity
}) {
  const [editando, setEditando] = useState({});

  function salvarNome(nomeAntigo) {
    onRename(
      nomeAntigo,
      editando[nomeAntigo] || nomeAntigo
    );

    setEditando((current) => {
      const {
        [nomeAntigo]: _removido,
        ...resto
      } = current;

      return resto;
    });
  }

  return (
    <div className="criteria-column">
      <h3>{title}</h3>

      <form
        className="criterion-add-form"
        onSubmit={onAdd}
      >
        <input
          aria-label={`Novo critério: ${title.toLowerCase()}`}
          onChange={(event) =>
            onChangeNew(event.target.value)
          }
          placeholder="Novo critério"
          required
          value={newName}
        />

        <Button
          disabled={criteria.length >= maxCriteria}
          icon={Plus}
          type="submit"
          variant="secondary"
        >
          Adicionar
        </Button>
      </form>

      <div className="criteria-list">
        {criteria.length > maxCriteria && <p className="form-feedback" role="status">Há critérios antigos acima do limite. Somente as quatro primeiras notas são suportadas pelo banco; os dados antigos foram preservados.</p>}
        {criteria.map((criterio) => (
          <article
            className="criterion-row"
            key={criterio}
          >
            <input
              aria-label={`Editar ${criterio}`}
              onChange={(event) =>
                setEditando((current) => ({
                  ...current,
                  [criterio]: event.target.value
                }))
              }
              value={editando[criterio] ?? criterio}
            />

            <Button
              icon={Save}
              onClick={() =>
                salvarNome(criterio)
              }
              type="button"
              variant="ghost"
            >
              Salvar
            </Button>

            <Button
              icon={Trash2}
              onClick={() =>
                onRemove(criterio)
              }
              type="button"
              variant="danger"
            >
              Remover
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
