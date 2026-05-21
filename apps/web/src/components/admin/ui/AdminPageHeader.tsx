import type { ReactNode } from "react";

export type AdminPageHeaderProps = {
  crumb?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function AdminPageHeader({ crumb, title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="admin-page-head">
      <div>
        {crumb ? <div className="crumb">{crumb}</div> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}
