import { PositionProfileSettings } from "../../componentes/ui/AvaliacaoPosicao.jsx";
import { normalizeModality } from "../../../shared/criteria.js";
import {
  Clipboard,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2
} from "lucide-react";

import { useEffect, useState } from "react";
import { Button } from "../../componentes/ui/Botao.jsx";
import { useConfirmation } from "../../componentes/ui/Confirmacao.jsx";
import { CollapsiblePanel } from "../../componentes/ui/PainelRetratil.jsx";
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
  state,
  team,
  onDeleted,
  view = "team"
}) {
  const [formTime, setFormTime] = useState({
    name: team?.name || "",
    modality: team?.modality || "Futebol"
  });

  const [nomeObjetivo, setNomeObjetivo] = useState("");
  const [nomeQualitativo, setNomeQualitativo] = useState("");
  const [mensagem, setMensagem] = useState(null);
  const [savingTeam, setSavingTeam] = useState(false);
  const { confirmAction, confirmation } = useConfirmation();

  useEffect(() => {
    setFormTime({
      name: team?.name || "",
      modality: team?.modality || "Futebol"
    });
  }, [team?.id, team?.name, team?.modality]);

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

  async function excluirTime() {
    if (!team) return;

    if (!await confirmAction({ title: "Excluir equipe?", label: "Excluir equipe",
      description: `A exclusão de ${team.name} remove os vínculos de atletas, as solicitações e os treinos da equipe.` })) return;

    try {
      await actions.deleteTeam({
        teamId: team.id
      });
      setMensagem({ area: "team", type: "success", text: "Equipe excluída." });
      onDeleted?.();
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

  async function copiarCodigo() {
    try {
      if (!navigator.clipboard) throw new Error("Copie o código exibido na página.");
      await navigator.clipboard.writeText(team.code);
      setMensagem({ area: "team", type: "success", text: "Código copiado." });
    } catch (error) { setMensagem({ area: "team", type: "error", text: error.message || "Não foi possível copiar o código." }); }
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
      {confirmation}
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

      {["team", "evaluations"].includes(view) && !team && <p className="empty-content">Selecione ou crie uma equipe para ajustar suas configurações.</p>}
      {view === "evaluations" && team && (
        <CollapsiblePanel title="Avaliação de Treinos" eyebrow="Critérios" className="settings-panel criteria-panel">
          {normalizeModality(team.modality) === "Futsal" && <PositionProfileSettings team={team} actions={actions} />}
          {normalizeModality(team.modality) !== "Futsal" && <div className="criteria-grid">
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

            {normalizeModality(team.modality) !== "Futsal" && <GerenciarCriterio
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
            />}
          </div>}
          {feedbackPara("criteria")}
        </CollapsiblePanel>
      )}


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

export function EvaluationSettingsPage(props) {
  return <SettingsPage {...props} view="evaluations" />;
}
