/** What login/refresh return: a short-lived access token plus a longer-lived
 *  refresh token (durations: BE-PLAN-010 §4.3). */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
