import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { isPanelSurfaceClick } from "../../utils/panelInteraction.js";
import "../../styles/CollapsiblePanel.css";

export function CollapsiblePanel({ title, eyebrow, children, actions, className = "", headingClassName = "", initialOpen = true }) {
  const [open, setOpen] = useState(initialOpen);
  const contentId = useId();
  const headingRef = useRef(null);
  const panelRef = useRef(null);
  function toggle() {
    if (open && panelRef.current?.contains(document.activeElement)) headingRef.current?.focus({ preventScroll: true });
    setOpen((current) => !current);
  }
  function clickSurface(event) {
    if (isPanelSurfaceClick(event)) toggle();
  }
  return <section ref={panelRef} className={`panel collapsible-panel collapsible-panel--surface ${className}`} data-collapsed={!open}
    onClick={clickSurface}>
    <div className={`section-heading ${headingClassName}`}>
      <div className="collapsible-panel__heading"><h2>
        <button ref={headingRef} type="button" className="collapsible-panel__heading-toggle" aria-label={title}
          aria-expanded={open} aria-controls={contentId} onClick={toggle}>
          <span className="collapsible-panel__identity"><span className="eyebrow">{eyebrow}</span><span className="collapsible-panel__title">{title}</span></span>
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      </h2></div>
      {open && actions && <div className="collapsible-panel__actions">
        {actions}
      </div>}
    </div>
    <div id={contentId} className="collapsible-panel__content" aria-hidden={!open} inert={!open}>
      <div className="collapsible-panel__content-inner"><div className="collapsible-panel__body">{children}</div></div>
    </div>
  </section>;
}
