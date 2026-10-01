import { LogOut } from "lucide-react";
import { Button } from "../ui/Botao.jsx";

export function PublicHeader({ onLogout }) {
  return (
    <header className={`public-header ${onLogout ? "public-header--lobby" : ""}`}>
      <img src="/icons/logoWK.png" alt="WebKore" />
      <span>WebKore</span>
      {onLogout && (
        <Button className="public-header__logout" icon={LogOut} onClick={onLogout} type="button" variant="ghost">
          Sair
        </Button>
      )}
    </header>
  );
}
