export function Avatar({ name, photo, size = "md" }) {
  const initials =
    photo ||
    (name
      ?.split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "?");

  return (
    <div className={`avatar avatar--${size}`} aria-label={name}>
      {initials}
    </div>
  );
}
