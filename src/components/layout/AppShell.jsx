import { LogOut, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { Button } from "../ui/Button.jsx";
import { CoachNavigation, MobileNavigation, NavigationItems, useCompactNavigation } from "./MobileNavigation.jsx";

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
  const selectedView = activeView === "athlete-search" ? "athlete-lobby" : activeView === "athlete-trainings" ? "athlete-home" : activeView;

  useEffect(() => {
    if (mobile) return;
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedView, mobile, collapsed]);

  return (
    <div className={`${shellClassName}${activeView === "coach-home" ? " app-shell--coach-home" : ""}${coach ? " app-shell--coach-navigation" : ""}${coach && collapsed ? " app-shell--sidebar-collapsed" : ""}`}>
      {mobile ? <MobileNavigation tabs={tabs} activeView={selectedView} onNavigate={setActiveView}
        onLogoClick={onLogoClick} onLogout={onLogout} currentUser={currentUser} team={team} /> : <aside className={`sidebar${coach ? " coach-navigation" : ""}`} aria-label="Menu lateral">
        {coach ? <CoachNavigation tabs={tabs} activeView={selectedView} onNavigate={setActiveView} onLogoClick={onLogoClick}
          onLogout={onLogout} currentUser={currentUser} team={team} collapsed={collapsed} onToggle={() => setCollapsed(value => !value)} navRef={navRef} /> : <>
        <button className="brand" onClick={onLogoClick} type="button">
          <img src="/icons/logoWK.png" alt="WebKore" />
          <div>
            <strong>WebKore</strong>
            <span title={team?.name}>{team?.name || "Gestão esportiva"}</span>
          </div>
        </button>

        <NavigationItems tabs={tabs} activeView={selectedView} onNavigate={setActiveView} navRef={navRef} />

        <div className="sidebar__footer">
          <div className="profile-chip">
            <Avatar name={currentUser.name} photo={currentUser.photo} />
            <div>
              <strong title={currentUser.name}>{currentUser.name}</strong>
              <span>{currentUser.role === "coach" ? "Treinador" : "Atleta"}</span>
            </div>
          </div>
          <Button icon={LogOut} onClick={onLogout} type="button" variant="ghost">
            Sair
          </Button>
        </div>
      </>}
      </aside>}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar__title">
            <span className="eyebrow">{team?.modality || "WebKore"}</span>
            <h1>{activeView === "athlete-trainings" ? "Detalhes do treino" : activeView.endsWith("-home") ? team?.name || "Painel" : activeView === "profile" ? "Meu perfil" : tabs.find(tab => tab.id === selectedView)?.label || "WebKore"}</h1>
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
