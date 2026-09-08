/** Rendered when the API answered 403 for a screen the user reached anyway
 *  — by typing the URL, or by following a stale link. It is a normal state,
 *  not an error: the refusal came from PermissionsGuard doing its job. */
export function AccessDenied({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-sunken)] px-6 py-10 text-center">
      <h2 className="text-h4 text-[color:var(--color-text-primary)]">{title}</h2>
      <p className="mt-2 text-body-sm text-[color:var(--color-text-muted)]">{message}</p>
    </section>
  );
}
