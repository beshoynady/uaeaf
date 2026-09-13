// The public API as the browser checks need it in CI, where no database and no
// NestJS app run: the President's Message record, and a 404 for everything
// else. `fetchPublic` already treats a 404 as "no content", so the header,
// footer and every other read on the page render exactly as they do when an
// optional record is missing.
//
// Locally the checks run against the real API instead; this file is not used.

import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const record = readFileSync(new URL("./fixtures/president-message-public.json", import.meta.url));
const port = Number(process.env.FIXTURE_API_PORT ?? 3000);

createServer((request, response) => {
  if (request.method === "GET" && request.url === "/api/v1/president-message-page/current/public") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(record);
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end('{"statusCode":404}');
}).listen(port, () => {
  console.log(`fixture API on http://localhost:${port}`);
});
