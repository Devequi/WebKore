import { ArrowLeftRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import "./MobileNavigation.css";
import "./CoachNavigation.css";

const compactQuery = "(max-width: 1059px)";
function subscribeToLayout(callback) {
  const media = window.matchMedia(compactQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const compactLayout = () => window.matchMedia(compactQuery).matches;
const desktopLayout = () => false;
export const useCompactNavigation = () => useSyncExternalStore(subscribeToLayout, compactLayout, desktopLayout);

export function NavigationItem({ tab: { id, label, icon: Icon }, activeView, onNavigate, collapsed = false }) {
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState(null);
  function showTooltip(event) { if (collapsed) setTooltip({ top: event.currentTarget.getBoundingClientRect().top }); }
  return <>
    <button type="button" aria-label={collapsed ? label : undefined}
      aria-describedby={collapsed && tooltip ? tooltipId : undefined}
      aria-current={activeView === id ? "page" : undefined}
      className={activeView === id ? "nav-item nav-item--active" : "nav-item"}
      onMouseEnter={showTooltip} onMouseLeave={() => setTooltip(null)} onFocus={showTooltip} onBlur={() => setTooltip(null)}
      onKeyDown={(event) => { if (event.key === "Escape") setTooltip(null); }}
      onClick={() => { setTooltip(null); onNavigate(id); }}>
      <Icon size={18} aria-hidden="true" /><span className={collapsed ? "sidebar-visually-hidden" : undefined}>{label}</span>
    </button>
    {collapsed && tooltip && <span id={tooltipId} role="tooltip" className="sidebar-tooltip" style={tooltip}>{label}</span>}
  </>;
}

export function NavigationItems({ tabs, activeView, onNavigate, navRef, grouped = false, collapsed = false }) {
  const groups = grouped ? [...new Set(tabs.map(tab => tab.group || "Conta"))] : [];
  return <nav className="nav-list" aria-label="Navegação principal" ref={navRef}>
    {grouped ? groups.map(group => <div className="sidebar-nav-group" key={group} role="group" aria-label={group}>
      {!collapsed && <h2 className="sidebar-group-title">{group}</h2>}
      {tabs.filter(tab => (tab.group || "Conta") === group).map(tab => <NavigationItem key={tab.id} tab={tab} activeView={activeView} onNavigate={onNavigate} collapsed={collapsed} />)}
    </div>) : tabs.map(tab => <NavigationItem key={tab.id} tab={tab} activeView={activeView} onNavigate={onNavigate} collapsed={collapsed} />)}
  </nav>;
}

export function CoachNavigation({ tabs, activeView, onNavigate, onLogoClick, onLogout, currentUser, team, collapsed = false, onToggle, navRef }) {
  const profile = tabs.find(tab => tab.id === "profile");
  return <>
    <div className="sidebar-heading">
      <button className="sidebar-brand" type="button" onClick={onLogoClick} aria-label="WebKore — Minhas equipes">
        <img src="/icons/logoWK.png" alt="" />
        {!collapsed && <span><strong>WebKore</strong><small>{currentUser.role === "coach" ? "Painel do treinador" : "Painel do atleta"}</small></span>}
      </button>
      {onToggle && <button type="button" className="sidebar-collapse" onClick={onToggle}
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"} aria-expanded={!collapsed}>
        {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
      </button>}
    </div>
    {!collapsed && <button type="button" className="sidebar-team" onClick={onLogoClick} aria-label={`Trocar equipe: ${team?.name || "Nenhuma equipe selecionada"}`}>
      <span><small>Equipe selecionada</small><strong>{team?.name || "Selecionar equipe"}</strong></span>
      <ArrowLeftRight size={16} aria-hidden="true" />
    </button>}
    <NavigationItems tabs={tabs.filter(tab => tab.id !== "profile")} activeView={activeView} onNavigate={onNavigate}
      navRef={navRef} grouped collapsed={collapsed} />
    <div className="sidebar-account">
      {!collapsed && currentUser.role === "athlete" && <h2 className="sidebar-group-title">Conta</h2>}
      {!collapsed && <div className="profile-chip"><Avatar name={currentUser.name} photo={currentUser.photo} />
        <div><strong title={currentUser.name}>{currentUser.name}</strong><span>{currentUser.role === "coach" ? "Treinador" : "Atleta"}</span></div>
      </div>}
      {profile && <NavigationItem tab={profile} activeView={activeView} onNavigate={onNavigate} collapsed={collapsed} />}
      <NavigationItem tab={{ id: "logout", label: "Sair", icon: LogOut }} onNavigate={onLogout} collapsed={collapsed} />
    </div>
  </>;
}

export function MobileNavigation({ tabs, activeView, onNavigate, onLogoClick, onLogout, currentUser, team }) {
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
      <div className="mobile-app-drawer__inner coach-navigation">
        <div className="mobile-app-drawer__heading">
          <h2 id={menuId + "-title"}>Menu</h2>
          <button ref={closeRef} className="mobile-app-icon" type="button" aria-label="Fechar menu" onClick={closeMenu}>
            <X size={24} aria-hidden="true" />
          </button>
        </div>
        <CoachNavigation tabs={tabs} activeView={activeView} onNavigate={navigate}
          onLogoClick={() => { closeMenu(); onLogoClick(); }} onLogout={() => { closeMenu(); onLogout(); }} currentUser={currentUser} team={team} />
      </div>
    </dialog>
  </>;
}
