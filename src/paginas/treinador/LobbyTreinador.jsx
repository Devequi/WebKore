import { Clipboard, Plus } from "lucide-react";
import { useState } from "react";
import { PublicHeader } from "../../componentes/layout/CabecalhoPublico.jsx";
import { Button } from "../../componentes/ui/Botao.jsx";
import "../../styles/paginasTreinador/LobbyTreinador.css";

export function CoachLobby({
  actions,
  currentUser,
  onLogout,
  onOpenTeam,
  state,
  teams: times
}) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    modality: "Futsal"
  });

  async function criarTime(event) {
    event.preventDefault();

    if (creating || !form.name.trim()) return;
    setCreating(true);

    try {
      await actions.createTeam({
        ...form,
        coachId: currentUser.id
      });
    } catch (error) {
      alert(error.message || "Nao foi possivel criar a equipe.");
      return;
    } finally {
      setCreating(false);
    }

    setForm({
      name: "",
      modality: "Futsal"
    });
  }

  function copiarCodigo(code) {
    navigator.clipboard?.writeText(code);
  }

  const atletasPorTime = new Map(
    times.map((time) => [
      time.id,
      state.memberships.filter((item) => item.teamId === time.id && item.status === "approved")
    ])
  );
  const totalAtletas = new Set(
    [...atletasPorTime.values()].flat().map((item) => item.athleteId)
  ).size;

  const modalidades = new Set(
    times.map((time) => time.modality)
  ).size;

  return (
    <main className="lobby-page">
      <PublicHeader onLogout={onLogout} />

      <section className="lobby-hero">
        <div>
          <h1>Olá, {currentUser.name}</h1>

          <p>
            Gerencie equipes, acompanhe atletas e acesse
            os painéis de desempenho do WebKore.
          </p>
        </div>
      </section>

      <section className="lobby-stats">
        <article className="stat-card">
          <span>Equipes</span>
          <strong>{times.length}</strong>
        </article>

        <article className="stat-card">
          <span>Atletas</span>
          <strong>{totalAtletas}</strong>
        </article>

        <article className="stat-card">
          <span>Modalidades</span>
          <strong>{modalidades}</strong>
        </article>
      </section>

      <section className="dashboard-grid--lobby">
        <form
          className="create-team-form"
          onSubmit={criarTime}
        >
          <h2>Criar equipe</h2>

          <label>
            Nome da equipe

            <input
              placeholder="Ex: ETEC Araras Sub-18"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
            />
          </label>

          <label>
            Modalidade

            <select
              value={form.modality}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  modality: event.target.value
                }))
              }
            >
              <option>Futsal</option>
              <option>Futebol</option>
              <option>Vôlei</option>
              <option>Basquete</option>
              <option>Handebol</option>
            </select>
          </label>

          <Button
            disabled={creating}
            icon={Plus}
            type="submit"
          >
            {creating ? "Criando..." : "Criar equipe"}
          </Button>
        </form>

        <div className="team-card-grid">
          {times.map((time) => (
            <article
              className="team-card"
              key={time.id}
            >
              <span className="modality-badge">
                {time.modality}
              </span>

              <h2>{time.name}</h2>

              <div className="team-info">
                <div>
                  <strong>Código</strong>
                  <p>{time.code}</p>
                </div>

                <div>
                  <strong>Atletas</strong>
                  <p>{atletasPorTime.get(time.id)?.length || 0}</p>
                </div>
              </div>

              <div className="team-card__actions">
                <Button
                  icon={Clipboard}
                  onClick={() => copiarCodigo(time.code)}
                  type="button"
                  variant="secondary"
                >
                  Copiar
                </Button>

                <Button
                  className="manage-button"
                  onClick={() => onOpenTeam(time.id)}
                  type="button"
                >
                  Gerenciar
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
