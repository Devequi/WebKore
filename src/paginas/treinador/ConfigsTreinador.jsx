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
  team
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

  useEffect(() => {
    setFormConta({
      name: currentUser.name,
      email: currentUser.email,
      password: ""
    });
  }, [currentUser]);

  useEffect(() => {
    setFormTime({
      name: team?.name || "",
      modality: team?.modality || "Futebol"
    });
  }, [team]);

  async function salvarConta(event) {
    event.preventDefault();

    try {
      await actions.updateUser({
        userId: currentUser.id,
        patch: {
          name: formConta.name,
          email: formConta.email,
          ...(formConta.password ? { password: formConta.password } : {})
        }
      });
      setFormConta((current) => ({ ...current, password: "" }));
      setMensagem({ area: "account", type: "success", text: "Conta atualizada." });
    } catch (error) {
      setMensagem({ area: "account", type: "error", text: error.message || "Não foi possível atualizar a conta." });
    }
  }

  async function salvarTime(event) {
    event.preventDefault();

    if (!team) return;

    try {
      await actions.updateTeam({
        teamId: team.id,
        patch: formTime
      });
      setMensagem({ area: "team", type: "success", text: "Equipe atualizada." });
    } catch (error) {
      setMensagem({ area: "team", type: "error", text: error.message || "Não foi possível atualizar a equipe." });
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
      <p className={`form-feedback form-feedback--${mensagem.type}`} role="status">
        {mensagem.text}
      </p>
    ) : null;
  }

  return (
    <div className="page-stack">
      {!team && feedbackPara("team")}
      {team && (
        <section className="panel settings-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Equipe</span>
              <h2>Configuracoes da equipe</h2>
            </div>
          </div>

          <div className="settings-grid">
            <form
              className="settings-form"
              onSubmit={salvarTime}
            >
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
                Salvar equipe
              </Button>
            </form>

            <div className="privacy-box">
              <ShieldCheck size={28} />

              <strong>Codigo de acesso</strong>

              <p>{team.code}</p>

              <div className="settings-actions">
                <Button
                  icon={Clipboard}
                  onClick={copiarCodigo}
                  type="button"
                  variant="secondary"
                >
                  Copiar codigo
                </Button>

                <Button
                  icon={Trash2}
                  onClick={excluirTime}
                  type="button"
                  variant="danger"
                >
                  Excluir equipe
                </Button>
              </div>
            </div>
          </div>
          {feedbackPara("team")}
        </section>
      )}

      {team && (
        <section className="panel settings-panel criteria-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Criterios</span>
              <h2>Avaliacao do treino</h2>
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

      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Conta</span>
            <h2>Configuracoes da conta</h2>
          </div>
        </div>

        <div className="settings-grid">
          <form
            className="settings-form"
            onSubmit={salvarConta}
          >
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
                type="email"
                value={formConta.email}
              />
            </label>

            <label>
              Nova senha

              <input
                minLength="6"
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
              Salvar conta
            </Button>
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
                Exportar relatorio
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
      </section>
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
