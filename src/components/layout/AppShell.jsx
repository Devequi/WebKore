import { LogOut, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button.jsx";
import { CoachNavigation, MobileNavigation, useCompactNavigation } from "./MobileNavigation.jsx";

export function AppShell({
  activeView,
  children,
  currentUser,
  onLogoClick,
  onLogout,
  setActiveView,
  tabs,
  team
}) {
  const navRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const coach = currentUser.role === "coach";
  const mobile = useCompactNavigation();
  const shellClassName = coach ? "app-shell coach-experience" : "app-shell";
  const selectedView = activeView === "athlete-search" ? "athlete-lobby" : activeView;

  useEffect(() => {
    if (mobile) return;
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedView, mobile, collapsed]);

  return (
    <div className={`${shellClassName}${activeView === "coach-home" ? " app-shell--coach-home" : ""} app-shell--coach-navigation${collapsed ? " app-shell--sidebar-collapsed" : ""}`}>
      {mobile ? <MobileNavigation tabs={tabs} activeView={selectedView} onNavigate={setActiveView}
        onLogoClick={onLogoClick} onLogout={onLogout} currentUser={currentUser} team={team} /> : <aside className="sidebar coach-navigation" aria-label="Menu lateral">
        <CoachNavigation tabs={tabs} activeView={selectedView} onNavigate={setActiveView} onLogoClick={onLogoClick}
          onLogout={onLogout} currentUser={currentUser} team={team} collapsed={collapsed} onToggle={() => setCollapsed(value => !value)} navRef={navRef} />
      </aside>}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar__title">
            <span className="eyebrow">{team?.modality || "WebKore"}</span>
            <h1>{activeView === "coach-home" ? team?.name || "Painel" : activeView === "profile" ? "Meu perfil" : tabs.find(tab => tab.id === selectedView)?.label || "WebKore"}</h1>
          </div>
          <div className="topbar__actions">
            <Button icon={Users} onClick={onLogoClick} type="button" variant="ghost">
              Equipes
            </Button>
            {!mobile && <Button
              aria-label="Sair"
              className="topbar__logout"
              icon={LogOut}
              onClick={onLogout}
              title="Sair"
              type="button"
              variant="ghost"
            >
              Sair
            </Button>}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
