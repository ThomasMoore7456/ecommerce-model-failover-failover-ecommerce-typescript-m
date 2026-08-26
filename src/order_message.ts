import { z } from "zod";

export const orderEventSchema = z.discriminatedUnion("status", [
  z.object({
    orderId: z.string().min(1),
    customerName: z.string().min(1),
    status: z.literal("checkout_confirmed"),
    total: z.string().min(1),
  }),
  z.object({
    orderId: z.string().min(1),
    customerName: z.string().min(1),
    status: z.literal("shipped"),
    carrier: z.string().min(1),
    trackingNumber: z.string().min(1),
  }),
  z.object({
    orderId: z.string().min(1),
    customerName: z.string().min(1),
    status: z.literal("receipt_ready"),
    receiptNumber: z.string().min(1),
  }),
]);

export type OrderEvent = z.infer<typeof orderEventSchema>;

export type MessagePlan = {
  kind: "checkout" | "fulfillment" | "receipt";
  subject: string;
  facts: string[];
};

export function planOrderMessage(event: OrderEvent): MessagePlan {
  if (event.status === "checkout_confirmed") {
    return {
      kind: "checkout",
      subject: `Order ${event.orderId} is confirmed`,
      facts: [`Customer: ${event.customerName}`, `Total: ${event.total}`],
    };
  }

  if (event.status === "shipped") {
    return {
      kind: "fulfillment",
      subject: `Order ${event.orderId} has shipped`,
      facts: [
        `Customer: ${event.customerName}`,
        `Carrier: ${event.carrier}`,
        `Tracking number: ${event.trackingNumber}`,
      ],
    };
  }

  return {
    kind: "receipt",
    subject: `Receipt for order ${event.orderId}`,
    facts: [`Customer: ${event.customerName}`, `Receipt number: ${event.receiptNumber}`],
  };
}

export function customerUpdatePrompt(plan: MessagePlan): string {
  return [
    "Write a concise transactional e-commerce email in plain text.",
    `Message type: ${plan.kind}`,
    `Subject: ${plan.subject}`,
    ...plan.facts,
    "Use only these facts. Do not add delivery dates, links, discounts, or policies.",
  ].join("\n");
}
