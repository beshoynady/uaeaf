/**
 * What went wrong with the last write, where the person who tried can see it.
 *
 * One component because the alternative already happened: the same class
 * string was pasted into six screens and had begun to drift — three at
 * `text-body`, three at `text-body-sm`, for the same kind of message.
 *
 * `role="alert"` so it is announced the moment it appears. A failed save is
 * the one thing on the screen a reader must not have to go looking for: the
 * form kept every typed value, nothing moved, and without this the whole
 * event reads as success.
 */
export const WriteFailure = ({ message }: { message: string | null }) => {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-[var(--radius-md)] border border-[color:var(--color-semantic-error)] px-4 py-3 text-body font-medium text-[color:var(--color-text-primary)]"
    >
      {message}
    </p>
  );
};
