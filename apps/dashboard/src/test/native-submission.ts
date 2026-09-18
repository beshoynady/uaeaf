/**
 * What the browser would do with a rendered form if it submitted it natively.
 *
 * That is not a hypothetical path. Every form here prevents its own default
 * and sends the values with `fetch`, but React attaches that handler during
 * hydration, and the server-rendered HTML accepts typing and submits before
 * hydration finishes. In that window the browser submits the form itself,
 * and what it does then is decided by the attributes in the HTML — never by
 * anything React has or has not done yet.
 *
 * Both halves are returned on purpose. The query string proves the fields
 * really do serialise, so asserting the method afterwards is a statement
 * about this form rather than a tautology about a form with no named fields.
 *
 * Call it after filling the fields the way a person does, with `userEvent`.
 * Assigning `input.value` directly would be shorter and is wrong here: on a
 * controlled field it desynchronises React's value tracker, and it let a
 * synchronous test leave work behind that surfaced two tests later as a
 * person id nobody had chosen.
 */
export const nativeSubmission = (container: HTMLElement) => {
  const form = container.querySelector("form");
  if (!form) throw new Error("no <form> was rendered");

  const query = new URLSearchParams([...new FormData(form)] as string[][]).toString();

  return {
    /** Lower-cased by the DOM, and `"get"` when the attribute is absent. */
    method: form.method,
    /** The fields as the browser would serialise them. */
    query,
    /**
     * The URL the browser would navigate to. A GET submission appends every
     * named field to it; a POST one sends them in the body and navigates to
     * the bare target. This is the value that reaches the address bar, the
     * session history, the server's access log and the next `Referer`.
     */
    url: form.method === "get" ? `${form.action}?${query}` : form.action,
  };
};
