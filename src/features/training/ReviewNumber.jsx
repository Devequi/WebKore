import { useId, useLayoutEffect, useRef } from "react";

function StepButton({ label, disabled, onStep, children }) {
  const timer = useRef(null);
  const pointer = useRef(null);
  const latestStep = useRef(onStep);

  function stop() {
    clearTimeout(timer.current);
    timer.current = null;
    pointer.current = null;
    window.removeEventListener("blur", stop);
  }

  useLayoutEffect(() => {
    latestStep.current = onStep;
    if (disabled && pointer.current !== null) stop();
  }, [onStep, disabled]);
  useLayoutEffect(() => () => stop(), []);

  function start(event) {
    if (!event.isPrimary || event.button !== 0 || pointer.current !== null) return;
    const button = event.currentTarget;
    pointer.current = event.pointerId;
    button.setPointerCapture(event.pointerId);
    window.addEventListener("blur", stop);
    onStep();
    function repeat() {
      if (pointer.current === null || button.matches(":disabled")) { stop(); return; }
      latestStep.current();
      timer.current = setTimeout(repeat, 100);
    }
    timer.current = setTimeout(repeat, 400);
  }

  function end(event) {
    if (event.pointerId === pointer.current) stop();
  }
  function move(event) {
    if (event.pointerId !== pointer.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom) stop();
  }

  return <button type="button" aria-label={label} disabled={disabled}
    onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
    onLostPointerCapture={end} onPointerLeave={end} onBlur={stop}
    onContextMenu={event => event.preventDefault()}
    onClick={event => { if (event.detail === 0) onStep(); }}>
    {children}
  </button>;
}

export function ReviewNumber({ name, label = name, value, onChange, rating = false, step = 1 }) {
  const id = useId();
  const max = rating ? 10 : 2147483647;
  function adjust(direction) {
    const units = Math.round((Number(value) || 0) / step) + direction;
    const next = step === 0.1 ? units / 10 : units;
    onChange(Math.max(0, Math.min(max, next)));
  }
  return <div className="review-number">
    <label htmlFor={id}>{name}</label>
    <div className="review-stepper">
      <StepButton label={`Diminuir ${label}`} disabled={value != null && value <= 0} onStep={() => adjust(-1)}>−</StepButton>
      <input id={id} aria-label={label} type="number" min="0" max={max} step={step} inputMode={step === 1 ? "numeric" : "decimal"}
        value={value ?? ""} placeholder="—" onChange={event => onChange(event.target.value === "" ? null : Number(event.target.value))} />
      <StepButton label={`Aumentar ${label}`} disabled={value >= max} onStep={() => adjust(1)}>+</StepButton>
    </div>
  </div>;
}
