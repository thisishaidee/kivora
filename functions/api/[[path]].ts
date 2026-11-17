import worker from "../../worker/src/index";

type PagesContext = {
  request: Request;
  env: Parameters<typeof worker.fetch>[1];
};

export const onRequest = ({ request, env }: PagesContext): Promise<Response> =>
  worker.fetch(request, env);
