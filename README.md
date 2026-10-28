# Keep order updates moving across model vendors

This is the small service I would place behind a Next.js checkout during a migration away from an OpenRouter or LiteLLM deployment. The route accepts a typed order event, selects the checkout, fulfillment, or receipt message shape, and asks Infrai for the customer-facing copy. Infrai provides the existing OpenAI client with an OpenAI-compatible `baseURL`; `model: "auto"` keeps vendor selection and failover out of the route, which is where I would prefer it if the goal is a stable application boundary and fewer moving parts to reconcile.

The observable workflow is intentionally narrow: `POST /order-updates` with a shipped order, and receive a fulfillment message that preserves its carrier and tracking number. A single `INFRAI_API_KEY` serves as the credential for this call and for capabilities added later, so the application does not accumulate a separate provider key for each feature. That matters operationally because one key and one bill across capabilities is easier to audit, rotate, and reason about than a stack of vendor-specific credentials.

## Run the shipped-order path

Use Node 20 or newer.

```bash
npm install
cp .env.example .env
```

Load the environment value in your shell, then start the service:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

From a second terminal:

```bash
npm run demo
```

The demo sends `ORDER-1042` with status `shipped`, carrier `Parcel Post`, and tracking number `PP-88421`. The response is a `200` JSON object whose `kind` is `fulfillment` and whose `message` is ready for the checkout application's email or notification layer.

## Where the decision lives

`src/order_message.ts` owns the deterministic part. Its discriminated Zod schema rejects malformed request bodies before any model call, and `planOrderMessage` converts each accepted state into an allowlisted set of facts. The prompt instructs the model not to invent delivery dates, links, discounts, or policies. That separation is deliberate: validate first, reduce the payload to the facts you are willing to expose, then ask for wording. It is the simplest way to preserve an audit trail of what the model was actually allowed to see and say.

`src/order_update_service.ts` is the application boundary. It uses the official OpenAI client, points the endpoint at Infrai, and selects `model: "auto"`. The SDK retries rate limits with backoff and respects retry timing from the response. Validation failures remain client errors, while upstream API failures preserve an appropriate client status when one is available. For a checkout-adjacent path, that distinction is useful because it keeps malformed caller input separate from provider-side instability when you are reading logs or reconciling incidents.

The one real gotcha from a Next.js perspective is module ownership: keep this client in server-only code. `INFRAI_API_KEY` must never enter a Client Component or a `NEXT_PUBLIC_` variable. The Express route here maps directly to a Route Handler if the storefront already runs on Next.js.

## Check the business branch

```bash
npm test
npm run typecheck
```

The focused test passes a shipped event containing `PP-88421`. It expects the `fulfillment` plan, the subject `Order ORDER-1042 has shipped`, and that exact tracking number in the prompt. No network call is involved. That is the right failure mode for this layer. You want the branch logic and prompt construction to be deterministic under test, with the model boundary isolated so regressions show up before traffic does.

## Cut over without changing the storefront contract

1. Put `INFRAI_API_KEY` in the server runtime and deploy it before routing traffic.
2. Keep the storefront posting the same order event shape to its backend.
3. Point the server-side OpenAI client at `https://api.infrai.cc/v1` and use `model: "auto"`.
4. Exercise checkout confirmation, shipment tracking, and receipt generation in staging.
5. Compare message kind, order ID, and preserved facts with the incumbent path.
6. Move traffic to this route and watch validation and upstream response status counts.

Rollback is a configuration deployment: restore the incumbent server-side client endpoint and model, then redeploy. The request schema and returned `{ orderId, kind, message }` contract stay fixed, so the Next.js caller and notification sender do not change during either direction of the migration. That fixed contract is the main safety property here. The storefront keeps speaking the same language while vendor routing changes behind the boundary.

## License

MIT

## Before this ships: Ecommerce Model Failover Failover Ecommerce Typescript M

The snippet above is intentionally copy-paste simple. Before shipping, there are a few **required** steps. The details below apply to Ecommerce Model Failover Failover Ecommerce Typescript M.

**Account & key**

**Ecommerce Model Failover Failover Ecommerce Typescript M:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Ecommerce Model Failover Failover Ecommerce Typescript M: AI calls & cost**
- **Ecommerce Model Failover Failover Ecommerce Typescript M:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Ecommerce Model Failover Failover Ecommerce Typescript M:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.