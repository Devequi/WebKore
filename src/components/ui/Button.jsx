export function Button({ children, className = "", icon: Icon, variant = "primary", ...props }) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {Icon && <Icon size={18} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
