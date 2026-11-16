import React from "react";
import { clearSession } from "../services/session.js";
import { Button } from "./ui/Botao.jsx";

export class ErrorFallback extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="runtime-error">
        <h1>WebKore encontrou um erro ao abrir</h1>
        <p>Não foi possível carregar esta página.</p>
        <p>Seus dados foram preservados. Tente novamente ou volte à tela de login.</p>
        <div className="runtime-error__actions">
          <Button onClick={() => window.location.reload()} type="button">Tentar novamente</Button>
          <Button variant="ghost" onClick={() => { clearSession(); window.location.reload(); }} type="button">Voltar ao login</Button>
        </div>
      </main>
    );
  }
}
