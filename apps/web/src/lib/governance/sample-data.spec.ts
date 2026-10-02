import { describe, expect, it } from "vitest";

import {
  sampleBoardPage,
  sampleCommittee,
  sampleCommitteeSlugs,
  sampleCommitteesIndex,
  samplePersonProfile,
  samplePersonSlugs,
} from "./sample-data";

/**
 * The sample exists to exercise states, so these assert the states are there.
 *
 * A review fixture that quietly stops covering a case is worse than no fixture:
 * the page still renders, the reviewer still signs it off, and the state nobody
 * saw is the one that breaks when real content arrives.
 */
describe("the governance sample", () => {
  it("names nothing — every string a page prints is a bracketed placeholder", () => {
    // The federation has approved no names, and `[` is how the design files
    // mark text that is still waiting. A name that lost its brackets would read
    // as real content on a page that is not.
    const board = sampleBoardPage();
    const printed = [
      ...board.chart.rows.flatMap((row) => row.posts),
      ...board.members,
    ].flatMap((post) => [
      post.person.name.ar,
      post.person.name.en,
      post.position.title.ar,
      post.position.title.en,
    ]);

    expect(printed.length).toBeGreaterThan(0);
    expect(printed.filter((text) => !text.startsWith("["))).toEqual([]);
  });

  describe("committees", () => {
    const index = sampleCommitteesIndex();

    it("covers a standing committee with children and one without", () => {
      expect(index.standing.some((each) => each.children.length > 0)).toBe(true);
      expect(index.standing.some((each) => each.children.length === 0)).toBe(true);
    });

    it("covers a sub-committee reporting to the board", () => {
      expect(index.boardSubCommittees.length).toBeGreaterThan(0);
      expect(index.boardSubCommittees.every((each) => each.parentCommitteeId === null)).toBe(true);
    });

    it("keeps an unclassified committee out of both public groups", () => {
      // `kind` is the admin's choice and starts empty. Until it is made, the
      // committee belongs to neither list and must not be guessed into one.
      const shown = [...index.standing, ...index.boardSubCommittees];
      expect(shown.every((each) => each.kind !== null)).toBe(true);
      expect(sampleCommittee("committee-seven")).toBeNull();
    });

    it("covers a committee nobody chairs", () => {
      expect(index.standing.some((each) => each.chair === null)).toBe(true);
    });

    it("covers a chair who holds no board post", () => {
      const boardHolders = new Set(sampleBoardPage().chart.rows.flatMap((row) => row.posts).map((post) => post.person.id));
      const chairs = index.standing.flatMap((each) => (each.chair ? [each.chair.person.id] : []));
      expect(chairs.some((id) => !boardHolders.has(id))).toBe(true);
    });

    it("covers a committee with nothing filled in, so its sections drop", () => {
      const bare = sampleCommittee("committee-two");
      expect(bare).not.toBeNull();
      expect(bare!.about).toBeNull();
      expect(bare!.duties).toEqual([]);
      expect(bare!.documents).toEqual([]);
      expect(bare!.formationDecision).toBeNull();
    });

    it("resolves a child's parent and leaves a board-level sub without one", () => {
      expect(sampleCommittee("committee-four")!.parent).not.toBeNull();
      const boardSub = sampleCommittee("committee-six")!;
      expect(boardSub.kind).toBe("sub");
      expect(boardSub.parent).toBeNull();
    });

    it("serves every slug it advertises", () => {
      for (const slug of sampleCommitteeSlugs()) {
        expect(sampleCommittee(slug), slug).not.toBeNull();
      }
    });
  });

  describe("profiles", () => {
    it("covers a record that fills every scene", () => {
      const full = samplePersonProfile("person-one")!;
      expect(full.person.bio).not.toBeNull();
      expect(full.person.cv.qualifications.length).toBeGreaterThan(0);
      expect(full.person.cv.certifications.length).toBeGreaterThan(0);
      expect(full.person.cv.previousPositions.length).toBeGreaterThan(0);
      expect(full.person.cv.achievements.length).toBeGreaterThan(0);
    });

    it("covers an empty record, so four scenes and their nav entries drop", () => {
      const empty = samplePersonProfile("person-two")!;
      expect(empty.person.bio).toBeNull();
      expect(empty.person.cv.qualifications).toEqual([]);
      expect(empty.person.cv.certifications).toEqual([]);
      expect(empty.person.cv.previousPositions).toEqual([]);
      expect(empty.person.cv.achievements).toEqual([]);
    });

    it("withholds contact details unless the record publishes them", () => {
      // Both halves, because the page checks both: the switch is the rule and
      // the null is what makes breaking the rule impossible.
      const shown = samplePersonProfile("person-one")!.person;
      expect(shown.showPublicContact).toBe(true);
      expect(shown.publicContact).not.toBeNull();

      const withheld = samplePersonProfile("person-two")!.person;
      expect(withheld.showPublicContact).toBe(false);
      expect(withheld.publicContact).toBeNull();
    });

    it("covers posts closed in an earlier cycle", () => {
      const previous = samplePersonProfile("person-one")!.previous;
      expect(previous.length).toBeGreaterThan(0);
      expect(previous.every((post) => post.termEnd !== null)).toBe(true);
      expect(previous.every((post) => post.endReason !== null)).toBe(true);
      expect(previous.every((post) => post.cycle.isCurrent === false)).toBe(true);
    });

    it("leaves every current post open", () => {
      const current = samplePersonProfile("person-one")!.current;
      expect(current.length).toBeGreaterThan(0);
      expect(current.every((post) => post.termEnd === null)).toBe(true);
    });

    it("serves every slug it advertises, and nothing else", () => {
      for (const slug of samplePersonSlugs()) {
        expect(samplePersonProfile(slug), slug).not.toBeNull();
      }
      expect(samplePersonProfile("nobody")).toBeNull();
    });
  });

  describe("the board", () => {
    const board = sampleBoardPage();

    it("puts one person in the top rank and orders the rows by it", () => {
      expect(board.chairman).not.toBeNull();
      expect(board.chairman!.position.rank).toBe(1);
      const ranks = board.chart.rows.map((row) => row.rank);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    });

    it("groups positions that share a rank into one row", () => {
      // Equal rank means equal level, which is what puts two posts side by
      // side rather than one above the other.
      const second = board.chart.rows.find((row) => row.rank === 2);
      expect(second?.posts.length).toBeGreaterThan(1);
    });
  });
});
