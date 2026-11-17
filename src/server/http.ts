import "server-only";

/** Throw this from a handler to send `{ message }` with a status code. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const bad = (message: string) => new HttpError(400, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw bad("The request body must be JSON.");
  }
}

export async function readForm(req: Request): Promise<FormData> {
  try {
    return await req.formData();
  } catch {
    throw bad("The request must be sent as a form (multipart/form-data).");
  }
}

export const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
