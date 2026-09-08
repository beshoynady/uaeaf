export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="flex flex-col gap-2 border-b border-[color:var(--color-border-default)] pb-6">
      <h1 className="text-h3 text-[color:var(--color-text-primary)]">{title}</h1>
      {description ? (
        <p className="max-w-[70ch] text-body-sm text-[color:var(--color-text-muted)]">{description}</p>
      ) : null}
    </header>
  );
}
