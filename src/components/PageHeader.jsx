export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="muted text-sm mt-1 mb-0">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
