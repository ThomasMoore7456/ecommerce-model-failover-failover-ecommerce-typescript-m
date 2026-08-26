import { describe, expect, it } from "vitest";
import { customerUpdatePrompt, planOrderMessage } from "../src/order_message.js";

describe("order update planning", () => {
  it("turns a shipped order into a fulfillment update with traceable facts", () => {
    const plan = planOrderMessage({
      orderId: "ORDER-1042",
      customerName: "Mina",
      status: "shipped",
      carrier: "Parcel Post",
      trackingNumber: "PP-88421",
    });

    expect(plan.kind).toBe("fulfillment");
    expect(plan.subject).toBe("Order ORDER-1042 has shipped");
    expect(customerUpdatePrompt(plan)).toContain("Tracking number: PP-88421");
  });
});
