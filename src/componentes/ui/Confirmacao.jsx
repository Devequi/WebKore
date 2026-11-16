import { useEffect, useId, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "./Botao.jsx";
import "../../styles/ConfirmDialog.css";

export function useConfirmation() {
  const [details, setDetails] = useState(null);
  const resolver = useRef(null);
  const dialog = useRef(null);
  const cancel = useRef(null);
  const id = useId();

  function confirmAction(options) {
    if (resolver.current) return Promise.resolve(false);
    return new Promise((resolve) => {
      resolver.current = resolve;
      setDetails(options);
    });
  }

  useEffect(() => {
    if (!details || dialog.current.open) return;
    dialog.current.returnValue = "";
    dialog.current.showModal();
    cancel.current.focus();
  }, [details]);

  const confirmation = <dialog ref={dialog} className="confirm-dialog" aria-labelledby={id + "-title"}
    aria-describedby={id + "-description"} onClick={(event) => {
      if (event.currentTarget === event.target) dialog.current.close();
    }} onClose={(event) => {
      const resolve = resolver.current;
      resolver.current = null;
      setDetails(null);
      resolve?.(event.currentTarget.returnValue === "confirm");
    }}>
    {details && <div className="confirm-dialog__content">
      <button type="button" className="confirm-dialog__close" aria-label="Fechar confirmação" onClick={() => dialog.current.close()}>
        <X size={20} aria-hidden="true" />
      </button>
      <div className="confirm-dialog__header">
        <span className="confirm-dialog__icon"><Trash2 size={20} aria-hidden="true" /></span>
        <div><h2 id={id + "-title"}>{details.title}</h2><p id={id + "-description"}>{details.description}</p></div>
      </div>
      <div className="confirm-dialog__actions">
        <Button ref={cancel} type="button" variant="ghost" onClick={() => dialog.current.close()}>Cancelar</Button>
        <Button type="button" variant="danger" onClick={() => dialog.current.close("confirm")}>{details.label}</Button>
      </div>
    </div>}
  </dialog>;

  return { confirmAction, confirmation };
}
