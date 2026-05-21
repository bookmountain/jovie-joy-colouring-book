import type { ReactNode } from "react";

export type AdminEmptyStateProps = {
  icon?: ReactNode;
  heading: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
};

export function AdminEmptyState({ icon, heading, body, action }: AdminEmptyStateProps) {
  return (
    <div className="admin-empty">
      {icon ? <div className="ic">{icon}</div> : null}
      <h3>{heading}</h3>
      {body ? <p>{body}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}
