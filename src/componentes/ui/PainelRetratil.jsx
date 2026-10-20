import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsiblePanel({ title, eyebrow, children, actions, className = "", headingClassName = "" }) {
  const [open, setOpen] = useState(true);
  const contentId = useId();
  return <section className={`panel collapsible-panel ${className}`} data-collapsed={!open}>
    <div className={`section-heading ${headingClassName}`}>
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>
      <div className="collapsible-panel__actions">
        {open && actions}
        <button type="button" className="collapsible-panel__toggle" aria-expanded={open} aria-controls={contentId}
          aria-label={`${open ? "Retrair" : "Expandir"} ${title}`} onClick={() => setOpen(!open)}>
          <span>{open ? "Retrair" : "Expandir"}</span><ChevronDown size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
    <div id={contentId} hidden={!open}>{children}</div>
  </section>;
}
