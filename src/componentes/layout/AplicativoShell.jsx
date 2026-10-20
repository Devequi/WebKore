import { LogOut, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { Button } from "../ui/Botao.jsx";

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

  useEffect(() => {
    const activeItem = navRef.current?.querySelector('[aria-current="page"]');
    activeItem?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeView]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={onLogoClick} type="button">
          <img src="/icons/logoWK.png" alt="WebKore" />
          <div>
            <strong>WebKore</strong>
            <span>{team?.name || "Gestão esportiva"}</span>
          </div>
        </button>

        <nav className="nav-list" aria-label="Navegação principal" ref={navRef}>
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={activeView === item.id ? "page" : undefined}
                className={activeView === item.id ? "nav-item nav-item--active" : "nav-item"}
                key={item.id}
                onClick={() => setActiveView(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="profile-chip">
            <Avatar name={currentUser.name} photo={currentUser.photo} />
            <div>
              <strong>{currentUser.name}</strong>
              <span>{currentUser.role === "coach" ? "Treinadora" : "Atleta"}</span>
            </div>
          </div>
          <Button icon={LogOut} onClick={onLogout} type="button" variant="ghost">
            Sair
          </Button>
        </div>
      </aside>

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
            <Button
              aria-label="Sair"
              className="topbar__logout"
              icon={LogOut}
              onClick={onLogout}
              title="Sair"
              type="button"
              variant="ghost"
            >
              Sair
            </Button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
