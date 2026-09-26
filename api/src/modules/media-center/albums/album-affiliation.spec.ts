import { assertAffiliationShape } from './album-affiliation.js';

/**
 * These rules are about which fields are filled together, so they hold today
 * even though none of the four collections exists. What still cannot be
 * checked is whether an id resolves, and whether a championship really sits in
 * the season the editor named — both need the modules, and both are separate
 * from the shape being coherent in the first place.
 */
describe('assertAffiliationShape', () => {
  const id = () => '68d3f9b4c2a1e5d7f0b34a91';

  it('accepts an album with no affiliation at all', () => {
    expect(() => assertAffiliationShape({})).not.toThrow();
  });

  it('accepts a championship on its own, because a season is derived and never set', () => {
    expect(() => assertAffiliationShape({ championshipId: id() })).not.toThrow();
  });

  it('accepts a championship with a competition inside it', () => {
    expect(() => assertAffiliationShape({ championshipId: id(), competitionId: id() })).not.toThrow();
  });

  it('accepts a public event on its own', () => {
    expect(() => assertAffiliationShape({ publicEventId: id() })).not.toThrow();
  });

  it('refuses a competition with no championship', () => {
    expect(() => assertAffiliationShape({ competitionId: id() })).toThrow(/championship/i);
  });

  it('refuses a public event and a championship together', () => {
    expect(() => assertAffiliationShape({ championshipId: id(), publicEventId: id() })).toThrow(/both/i);
  });

  it('allows athletes and clubs on an album with no occasion', () => {
    expect(() => assertAffiliationShape({ athleteIds: [id()], clubIds: [id()] })).not.toThrow();
  });
});
