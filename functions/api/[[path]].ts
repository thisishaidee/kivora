type PagesContext = {
  request: Request;
  env: {
    KIVORA_API: { fetch(request: Request): Promise<Response> };
  };
};

export const onRequest = ({ request, env }: PagesContext): Promise<Response> =>
  env.KIVORA_API.fetch(request);
