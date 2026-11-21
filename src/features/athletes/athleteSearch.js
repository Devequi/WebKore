function normalizeName(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function filterAthletesByName(athletes, query) {
  const normalizedQuery = normalizeName(query);
  return normalizedQuery ? athletes.filter((athlete) => normalizeName(athlete.name).includes(normalizedQuery)) : athletes;
}
