type EmailEnv = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  APP_BASE_URL?: string;
};

export const onRequestGet = ({ env }: { env: EmailEnv }): Response =>
  Response.json({
    email_delivery: {
      resend_key_present: Boolean(env.RESEND_API_KEY),
      sender_present: Boolean(env.EMAIL_FROM),
      app_url_present: Boolean(env.APP_BASE_URL),
      app_url_https: Boolean(env.APP_BASE_URL && /^https:\/\//i.test(env.APP_BASE_URL)),
    },
  }, {
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
