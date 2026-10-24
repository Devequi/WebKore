import { normalizeModality } from "./criteria.js";

const positionsByModality = {
  Futsal: Object.freeze(["Goleiro", "Fixo", "Pivô", "Ala"])
};

export function getPositionOptions(modality) {
  return positionsByModality[normalizeModality(modality)] ?? null;
}

export function positionError(modality, position) {
  const options = getPositionOptions(modality);
  return options && !options.includes(position)
    ? `Selecione uma posição válida para ${normalizeModality(modality)}: ${options.join(", ")}.`
    : null;
}
