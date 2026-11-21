import { LogOut, Menu, X } from "lucide-react";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "../ui/Button.jsx";
import "./MobileNavigation.css";

const compactQuery = "(max-width: 1059px)";
function subscribeToLayout(callback) {
  const media = window.matchMedia(compactQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const compactLayout = () => window.matchMedia(compactQuery).matches;
const desktopLayout = () => false;
export const useCompactNavigation = () => useSyncExternalStore(subscribeToLayout, compactLayout, desktopLayout);

export function NavigationItems({ tabs, activeView, onNavigate, navRef }) {
  return <nav className="nav-list" aria-label="Navegação principal" ref={navRef}>
    {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button"
      aria-current={activeView === id ? "page" : undefined}
      className={activeView === id ? "nav-item nav-item--active" : "nav-item"}
      onClick={() => onNavigate(id)}>
      <Icon size={18} aria-hidden="true" /><span>{label}</span>
    </button>)}
  </nav>;
}

export function MobileNavigation({ tabs, activeView, onNavigate, onLogoClick, onLogout }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  function openMenu() {
    dialogRef.current.showModal();
    setOpen(true);
    closeRef.current.focus();
  }
  function closeMenu() {
    dialogRef.current.close();
    setOpen(false);
  }
  function navigate(view) {
    closeMenu();
    if (view !== activeView) window.scrollTo({ top: 0, behavior: "instant" });
    onNavigate(view);
  }

  return <>
    <header className="mobile-app-header">
      <button className="mobile-app-brand" type="button" aria-label="WebKore — voltar às equipes" onClick={onLogoClick}>
        <img src="/icons/logoWK.png" alt="" /><strong>WebKore</strong>
      </button>
      <button className="mobile-app-icon" type="button" aria-label="Abrir menu" aria-haspopup="dialog"
        aria-expanded={open} aria-controls={menuId} onClick={openMenu}>
        <Menu size={24} aria-hidden="true" />
      </button>
    </header>
    <dialog ref={dialogRef} id={menuId} className="mobile-app-drawer" aria-labelledby={menuId + "-title"}
      onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
      <div className="mobile-app-drawer__inner">
        <div className="mobile-app-drawer__heading">
          <h2 id={menuId + "-title"}>Menu</h2>
          <button ref={closeRef} className="mobile-app-icon" type="button" aria-label="Fechar menu" onClick={closeMenu}>
            <X size={24} aria-hidden="true" />
          </button>
        </div>
        <NavigationItems tabs={tabs} activeView={activeView} onNavigate={navigate} />
        <Button icon={LogOut} onClick={() => { closeMenu(); onLogout(); }} type="button" variant="ghost">Sair</Button>
      </div>
    </dialog>
  </>;
}
