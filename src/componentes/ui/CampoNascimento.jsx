import { useTodayDate } from "../../hooks/useTodayDate.js";
import { formatDate } from "../../utils/formatters.js";
import { isDateOnly } from "../../../shared/birthDate.js";

export function BirthDateField({ value, onChange, required = false }) {
  const today = useTodayDate();
  return (
    <label>
      Data de Nascimento
      <input
        autoComplete="bday"
        lang="pt-BR"
        max={today}
        min="1000-01-01"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type="date"
        value={value}
      />
      <small>{isDateOnly(value) ? formatDate(value) : "DD/MM/AAAA"}</small>
    </label>
  );
}
