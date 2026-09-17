/**
 * The footer’s four ribbons, `public/brand/swoosh-*.svg`, as path data: the
 * shapes every identity stroke on the site is drawn from (ADR-0069 D10).
 * Shared by the identity lines and by the scroll cue, which is why it is its
 * own module rather than a constant inside either.
 */
export const IDENTITY_RIBBONS = {
  red: {
    d: "M0 11.5C70.7 10.35 131.3 3.45 190.457 0C196.806 0 202 5.175 202 11.5C202 17.825 196.806 23 190.457 23C131.3 19.55 70.7 12.65 0 11.5Z",
    width: 202,
    height: 23,
  },
  green: {
    d: "M0 19C101.15 17.1 187.85 5.7 270.215 0C280.547 0 289 8.55 289 19C289 29.45 280.547 38 270.215 38C187.85 32.3 101.15 20.9 0 19Z",
    width: 289,
    height: 38,
  },
  ink: {
    d: "M0 13C80.85 11.7 150.15 3.9 218.006 0C225.153 0 231 5.85 231 13C231 20.15 225.153 26 218.006 26C150.15 22.1 80.85 14.3 0 13Z",
    width: 231,
    height: 26,
  },
  redSmall: {
    d: "M0 8.5C50.75 7.65 94.25 2.55 136.3 0C141.085 0 145 3.825 145 8.5C145 13.175 141.085 17 136.3 17C94.25 14.45 50.75 9.35 0 8.5Z",
    width: 145,
    height: 17,
  },
};
