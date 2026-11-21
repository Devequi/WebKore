import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { getPositionOptions, positionError } from "../../../shared/positions.js";

export function PositionField({ modality, value, onChange }) {
  const id = useId();
  const options = getPositionOptions(modality);
  const error = positionError(modality, value);

  return <label htmlFor={id}>
    Posição
    {options ? <>
      <span className="position-field__select">
        <select id={id} value={error ? "" : value} onChange={onChange} required
          aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}>
          <option value="" disabled>Selecione uma posição</option>
          {options.map((position) => <option key={position} value={position}>{position}</option>)}
        </select>
        <ChevronDown size={18} aria-hidden="true" />
      </span>
      {error && <small id={`${id}-error`} className="position-field__error">
        {value ? `Posição atual: “${value}”. O valor será preservado até salvar uma nova seleção. ` : ""}
        {error}
      </small>}
    </> : <input id={id} value={value} onChange={onChange} />}
  </label>;
}
