import React from "react";
import { clearSession } from "../services/session.js";

export class ErrorFallback extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="runtime-error">
        <h1>WebKore encontrou um erro ao abrir</h1>
        <p>{this.state.error.message}</p>
        <p>Seus dados foram preservados. Tente novamente ou volte à tela de login.</p>
        <button onClick={() => this.setState({ error: null })} type="button">Tentar novamente</button>
        <button onClick={() => { clearSession(); window.location.reload(); }} type="button">Voltar ao login</button>
      </main>
    );
  }
}
