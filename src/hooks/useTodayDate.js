import { useEffect, useState } from "react";
import { todayDateOnly } from "../../shared/birthDate.js";

// Atualiza também um painel aberto durante a virada do dia ou suspenso em outra aba.
export function useTodayDate() {
  const [today, setToday] = useState(todayDateOnly);
  useEffect(() => {
    const update = () => setToday(todayDateOnly());
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return today;
}
