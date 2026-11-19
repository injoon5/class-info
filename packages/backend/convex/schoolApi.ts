import { SCHOOL, SCHOOL_API_BASE_URL } from "./config";

// The timefor.school API, for the configured school. Errors arrive as
// `{ ok: false, error: { code, message } }`; older deploys send a bare body,
// so the status line stands in.

export class SchoolApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(`School API ${status}${code ? ` ${code}` : ""}: ${message}`);
  }
}

async function readError(res: Response): Promise<SchoolApiError> {
  const statusLine = `${res.status} ${res.statusText}`;
  const body: unknown = await res.json().catch(() => null);
  const error = (body as { error?: unknown } | null)?.error;
  if (!error || typeof error !== "object") return new SchoolApiError(res.status, "", statusLine);
  const { code, message } = error as Record<string, unknown>;
  return new SchoolApiError(
    res.status,
    typeof code === "string" ? code : "",
    typeof message === "string" && message ? message : statusLine
  );
}

/** GET `path` for the configured school; throws SchoolApiError on a non-2xx. */
export async function fetchSchoolApi(
  path: "timetable" | "lunch" | "schedule",
  params: Record<string, string | number>
): Promise<unknown> {
  const url = new URL(path, `${SCHOOL_API_BASE_URL}/`);
  url.searchParams.set("schoolcode", SCHOOL.code);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw await readError(res);
  return await res.json();
}
