import { describe, expect, it } from "vitest";
import {
  countByFilter,
  matchesFilter,
  readStatusBody,
  statusOnOpening,
  type ContactMessage,
} from "./contact-messages";

/**
 * The messages screen's rules, apart from the screen (owner request
 * 2026-09-22): the filters and what they count, what opening a message does
 * to it, and the one body the status route forwards.
 */

const message = (status: ContactMessage["status"]): Pick<ContactMessage, "status"> => ({ status });

describe("the status filters", () => {
  const inbox = [message("New"), message("New"), message("InProgress"), message("Closed")];

  it("counts every message under each filter, whatever is on show", () => {
    expect(countByFilter(inbox)).toEqual({ all: 4, New: 2, InProgress: 1, Resolved: 0, Closed: 1 });
  });

  it("keeps a message under its own status and under all", () => {
    expect(matchesFilter(message("Resolved"), "Resolved")).toBe(true);
    expect(matchesFilter(message("Resolved"), "all")).toBe(true);
    expect(matchesFilter(message("Resolved"), "New")).toBe(false);
  });
});

describe("statusOnOpening", () => {
  it("moves a new message on when someone opens it: it has been read", () => {
    expect(statusOnOpening("New")).toBe("InProgress");
  });

  it("leaves every other status as it is", () => {
    // Opening a resolved message to re-read it must not reopen it.
    expect(statusOnOpening("InProgress")).toBeNull();
    expect(statusOnOpening("Resolved")).toBeNull();
    expect(statusOnOpening("Closed")).toBeNull();
  });
});

describe("readStatusBody", () => {
  it("forwards one of the four statuses and nothing else", () => {
    expect(readStatusBody({ status: "Resolved" })).toEqual({ status: "Resolved" });
    // The reply fields stay out of reach of this route (replying is out of scope).
    expect(readStatusBody({ status: "Closed", replyBody: "x" })).toEqual({ status: "Closed" });
  });

  it("refuses a status the API does not know, and a body that is not one", () => {
    expect(readStatusBody({ status: "Archived" })).toBeNull();
    expect(readStatusBody({})).toBeNull();
    expect(readStatusBody(null)).toBeNull();
    expect(readStatusBody("Resolved")).toBeNull();
  });
});
