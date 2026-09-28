import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { auditActionFor } from './audit-log.interceptor.js';

/**
 * Nothing opts out of the audit trail without saying where its row comes from.
 *
 * Same mechanical style as `permission-catalogue.spec.ts`: derive the truth from
 * the source, so a route that forgets is a failing test rather than a gap
 * discovered in the log months later.
 *
 * WHAT THIS CHECKS, AND WHY NOT MORE
 * ADR-0112 removed the interceptor's silent skip, so an ordinary mutating route
 * now always writes a row — with `entityId: null` and a warning when nothing can
 * name the record. That closes the hole for everything the interceptor still
 * sees.
 *
 * What it does not cover is `@SkipAuditLog()`: a route carrying it leaves the
 * mechanism entirely, and if it then fails to write its own row it is silent
 * again, exactly as before. That is the remaining hole class, it is small, and
 * every member of it is listed below with where its row is written. Adding a new
 * `@SkipAuditLog()` route fails this test until its author says the same.
 *
 * Requiring `@AuditEntity` on every route without a `:id` was considered and
 * rejected: around sixty routes name their subject through the created
 * document's id in the response, which cannot be read from the source, so the
 * exemption list would have been sixty rubber stamps — noise that hides the six
 * cases worth reading.
 */
describe('audit route coverage', () => {
  const MUTATING = /^\s*@(Post|Patch|Put|Delete)\(/;

  /**
   * Every route that leaves the interceptor, where its audit row is written
   * instead, and by whom. Both a reason AND a `writtenBy` are required: the
   * point of the list is that opting out costs an explanation, and naming
   * only the reason let a real drift sit here unnoticed — four of these
   * entries named `PublishingService` as the writer when the row is actually
   * written by `ArticlesService.writeArticleAudit` (self-audit; `create`,
   * `update`, `setArchived`, `remove` each call it directly). That is
   * exactly how `remove` was free to hand-write the stale `'Delete'` for as
   * long as it did: nothing here recorded which file to go looking in.
   * Corrected 2026-09-27, round 3.
   */
  const WRITES_ITS_OWN_ROW = new Map<string, { writtenBy: string; reason: string }>([
    [
      'POST /articles',
      { writtenBy: 'ArticlesService', reason: 'create() self-audits via writeArticleAudit — Create' },
    ],
    [
      'PATCH /articles/:id',
      { writtenBy: 'ArticlesService', reason: 'update() self-audits via writeArticleAudit — Update' },
    ],
    [
      'POST /articles/:id/submit',
      { writtenBy: 'PublishingService', reason: 'submit() writes the StatusChange' },
    ],
    [
      'POST /articles/:id/publish',
      { writtenBy: 'PublishingService', reason: 'publishDirect() writes the publication row' },
    ],
    [
      'POST /articles/:id/publish-approved',
      { writtenBy: 'PublishingService', reason: 'publishApproved() writes it' },
    ],
    [
      'POST /articles/:id/restore',
      { writtenBy: 'PublishingService', reason: 'restore() writes the restore row' },
    ],
    [
      'PATCH /articles/:id/archived',
      {
        writtenBy: 'ArticlesService',
        reason: 'setArchived() self-audits via writeArticleAudit — Update (a visibility flag, not the lifecycle Archive verb)',
      },
    ],
    [
      'DELETE /articles/:id',
      { writtenBy: 'ArticlesService', reason: 'remove() self-audits via writeArticleAudit — Archive, not Delete' },
    ],
    [
      'POST /articles/:id/unarchive',
      { writtenBy: 'ArticlesService', reason: 'unarchive() self-audits via writeArticleAudit — Restore' },
    ],

    // The two permanent deletions (ADR-0120). Each writes its own row because
    // the interceptor's would say less and, for a contact message, more than it
    // may: it stores the pre-image, which for an erasure request means copying
    // the citizen's submission into a collection that is readable over HTTP.
    [
      'DELETE /media-assets/:id/object',
      {
        writtenBy: 'MediaAssetPurgeService',
        reason: 'permanentDelete() records the asset and the breadth of the reference check',
      },
    ],
    [
      'DELETE /contact-messages/:id/record',
      {
        writtenBy: 'ContactMessagesService',
        reason: 'permanentDelete() records the erasure without the sender, subject or body',
      },
    ],

    // WorkflowInstancesService writes a precise StatusChange against the CONTENT
    // entity rather than against `workflowInstances` — which is what makes the
    // rows joinable with revisions and publications for the same record.
    [
      'POST /workflow-instances',
      { writtenBy: 'WorkflowInstancesService', reason: 'create() writes StatusChange on the entity' },
    ],
    [
      'POST /workflow-instances/:id/approve',
      { writtenBy: 'WorkflowInstancesService', reason: 'approve() writes it' },
    ],
    [
      'POST /workflow-instances/:id/reject',
      { writtenBy: 'WorkflowInstancesService', reason: 'reject() writes it' },
    ],
    [
      'POST /workflow-instances/:id/return',
      { writtenBy: 'WorkflowInstancesService', reason: 'return() writes it' },
    ],
    [
      'POST /workflow-instances/:id/resubmit',
      { writtenBy: 'WorkflowInstancesService', reason: 'resubmit() writes it' },
    ],
    [
      'POST /workflow-instances/:id/delegate',
      {
        writtenBy: 'WorkflowInstancesService',
        reason: 'delegation is disabled and answers 403; the service writes on the enabled path',
      },
    ],
    [
      'POST /workflow-instances/:id/cancel',
      { writtenBy: 'WorkflowInstancesService', reason: 'cancel() writes it' },
    ],

    // ADR-0107. The interceptor can name neither the record (no `:id`; the path
    // parameter is `entityType`) nor its previous arrangement (the pre-read also
    // needs a path `:id`), so the service writes both sides itself.
    [
      'PUT /workflow-policies/:entityType/approval',
      { writtenBy: 'ApprovalConfigurationService', reason: 'recordChange() writes both arrangements' },
    ],
  ]);

  /** Blanks comments while preserving line numbering, so a doc comment that
   *  merely MENTIONS @SkipAuditLog is not read as one — the mistake that
   *  inflated the route counts during the review that produced ADR-0112. */
  const stripComments = (src: string): string =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith('.controller.ts') ? [full] : [];
    });

  interface Route {
    name: string;
    file: string;
    line: number;
    skipped: boolean;
    /** The action half of the route's own RequirePermission decorator, read
     *  off the same cluster — undefined for a route with no such decorator
     *  (public routes, and the few guarded some other way). */
    permissionAction?: string;
    /** `@AuditEntity({ action })`'s declared override, when the route
     *  carries one — undefined otherwise. */
    auditEntityAction?: string;
    httpMethod: string;
    /** The controller method's own name, read off the line right after its
     *  decorator cluster — how `writeArticleAudit`'s call sites (I8) are
     *  matched back to the route that reaches them, since a service method
     *  carries no decorator of its own to read. */
    handlerName?: string;
  }

  const mutatingRoutes = (): Route[] => {
    const routes: Route[] = [];

    for (const file of walk(join(process.cwd(), 'src'))) {
      const lines = stripComments(readFileSync(file, 'utf8')).split(/\r?\n/);
      const controllerPath = (lines.join('\n').match(/@Controller\(\s*'([^']*)'/) ?? [])[1] ?? '';

      for (let i = 0; i < lines.length; i++) {
        const verb = lines[i].match(MUTATING);
        if (!verb) continue;

        const routePath = (lines[i].match(/@\w+\(\s*'([^']*)'/) ?? [])[1] ?? '';

        // Consume whole decorators, balancing brackets across lines. Without the
        // balancing a multi-line @ApiOperation truncates the cluster and hides
        // the decorators beneath it — which is how a guarded route reads as
        // unguarded.
        let j = i;
        const cluster: string[] = [];
        while (j < lines.length && /^\s*@/.test(lines[j])) {
          let depth = 0;
          do {
            cluster.push(lines[j]);
            depth += (lines[j].match(/[([{]/g) ?? []).length - (lines[j].match(/[)\]}]/g) ?? []).length;
            j++;
          } while (j < lines.length && depth > 0);
        }

        const clusterText = cluster.join('\n');
        const permissionMatch = clusterText.match(/@RequirePermission\(\s*'([^']+)'\s*,\s*'([^']+)'/);
        const auditEntityMatch = clusterText.match(/@AuditEntity\(\s*\{[\s\S]*?action:\s*'([^']+)'/);
        const handlerMatch = lines[j]?.match(/(?:async\s+)?(\w+)\s*\(/);

        routes.push({
          name: `${verb[1].toUpperCase()} /${[controllerPath, routePath].filter(Boolean).join('/')}`,
          file: file.replace(/\\/g, '/'),
          line: i + 1,
          skipped: /@SkipAuditLog\(\)/.test(clusterText),
          permissionAction: permissionMatch?.[2],
          auditEntityAction: auditEntityMatch?.[1],
          handlerName: handlerMatch?.[1],
          httpMethod: verb[1].toUpperCase(),
        });
      }
    }

    return routes;
  };

  it('finds the controllers at all, so a silent zero cannot pass as green', () => {
    expect(mutatingRoutes().length).toBeGreaterThan(150);
  });

  it('every route that skips the interceptor says where its row is written', () => {
    const undeclared = mutatingRoutes()
      .filter((route) => route.skipped)
      .filter((route) => !WRITES_ITS_OWN_ROW.has(route.name))
      .map((route) => `${route.name}  (${route.file}:${route.line})`);

    expect(undeclared).toEqual([]);
  });

  it('every declaration still names a route that skips the interceptor', () => {
    const skipping = new Set(mutatingRoutes().filter((route) => route.skipped).map((route) => route.name));
    const stale = [...WRITES_ITS_OWN_ROW.keys()].filter((name) => !skipping.has(name));

    expect(stale).toEqual([]);
  });

  it('every declaration carries a reason', () => {
    const empty = [...WRITES_ITS_OWN_ROW.entries()]
      .filter(([, { reason }]) => reason.trim() === '')
      .map(([name]) => name);

    expect(empty).toEqual([]);
  });

  /**
   * A reason alone named WHY a route opts out; it did not name WHO took over
   * the writing. That gap is exactly what let four `articles` entries say
   * `PublishingService` when the row is actually written by
   * `ArticlesService` — nobody reading the reason had anywhere to go check.
   */
  it('every declaration names the service that writes the row', () => {
    const empty = [...WRITES_ITS_OWN_ROW.entries()]
      .filter(([, { writtenBy }]) => writtenBy.trim() === '')
      .map(([name]) => name);

    expect(empty).toEqual([]);
  });

  /**
   * The audit action for a route guarded by `Archive`, `Restore` or
   * `PermanentDelete` is that same action; a route whose permission cannot
   * express its own act carries an explicit `@AuditEntity({ action })`
   * naming it instead.
   *
   * REPLACED WHOLESALE 2026-09-27 (independent review, round 4): the
   * previous version of this test filtered routes to
   * `OVERRIDE_ACTIONS.has(route.permissionAction)` and then asked whether
   * `auditActionFor(...)` disagreed with that SAME `permissionAction` — but
   * `auditActionFor`'s own first branch is exactly that condition
   * (`audit-action.util.ts`), so the filtered set could never disagree with
   * itself. `mismatched` was `[]` by construction, for every possible route,
   * present or future — it would not have caught `DELETE /roles/:id`
   * logging the generic `Delete` after this same task re-pointed it to
   * `roles:ManageRoles`, which is exactly what happened.
   *
   * This version checks an INDEPENDENT fact instead of re-deriving through
   * the function under test: no non-skipped `@Delete` route's effective
   * audit action (its own permission via `auditActionFor`, or an
   * `@AuditEntity` override when the permission cannot say) is the generic
   * `Delete` — `Delete` now means only "no route writes this any more",
   * never "we did not check". Proven to bite: reverting the `DELETE
   * /roles/:id` fix (dropping its `@AuditEntity({ action: 'Archive' })`)
   * makes this fail, confirmed by hand while writing it.
   *
   * Deliberately NOT also asserting "every `.../restore` route logs
   * `Restore`": several singleton content pages' restore routes are guarded
   * by `Update` rather than a declared-but-undecorated `Restore` action
   * (pre-existing, e.g. `aboutFederationPage:Restore` — one of the 111 dead
   * pairs `permission-catalogue.spec.ts` already reports, Tasks 6–9's
   * territory, not this one). Asserting it here would turn an already-known,
   * differently-owned gap into a second, colliding red in this guard.
   */
  it('never logs the generic Delete for a route this interceptor actually audits', () => {
    const effectiveAction = (route: Route): string | undefined =>
      route.auditEntityAction ?? auditActionFor(route.httpMethod, route.permissionAction);

    const stillGeneric = mutatingRoutes()
      .filter((route) => route.httpMethod === 'DELETE' && !route.skipped)
      .filter((route) => effectiveAction(route) === 'Delete')
      .map((route) => `${route.name}  (${route.file}:${route.line})`);

    expect(stillGeneric).toEqual([]);
  });

  /**
   * I8 (independent review, round 4). `ArticlesService.writeArticleAudit`'s
   * four call sites hand-type `{ method, permissionAction }`, and nothing
   * compared those strings to `ArticlesController`'s actual decorators for
   * the same route — the four routes are all in `WRITES_ITS_OWN_ROW`, so the
   * derivation test above skips them entirely. Round 3's own claim ("a
   * future rename can no longer drift here") was therefore unenforced: a
   * rename of `articles:Archive` would leave the call site's literal
   * `'Archive'` exactly as stale as the old literal `'Delete'` was.
   *
   * Matched by the enclosing service method's NAME against the controller
   * handler's name — a service method carries no decorator of its own, so
   * the name is the only link between "this call" and "that route" static
   * analysis can read.
   */
  it("each writeArticleAudit call site matches its own route's actual decorators", () => {
    const HANDLERS = ['create', 'update', 'setArchived', 'remove', 'unarchive'] as const;

    const controllerRoutes = new Map(
      mutatingRoutes()
        .filter((route) => route.file.endsWith('public-communication/articles/articles.controller.ts'))
        .filter((route) => route.handlerName && (HANDLERS as readonly string[]).includes(route.handlerName))
        .map((route) => [route.handlerName as string, { httpMethod: route.httpMethod, permissionAction: route.permissionAction }]),
    );

    const servicePath = join(
      process.cwd(),
      'src/modules/public-communication/articles/articles.service.ts',
    );
    const serviceSource = stripComments(readFileSync(servicePath, 'utf8'));

    /** The balanced `{ … }` body of the arrow function assigned to
     *  `<handlerName> = async (`, then the `{ method, permissionAction }`
     *  literal of the FIRST `writeArticleAudit(` call inside it. */
    const auditCallFor = (handlerName: string): { httpMethod?: string; permissionAction?: string } => {
      const start = serviceSource.indexOf(`${handlerName} = async (`);
      if (start === -1) {
        return {};
      }
      // The `{` right after the arrow — NOT the first `{` after `start`,
      // which can belong to a default parameter value (`context:
      // RequestContext = {}`) and would close again immediately, before the
      // real body is ever read.
      const arrow = serviceSource.indexOf('=>', start);
      const bodyStart = serviceSource.indexOf('{', arrow);
      let depth = 1;
      let i = bodyStart + 1;
      while (i < serviceSource.length && depth > 0) {
        if (serviceSource[i] === '{') depth++;
        else if (serviceSource[i] === '}') depth--;
        i++;
      }
      const body = serviceSource.slice(bodyStart, i);
      const call = body.match(/writeArticleAudit\(\{[\s\S]*?\}\)/);
      const methodMatch = call?.[0].match(/method:\s*'([^']+)'/);
      const permissionMatch = call?.[0].match(/permissionAction:\s*'([^']+)'/);
      return { httpMethod: methodMatch?.[1], permissionAction: permissionMatch?.[1] };
    };

    const mismatched = HANDLERS.filter((handler) => controllerRoutes.has(handler)).flatMap((handler) => {
      const route = controllerRoutes.get(handler);
      const call = auditCallFor(handler);
      return route?.httpMethod === call.httpMethod && route?.permissionAction === call.permissionAction
        ? []
        : [`${handler}: route says (${route?.httpMethod}, ${route?.permissionAction}), call site says (${call.httpMethod}, ${call.permissionAction})`];
    });

    expect(mismatched).toEqual([]);
  });
});
