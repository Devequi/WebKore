// Visual-only fixtures: real page/components, no API or persistent storage.
import React from "react";
import { createRoot } from "react-dom/client";
import { TeamHome } from "../../src/features/performance/CoachDashboard.jsx";
import { AthleteDashboard } from "../../src/features/performance/AthleteDashboard.jsx";
import { CoachLobby } from "../../src/features/teams/CoachLobby.jsx";
import { AppShell } from "../../src/components/layout/AppShell.jsx";
import { Users } from "lucide-react";
import { criteriaFor } from "../../shared/evaluations.js";
import "../../src/styles/global.css";
import "../../src/styles/ui-consistency.css";
import "../../src/styles/experience.css";
import "../../src/styles/coach-experience.css";

const team = { id: "qa-team", name: "Equipe QA de responsividade", modality: "Futsal", coachId: "qa-coach", code: "QA-VISUAL" };
const user = { id: "qa-coach", name: "Treinador QA", role: "coach" };
const athletes = [ { id: "qa-line", name: "Atleta de linha QA", role: "athlete", position: "Ala" },
  { id: "qa-keeper", name: "Goleiro QA", role: "athlete", position: "Goleiro" } ];
const record = (role) => ({ role, modality: "Futsal", position: role === "OUTFIELD" ? "Ala" : "Goleiro", present: true,
  evaluationSource: "AVERAGE", finalScore: 8.5,
  ratings: Object.fromEntries(criteriaFor(team, role, "QUALITATIVE").map(item => [item.name, 8.5])),
  measurementsInitialized: true, measurements: criteriaFor(team, role, "QUANTITATIVE").map((item, index) => ({ criterionId: item.id, name: item.name, role, value: index === 0 ? 1240 : index * 7 })),
  ...(role === "GOALKEEPER" ? { goalkeeperStats: { saves: 1240, goalsConceded: 7, shotsOnTarget: 1247, distributionAttempts: 30, accurateDistributions: 27 } } : {}) });
const state = { users: [user, ...athletes], teams: [team], memberships: athletes.map(athlete => ({ teamId: team.id, athleteId: athlete.id, status: "approved", position: athlete.position })),
  trainings: [{ id: "qa-training", teamId: team.id, date: "2026-11-18", type: "Misto", description: "Fixtures visuais de teste", athletes: { "qa-line": record("OUTFIELD"), "qa-keeper": record("GOALKEEPER") } }] };
const mode = new URLSearchParams(location.search).get("mode");
const noop = () => {};
const page = mode === "lobby" ? <CoachLobby actions={{}} currentUser={user} state={state} teams={[team]} onProfile={noop} onOpenTeam={noop} onLogout={noop} /> :
  <AppShell activeView={mode === "athlete" ? "athlete-home" : "coach-home"} currentUser={mode === "athlete" ? athletes[0] : user}
    tabs={[{ id: "coach-home", label: "Dashboard QA", icon: Users }]} onLogoClick={noop} onLogout={noop} setActiveView={noop} team={team}>
    {mode === "athlete" ? <AthleteDashboard athleteId="qa-line" state={state} team={team} /> : <TeamHome state={state} team={team} onOpenTraining={noop} />}
  </AppShell>;
createRoot(document.getElementById("root")).render(page);
