import { IconAlert, IconSearchHome } from "@/components/icons";

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <IconAlert />
      <div>
        <strong>{title}</strong>
        {message && <p>{message}</p>}
        {onRetry && (
          <button type="button" className="btn btn-secondary" style={{ padding: "9px 18px", fontSize: 13.5 }} onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <IconSearchHome />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className = "", style }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

export function KpiCard({ label, value, icon, loading = false }) {
  return (
    <article className="kpi-card">
      <span className="kpi-label">
        {icon}
        {label}
      </span>
      {loading ? (
        <Skeleton className="" style={{ display: "block", width: "70%", height: 30, marginTop: 10 }} />
      ) : (
        <b className="kpi-value">{value}</b>
      )}
    </article>
  );
}

export function ChartSkeleton({ height = 340 }) {
  return (
    <div className="plot-box" aria-hidden="true">
      <Skeleton style={{ display: "block", width: "100%", height }} />
    </div>
  );
}

export function rupees(crore) {
  return `₹ ${Number(crore).toFixed(2)} Cr`;
}
