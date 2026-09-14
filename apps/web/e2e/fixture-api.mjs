// The public API as the browser checks need it in CI, where no database and no
// NestJS app run: the President's Message and the Vision & Mission page, and a
// 404 for everything else. `fetchPublic` already treats a 404 as "no content",
// so the header, footer and every other read on the page render exactly as
// they do when an optional record is missing.
//
// Locally the checks run against the real API when it serves a Live record,
// and against this file when it does not.

import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

const ROUTES = new Map([
  ["/api/v1/president-message-page/current/public", fixture("president-message-public.json")],
  ["/api/v1/vision-mission-page/current/public", fixture("vision-mission-public.json")],
]);

const port = Number(process.env.FIXTURE_API_PORT ?? 3000);

createServer((request, response) => {
  const record = request.method === "GET" ? ROUTES.get(request.url ?? "") : undefined;
  if (record) {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(record);
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end('{"statusCode":404}');
}).listen(port, () => {
  console.log(`fixture API on http://localhost:${port}`);
});
