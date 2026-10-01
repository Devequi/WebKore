export { metricCatalog } from "../../shared/criteria.js";

export const initialData = {
  users: [
    {
      id: "coach-1",
      role: "coach",
      name: "Marina Duarte",
      email: "marina@webkore.com",
      photo: "MD"
    },
    {
      id: "athlete-1",
      role: "athlete",
      name: "Lucas Pereira",
      email: "lucas@webkore.com",
      number: 10,
      position: "Ala",
      photo: "LP"
    },
    {
      id: "athlete-2",
      role: "athlete",
      name: "Bianca Rocha",
      email: "bianca@webkore.com",
      number: 7,
      position: "Pivô",
      photo: "BR"
    },
    {
      id: "athlete-3",
      role: "athlete",
      name: "Caio Martins",
      email: "caio@webkore.com",
      number: 4,
      position: "Fixo",
      photo: "CM"
    },
    {
      id: "athlete-4",
      role: "athlete",
      name: "Ana Souza",
      email: "ana@webkore.com",
      number: 12,
      position: "Goleira",
      photo: "AS"
    }
  ],
  teams: [
    {
      id: "team-1",
      name: "ETEC Araras Sub-18",
      modality: "Futsal",
      code: "WK-TEAM-404",
      coachId: "coach-1"
    },
    {
      id: "team-2",
      name: "Projeto Quadra Viva",
      modality: "Vôlei",
      code: "WK-TEAM-218",
      coachId: "coach-1"
    }
  ],
  memberships: [
    { athleteId: "athlete-1", teamId: "team-1", status: "approved" },
    { athleteId: "athlete-2", teamId: "team-1", status: "approved" },
    { athleteId: "athlete-3", teamId: "team-1", status: "approved" },
    { athleteId: "athlete-4", teamId: "team-1", status: "pending" },
    { athleteId: "athlete-1", teamId: "team-2", status: "approved" }
  ],
  trainings: [
    {
      id: "training-1",
      teamId: "team-1",
      date: "2026-05-06",
      type: "Físico",
      description: "Resistência, aceleração e mobilidade.",
      athletes: {
        "athlete-1": {
          present: true,
          metrics: { Gols: 1, Assistências: 2, Finalizações: 5, Desarmes: 3 },
          ratings: { Técnica: 7, "Condicionamento físico": 8, Participação: 8, "Trabalho em equipe": 7 }
        },
        "athlete-2": {
          present: true,
          metrics: { Gols: 2, Assistências: 1, Finalizações: 4, Desarmes: 1 },
          ratings: { Técnica: 8, "Condicionamento físico": 7, Participação: 8, "Trabalho em equipe": 8 }
        },
        "athlete-3": {
          present: false,
          metrics: { Gols: 0, Assistências: 0, Finalizações: 0, Desarmes: 0 },
          ratings: { Técnica: 5, "Condicionamento físico": 5, Participação: 5, "Trabalho em equipe": 5 }
        }
      }
    },
    {
      id: "training-2",
      teamId: "team-1",
      date: "2026-05-13",
      type: "Coletivo",
      description: "Transição defensiva e tomada de decisão.",
      athletes: {
        "athlete-1": {
          present: true,
          metrics: { Gols: 3, Assistências: 1, Finalizações: 6, Desarmes: 2 },
          ratings: { Técnica: 8, "Condicionamento físico": 8, Participação: 9, "Trabalho em equipe": 8 }
        },
        "athlete-2": {
          present: true,
          metrics: { Gols: 1, Assistências: 3, Finalizações: 3, Desarmes: 4 },
          ratings: { Técnica: 8, "Condicionamento físico": 8, Participação: 9, "Trabalho em equipe": 9 }
        },
        "athlete-3": {
          present: true,
          metrics: { Gols: 0, Assistências: 1, Finalizações: 2, Desarmes: 6 },
          ratings: { Técnica: 7, "Condicionamento físico": 7, Participação: 7, "Trabalho em equipe": 8 }
        }
      }
    },
    {
      id: "training-3",
      teamId: "team-1",
      date: "2026-05-20",
      type: "Misto",
      description: "Bolas paradas, mini-jogo e recuperação.",
      athletes: {
        "athlete-1": {
          present: true,
          metrics: { Gols: 2, Assistências: 4, Finalizações: 4, Desarmes: 3 },
          ratings: { Técnica: 9, "Condicionamento físico": 8, Participação: 9, "Trabalho em equipe": 9 }
        },
        "athlete-2": {
          present: true,
          metrics: { Gols: 2, Assistências: 2, Finalizações: 5, Desarmes: 2 },
          ratings: { Técnica: 8, "Condicionamento físico": 8, Participação: 8, "Trabalho em equipe": 9 }
        },
        "athlete-3": {
          present: true,
          metrics: { Gols: 1, Assistências: 1, Finalizações: 3, Desarmes: 5 },
          ratings: { Técnica: 7, "Condicionamento físico": 8, Participação: 8, "Trabalho em equipe": 8 }
        }
      }
    },
    {
      id: "training-4",
      teamId: "team-2",
      date: "2026-05-16",
      type: "Coletivo",
      description: "Saque, recepção e cobertura.",
      athletes: {
        "athlete-1": {
          present: true,
          metrics: { Pontos: 8, Aces: 2, Bloqueios: 1, Defesas: 6 },
          ratings: { Técnica: 8, "Condicionamento físico": 7, Participação: 8, "Trabalho em equipe": 8 }
        }
      }
    }
  ],
  syncQueue: []
};
