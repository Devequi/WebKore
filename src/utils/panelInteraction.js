const internalControl = 'button, a, input, select, textarea, label, summary, dialog, [role="button"], [role="link"], [role="application"], [role="slider"], [role="combobox"], [tabindex], [contenteditable], [data-panel-interactive]';

export function isPanelSurfaceClick(event) {
  return !event.defaultPrevented && event.button === 0 &&
    !event.target.closest?.(internalControl) && !window.getSelection()?.toString();
}
