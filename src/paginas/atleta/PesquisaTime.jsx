import { Search, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { Button } from "../../componentes/ui/Botao.jsx";
import "../../styles/paginasAtleta/PesquisaTime.css";

export function TeamSearch({ actions, athleteId, state }) {
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [remoteTeam, setRemoteTeam] = useState(null);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (!code.trim()) { setRemoteTeam(null); setSearching(false); return; }
    let active = true;
    const controller = new AbortController();
    setRemoteTeam(null);
    setSearching(true);
    const timer = setTimeout(() => {
      api.searchTeam(code, { signal: controller.signal }).then((teams) => { if (active) setRemoteTeam(teams[0] || null); })
        .catch((error) => { if (active) setFeedback({ type: "error", text: error.message }); })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [code]);

  const procurarTime = remoteTeam;

  const entradaTime = procurarTime
    ? state.memberships.find(
        (item) =>
          item.teamId === procurarTime.id &&
          item.athleteId === athleteId
      )
    : null;

  const treinador = procurarTime
    ? procurarTime.coach || state.users.find(
        (user) => user.id === procurarTime.coachId
      )
    : null;

  async function solicitarEntrada() {
    setSubmitting(true);
    setFeedback(null);
    try {
      await actions.requestJoin({ athleteId, code });
      setFeedback({ type: "success", text: "Solicitação enviada ao treinador." });
    } catch (error) {
      setFeedback({ type: "error", text: error.message || "Não foi possível solicitar entrada." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="search-page">
      <div className="panel search-panel">
        <div className="section-heading">
          <div>
            <h2>Buscar equipe por código</h2>
          </div>
        </div>

        <label>
          Código da equipe

          <div className="search-input">
            <Search size={18} />

            <input
              onChange={(event) => {
                setCode(event.target.value);
                setFeedback(null);
              }}
              placeholder="EX: WK-TEAM-404"
              value={code}
            />
          </div>
        </label>

        {procurarTime ? (
          <article className="team-result">
            <span>{procurarTime.modality}</span>

            <h3>{procurarTime.name}</h3>

            <p>
              Treinador: {treinador?.name}
            </p>

            <Button
              disabled={
                submitting ||
                entradaTime?.status === "approved" ||
                entradaTime?.status === "pending"
              }
              icon={Send}
              onClick={solicitarEntrada}
              type="button"
            >
              {submitting
                ? "Enviando..."
                : entradaTime?.status === "approved"
                ? "Equipe aprovada"
                : entradaTime?.status === "pending"
                  ? "Solicitação enviada"
                  : "Solicitar entrada"}
            </Button>
          </article>
        ) : searching ? <p role="status">Buscando equipe...</p> : feedback?.type === "error" ? null : code.trim() ? (
          <div className="empty-state">
            <strong>Equipe não encontrada</strong>

            <p>
              Confira se o código informado é o mesmo fornecido pelo treinador.
            </p>
          </div>
        ) : (
          <p className="search-hint">Digite o código recebido do treinador para localizar a equipe.</p>
        )}
        {feedback && (
          <p className={`form-feedback form-feedback--${feedback.type}`} role="status">
            {feedback.text}
          </p>
        )}
      </div>
    </section>
  );
}
