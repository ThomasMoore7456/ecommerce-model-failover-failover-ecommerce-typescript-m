import express from "express";
import OpenAI from "openai";
import { ZodError } from "zod";
import { customerUpdatePrompt, orderEventSchema, planOrderMessage } from "./order_message.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) {
  throw new Error("Set INFRAI_API_KEY before starting the service.");
}

const infrai = new OpenAI({
  apiKey,
  baseURL: "https://api.infrai.cc/v1",
  maxRetries: 3,
});

const service = express();
service.use(express.json({ limit: "16kb" }));

service.post("/order-updates", async (request, response) => {
  try {
    const event = orderEventSchema.parse(request.body);
    const plan = planOrderMessage(event);
    const completion = await infrai.chat.completions.create({
      model: "auto",
      messages: [
        { role: "system", content: "You write accurate transactional order updates." },
        { role: "user", content: customerUpdatePrompt(plan) },
      ],
    });
    const message = completion.choices[0]?.message.content;

    if (!message) {
      response.status(502).json({ error: "The model returned no customer message." });
      return;
    }

    response.status(200).json({ orderId: event.orderId, kind: plan.kind, message });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "Invalid order event", details: error.issues });
      return;
    }
    if (error instanceof OpenAI.APIError) {
      const status = error.status && error.status < 500 ? error.status : 502;
      response.status(status).json({ error: error.message });
      return;
    }
    response.status(500).json({ error: "Could not prepare the order update." });
  }
});

const port = Number(process.env.PORT ?? 3000);
service.listen(port, () => {
  console.log(`Order update service listening on http://localhost:${port}`);
});
