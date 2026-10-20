import { Plus, UserRound } from "lucide-react";
import { PublicHeader } from "../../componentes/layout/CabecalhoPublico.jsx";
import { Button } from "../../componentes/ui/Botao.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import "../../styles/paginasAtleta/Lobby.css";

export function AthleteLobby({
  currentUser,
  onLogout,
  onOpenTeam,
  onProfile,
  onSearch,
  state,
  teams = []
}) {
  return (
    <main className="lobby-page">
      <PublicHeader onLogout={onLogout} />

      <section className="lobby-hero">
        <div>
          <h1>
            Olá, {currentUser?.name || "Atleta"}
          </h1>

          <p>
            Escolha uma equipe aprovada para acompanhar presença,
            desempenho e histórico.
          </p>
        </div>

        <div className="lobby-actions">
          <Button icon={UserRound} onClick={onProfile} type="button" variant="ghost">Meu perfil</Button>
          <Button
            icon={Plus}
            onClick={onSearch}
            type="button"
          >
            Entrar em um time
          </Button>

        </div>
      </section>

      {teams.length === 0 ? (
        <EmptyState
          title="Nenhuma equipe aprovada"
          text="Entre em uma equipe usando o código enviado pelo treinador."
        />
      ) : (
        <div className="team-card-grid">
          {teams.map((team) => {
            const treinador = state.users.find(
              (user) => user.id === team.coachId
            );

            return (
              <article
                className="team-card"
                key={team.id}
              >
                <span>
                  {team.modality}
                </span>

                <h2>
                  {team.name}
                </h2>

                <p>
                  Treinador: {treinador?.name || "Não informado"}
                </p>

                <p>
                  Código {team.code}
                </p>

                <Button
                  onClick={() => onOpenTeam(team.id)}
                  type="button"
                >
                  Acessar dados
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
