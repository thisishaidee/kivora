import worker from "../../worker/src/runtime.js";

type PagesContext = {
  request: Request;
  env: unknown;
};

export const onRequest = ({ request, env }: PagesContext): Promise<Response> =>
  worker.fetch(request, env as never);
