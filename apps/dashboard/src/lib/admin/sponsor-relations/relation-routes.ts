import { NextResponse } from "next/server";
import { forwardRead, forwardWrite } from "@/lib/api/admin-write";
import { isMongoId } from "../request-shapes";
import { readJson } from "../hero-requests";
import { readRelationBody, readSponsorsSectionBody, readStripBody, type RelationEntity } from "./requests";

/**
 * The route handlers behind the sponsors, partners and memberships screens
 * (ADR-0085), made once for the four entities: each create, edit and delete is
 * the same narrowing and forwarding with a different path and field list.
 *
 * The id is checked to be an id before it is placed in an upstream path, so a
 * caller never chooses which route a body is forwarded to.
 */

type Params = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ code: "notFound" }, { status: 404 });
const invalid = () => NextResponse.json({ code: "invalidRequest" }, { status: 400 });

export const createHandler = (entity: RelationEntity) => async (request: Request) => {
  const parsed = readRelationBody(entity, await readJson(request));
  if (!parsed.ok) return invalid();
  return forwardWrite(`/${entity}`, { method: "POST", body: parsed.body });
};

export const updateHandler = (entity: RelationEntity) => async (request: Request, { params }: Params) => {
  const { id } = await params;
  if (!isMongoId(id)) return notFound();
  const parsed = readRelationBody(entity, await readJson(request));
  if (!parsed.ok) return invalid();
  return forwardWrite(`/${entity}/${id}`, { method: "PATCH", body: parsed.body });
};

export const deleteHandler = (entity: RelationEntity) => async (_request: Request, { params }: Params) => {
  const { id } = await params;
  if (!isMongoId(id)) return notFound();
  return forwardWrite(`/${entity}/${id}`, { method: "DELETE" });
};

/**
 * The SPONSORS section's banner preference and call to action.
 *
 * The section is read first and must be SPONSORS. Without that check this route
 * would forward `{ configuration: { bannerSponsorshipId } }` to any section id
 * it was given, and on the hero it would replace the next-event bar and the
 * playback with it.
 */
export const sponsorsSectionHandler = async (request: Request, { params }: Params) => {
  const { id } = await params;
  if (!isMongoId(id)) return notFound();
  const parsed = readSponsorsSectionBody(await readJson(request));
  if (!parsed.ok) return invalid();

  const read = await forwardRead(`/page-sections/${id}`);
  if (!read.ok) return read;
  const current = (await read.json().catch(() => null)) as { sectionType?: unknown } | null;
  if (current?.sectionType !== "SPONSORS") return notFound();

  return forwardWrite(`/page-sections/${id}`, { method: "PATCH", body: parsed.body });
};

export const stripHandler = async (request: Request) => {
  const parsed = readStripBody(await readJson(request));
  if (!parsed.ok) return invalid();
  return forwardWrite("/site-settings/sponsor-strip", { method: "PUT", body: parsed.body });
};
