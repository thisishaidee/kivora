# KIVORA AI response pipeline

## Provider

The first provider adapter targets Cloudflare Workers AI with `@cf/zai-org/glm-4.7-flash`. This model is listed by Cloudflare among models available on the Workers Free plan. The adapter is provider-isolated so a later provider can be added without moving safety policy into the model.

## Cost boundary

Workers AI currently documents a 10,000-Neuron daily free allocation. On Workers Paid, usage above that allowance is billable. KIVORA therefore ships with `AI_ENABLED=false`; the model binding and adapter do not imply that inference is enabled. Do not change this flag until the account's actual plan and billing behavior have been verified and the owner explicitly confirms that no paid usage can occur. On a Free plan, requests beyond the free allocation fail rather than being billed.

A per-worker rate limiter is also required before model calls. No provider API key, paid external provider, wallet requirement, or paid KIVORA plan is introduced.

## Request flow

1. Authenticate the worker using the private HttpOnly session.
2. Verify the supplied work-session ID belongs to that worker and the selected trade matches.
3. Parse the work request and load only shared evidence that is approved, rights-cleared, and reviewed by a qualified reviewer or manufacturer.
4. Run deterministic trade and safety triage first.
5. If the result is `clarify` or `escalate`, do not call the model.
6. If the result is `guided`, call the configured provider only when `AI_ENABLED=true`, the AI binding exists, and the AI rate limiter allows the request.
7. Send only the task context, deterministic assessment, and a bounded set of applicable reviewed evidence excerpts.
8. Validate the model response. Every technical block must cite exact reviewed evidence IDs. Reject invented citations, unsupported measurements, prohibited instructions, malformed output, or provider errors.
9. Safety level and compatibility status are taken from deterministic assessment, never model output. Compatibility remains undetermined.
10. Save the response to the worker-owned work-session history.

## Output contract

The model returns JSON with:
- `summary`
- `blocks[]` containing `kind`, `content`, and `evidenceIds[]`
- `followUpQuestions[]`

Allowed block kinds are explanation, procedure, measurement, and parts. Safety instructions are deterministic and cannot be authored by the model.

## Current limitations

- Inference is intentionally disabled by default.
- No reviewed shared evidence corpus is populated yet, so most requests will ask for more context or evidence.
- The current lexical safety and measurement checks are guardrails, not proof that every sentence is factually correct. The model output still requires ongoing evaluation and worker validation.
- Nigerian English, Pidgin and French outputs need reviewed language and trade-specific terminology validation before broad use.
- No continuous conversation turn-taking or image/audio inputs are connected yet.


Preview build marker: 2026-11-15. Production deployment remains disabled.
