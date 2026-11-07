export function Loading() {
  return (
    <div className="py-16 grid place-items-center">
      <div className="spinner" />
    </div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="py-14 px-4 text-center">
      {Icon && <Icon size={40} className="mx-auto mb-3" style={{ color: 'var(--gcal-border)' }} />}
      <div className="font-medium mb-1">{title}</div>
      {children && <div className="muted text-sm">{children}</div>}
    </div>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return <div className="alert danger my-3">{error}</div>;
}
