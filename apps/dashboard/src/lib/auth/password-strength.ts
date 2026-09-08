/**
 * Advisory password rating for the reset screen.
 *
 * Deliberately advisory. The API enforces exactly one rule — `@MinLength(12)`
 * on the password DTO, no complexity regex — so a meter that refused a
 * password for lacking a symbol would reject something the server accepts,
 * and the user would have no way to tell which side said no. `meetsMinimum`
 * is therefore the only value the form is allowed to gate submission on;
 * `strength` is guidance and nothing more.
 *
 * WCAG 2.2 SC 3.3.8 also applies: no rule here can be satisfied only from
 * memory, and nothing blocks paste or a password manager.
 */

/** Mirrors `@MinLength(12)` in api/src/.../dto/create-user.dto.ts. The two
 *  apps are separate deployables and cannot share the decorator; a change
 *  there is a deliberate, coordinated change to this line. */
export const MIN_PASSWORD_LENGTH = 12;

export type PasswordStrength = "tooShort" | "weak" | "fair" | "good" | "strong";

export interface PasswordAssessment {
  /** The only gate. True exactly when the API would accept the length. */
  meetsMinimum: boolean;
  strength: PasswordStrength;
  /** 0–4, for the meter's filled-segment count. */
  score: number;
}

/** Distinct characters below which extra length is padding, not entropy. */
const MIN_DISTINCT_FOR_LENGTH_CREDIT = 5;

const CHARACTER_CLASSES = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/];

export function assessPassword(value: string): PasswordAssessment {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { meetsMinimum: false, strength: "tooShort", score: 0 };
  }

  const classes = CHARACTER_CLASSES.filter((pattern) => pattern.test(value)).length;
  const distinct = new Set(value).size;
  const lengthBonus =
    distinct < MIN_DISTINCT_FOR_LENGTH_CREDIT ? 0 : value.length >= 20 ? 2 : value.length >= 16 ? 1 : 0;

  const raw = classes + lengthBonus;
  const strength: PasswordStrength =
    raw >= 5 ? "strong" : raw === 4 ? "good" : raw === 3 ? "fair" : "weak";

  return {
    meetsMinimum: true,
    strength,
    score: { weak: 1, fair: 2, good: 3, strong: 4 }[strength],
  };
}
