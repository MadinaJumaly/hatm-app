import { Hono } from "hono";
import type { MeView, SeatStatusRequest } from "../../shared/api.ts";
import { todayInKz } from "../../shared/dates.ts";
import type { AppEnv } from "../app-env.ts";
import { endParticipantSession, readParticipantSession } from "../auth/session.ts";
import { findCurrentRound, findGroupById } from "../db/groups.ts";
import { findOwnSeat, listSeats, setSeatStatus } from "../db/seats.ts";
import { apiError, isRecord, parseId, readJson } from "../lib/http.ts";
import { nowIso } from "../lib/time.ts";

/** Routes for the logged-in participant: /api/me… and /api/logout. */
export const meApi = new Hono<AppEnv>();

// API #3: everything the home screen shows (P-2, P-5).
meApi.get("/me", async (c) => {
  const session = await readParticipantSession(c);
  if (!session) return apiError(c, 401, "no_session");

  const group = await findGroupById(c.env.DB, session.groupId);
  const round = await findCurrentRound(c.env.DB, session.groupId);
  if (!group || !round) return apiError(c, 401, "no_session");

  const seats = await listSeats(c.env.DB, round.id);
  const body: MeView = {
    group: { title: group.title, linkToken: group.linkToken },
    round: { durationDays: round.durationDays, deadlineDate: round.deadlineDate },
    today: todayInKz(new Date()),
    me: {
      memberId: session.memberId,
      name: session.memberName,
      seatId: seats.find((seat) => seat.memberId === session.memberId)?.id ?? null,
    },
    seats,
  };
  return c.json(body);
});

function parseStatusRequest(body: unknown): SeatStatusRequest | null {
  if (!isRecord(body) || typeof body.read !== "boolean") return null;
  if (body.via === undefined) return { read: body.read };
  return body.via === "undo" && !body.read ? { read: false, via: "undo" } : null;
}

// API #4: «Оқыдым», undo and remove mark (P-3, P-4). Own seat only.
meApi.put("/me/seats/:seatId/status", async (c) => {
  const session = await readParticipantSession(c);
  if (!session) return apiError(c, 401, "no_session");

  const request = parseStatusRequest(await readJson(c));
  const seatId = parseId(c.req.param("seatId"));
  if (!request || seatId === null) return apiError(c, 400, "invalid");

  const seat = await findOwnSeat(c.env.DB, seatId, session.memberId);
  if (!seat) return apiError(c, 403, "forbidden");

  const view = await setSeatStatus(c.env.DB, {
    seat,
    status: request.read ? "read" : "unread",
    action: request.read ? "mark" : (request.via ?? "unmark"),
    actor: { role: "participant", memberId: session.memberId },
    now: nowIso(),
  });
  return c.json({ seat: view });
});

// API #5: «Шығу» (P-7). Always answers 200, even without a session.
meApi.post("/logout", async (c) => {
  await endParticipantSession(c);
  return c.json({ ok: true });
});
