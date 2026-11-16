import { LogOut, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { Button } from "../ui/Botao.jsx";
import { MobileNavigation, NavigationItems, useCompactNavigation } from "./NavegacaoMobile.jsx";

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
  const coach = currentUser.role === "coach";
  const mobile = useCompactNavigation();
  const shellClassName = coach ? "app-shell coach-experience" : "app-shell";
  const selectedView = activeView === "athlete-search" ? "athlete-lobby" : activeView;

  useEffect(() => {
    if (mobile) return;
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedView, mobile]);

  return (
    <div className={activeView === "coach-home" ? `${shellClassName} app-shell--coach-home` : shellClassName}>
      {mobile ? <MobileNavigation tabs={tabs} activeView={selectedView} onNavigate={setActiveView}
        onLogoClick={onLogoClick} onLogout={onLogout} /> : <aside className="sidebar">
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
      </aside>}

      <main className="main-content">
        <header className="topbar">
          <div className="topbar__title">
            <span className="eyebrow">{team?.modality || "WebKore"}</span>
            <h1>{team?.name || "Painel"}</h1>
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
