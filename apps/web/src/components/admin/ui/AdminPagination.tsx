export type AdminPaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
};

export function AdminPagination({ page, totalPages, pageSize, total, onPageChange }: AdminPaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages: number[] = [];
  for (let p = 1; p <= totalPages; p += 1) pages.push(p);
  return (
    <div className="admin-pagi">
      <span className="info">Showing {start}–{end} of {total} · {pageSize} per page</span>
      <div className="controls">
        <button type="button" className="pgbtn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹ Prev</button>
        {pages.map((p) => (
          <button key={p} type="button" className="pgbtn" data-state={p === page ? "on" : "off"} onClick={() => onPageChange(p)}>{p}</button>
        ))}
        <button type="button" className="pgbtn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next ›</button>
      </div>
    </div>
  );
}
