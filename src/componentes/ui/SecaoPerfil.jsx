export function ProfileSection({ title, description, children, className = "" }) {
  return <section className={`profile-section ${className}`}>
    <div className="profile-section__intro"><h3>{title}</h3>{description && <p>{description}</p>}</div>
    <div className="profile-section__body">{children}</div>
  </section>;
}
