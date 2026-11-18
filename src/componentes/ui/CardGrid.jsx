import "../../styles/CardGrid.css";

// Each region responds to its available width, including inside split panels.
export function CardGrid({ children, className = "", layout = "summary", columns = 3, label, gridAs: Grid = "div" }) {
  const Region = label ? "section" : "div";
  return <Region className="card-region" aria-label={label}>
    <Grid className={`card-grid card-grid--${layout} ${className}`.trim()} data-columns={columns}>
      {children}
    </Grid>
  </Region>;
}
