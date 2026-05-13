import { test, expect } from "@playwright/test";

test("Cancel Reservation API Flow", async ({ request }) => {
  const response = await request.post(
    "http://localhost:3000/api/vapi/tool-call",
    {
      data: {
        action: "cancel_reservation",
        customer_name: "Devansh",
        date: "23 February 2027",
      },
    },
  );

  expect(response.ok()).toBeTruthy();

  const body = await response.json();

  console.log(body);
});

test("Reject Cancellation Of Non Existing Reservation", async ({ request }) => {
  const response = await request.post(
    "http://localhost:3000/api/vapi/tool-call",
    {
      data: {
        action: "cancel_reservation",
        customer_name: "Non Existing User",
        date: "28 February 2027",
      },
    },
  );

  expect(response.ok()).toBeTruthy();

  const body = await response.json();

  console.log(body);

  expect(body.success).toBeFalsy();
});
