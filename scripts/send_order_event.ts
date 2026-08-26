const response = await fetch("http://localhost:3000/order-updates", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    orderId: "ORDER-1042",
    customerName: "Mina",
    status: "shipped",
    carrier: "Parcel Post",
    trackingNumber: "PP-88421",
  }),
});

const body: unknown = await response.json();
console.log(response.status, body);

export {};
