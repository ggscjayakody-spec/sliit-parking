import { handle } from "@/server/handlers";

// One catch-all route for the whole backend. See src/server/handlers.ts for the endpoints.
type Ctx = { params: Promise<{ path: string[] }> };
const run = async (req: Request, ctx: Ctx) => handle(req, (await ctx.params).path);

export const GET = run;
export const POST = run;
export const PATCH = run;
