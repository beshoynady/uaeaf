import { describe, expect, it } from "vitest";
import {
  EDITORIAL_ACTIONS,
  EDITORIAL_ENTITIES,
  editorialActionPath,
  editorialSavePath,
  findEditorialEntity,
  isEditorialAction,
} from "./editorial-entities";

/**
 * The registry is the security boundary of the generic editorial route: the
 * URL supplies both the entity type and the action, and these two lookups are
 * all that stands between a typed URL and an arbitrary upstream endpoint.
 */
const president = EDITORIAL_ENTITIES[0];

describe("findEditorialEntity", () => {
  it("resolves a registered type", () => {
    expect(findEditorialEntity("presidentMessagePage")?.apiPath).toBe("/president-message-page");
  });

  // Without this the URL would choose the upstream module, and
  // `/api/admin/editorial/users/<id>/…` would forward a body to the users
  // controller.
  it("refuses a type that is not registered, however plausible", () => {
    expect(findEditorialEntity("users")).toBeUndefined();
    expect(findEditorialEntity("roles")).toBeUndefined();
    expect(findEditorialEntity("visionMissionPage")).toBeUndefined();
  });

  it("refuses a traversal attempt rather than treating it as a path", () => {
    expect(findEditorialEntity("../workflow-policies")).toBeUndefined();
  });
});

describe("isEditorialAction", () => {
  // Delegation is disabled upstream pending the workflow audit's open
  // questions. A route that cannot name the action cannot forward it.
  it("does not recognise delegate", () => {
    expect(isEditorialAction("delegate")).toBe(false);
    expect(EDITORIAL_ACTIONS).not.toContain("delegate");
  });

  it("recognises exactly the seven decisions the panel offers", () => {
    expect([...EDITORIAL_ACTIONS].sort()).toEqual(
      ["approve", "publish", "reject", "restore", "resubmit", "return", "submit"].sort(),
    );
  });

  it("refuses anything else", () => {
    for (const action of ["delete", "archive", "", "publish/../../users"]) {
      expect(isEditorialAction(action)).toBe(false);
    }
  });
});

describe("editorialActionPath", () => {
  it("mounts an action on the record's own controller", () => {
    expect(editorialActionPath(president, "publish", "abc")).toBe("/president-message-page/abc/publish");
    expect(editorialActionPath(president, "restore", "abc")).toBe("/president-message-page/abc/restore");
    expect(editorialActionPath(president, "submit", "abc")).toBe("/president-message-page/abc/submit");
  });

  // A review decision belongs to the workflow instance, which is a different
  // collection with a different id — so the caller passes that id, and the
  // target is declared in the registry rather than inferred from the name.
  it("mounts a review decision on the workflow instance", () => {
    expect(editorialActionPath(president, "approve", "wf1")).toBe("/workflow-instances/wf1/approve");
    expect(editorialActionPath(president, "reject", "wf1")).toBe("/workflow-instances/wf1/reject");
    expect(editorialActionPath(president, "return", "wf1")).toBe("/workflow-instances/wf1/return");
    expect(editorialActionPath(president, "resubmit", "wf1")).toBe("/workflow-instances/wf1/resubmit");
  });
});

describe("editorialSavePath", () => {
  it("patches the record itself", () => {
    expect(editorialSavePath(president, "abc")).toBe("/president-message-page/abc");
  });
});

describe("the registry as a whole", () => {
  it("names a permission for every registered type, so a screen can hide what the API would refuse", () => {
    for (const entity of EDITORIAL_ENTITIES) {
      expect(entity.readPermission).toBe(`${entity.entityType}:Read`);
      expect(entity.updatePermission).toBe(`${entity.entityType}:Update`);
      expect(entity.publishPermission).toBe(`${entity.entityType}:Publish`);
    }
  });

  it("starts every api path at the root, so none can be read as relative", () => {
    for (const entity of EDITORIAL_ENTITIES) {
      expect(entity.apiPath.startsWith("/")).toBe(true);
      expect(entity.apiPath).not.toContain("..");
    }
  });
});
