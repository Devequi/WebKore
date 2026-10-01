export function KpiCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="kpi-card">
      <div className="kpi-card__icon">{Icon && <Icon size={20} />}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail && <span>{detail}</span>}
      </div>
    </article>
  );
}
