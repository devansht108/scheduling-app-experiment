import { test, expect } from "@playwright/test";

test("Book Reservation API Flow", async ({ request }) => {
  const response = await request.post(
    "http://localhost:3000/api/vapi/tool-call",
    {
      data: {
        date: "23 February 2027",
        time: "8 PM",
        customer_name: "Devansh",
        durationMinutes: 120,
        purpose: "Dinner",
      },
    },
  );

  expect(response.ok()).toBeTruthy();

  const body = await response.json();

  console.log(body);

  expect(body.success).toBeTruthy();
});

test("Reject Duplicate Reservation", async ({ request }) => {
  await request.post("http://localhost:3000/api/vapi/tool-call", {
    data: {
      date: "24 February 2027",
      time: "8 PM",
      customer_name: "Devansh",
      durationMinutes: 120,
      purpose: "Dinner",
    },
  });

  const duplicateResponse = await request.post(
    "http://localhost:3000/api/vapi/tool-call",
    {
      data: {
        date: "24 February 2027",
        time: "9 PM",
        customer_name: "Devansh",
        durationMinutes: 120,
        purpose: "Dinner",
      },
    },
  );

  expect(duplicateResponse.ok()).toBeTruthy();

  const body = await duplicateResponse.json();

  console.log(body);

  expect(body.success).toBeFalsy();
});

test("Reject Reservation Outside Business Hours", async ({ request }) => {
  const response = await request.post(
    "http://localhost:3000/api/vapi/tool-call",
    {
      data: {
        date: "25 February 2027",
        time: "10:30 PM",
        customer_name: "Late Customer",
        durationMinutes: 120,
        purpose: "Late Dinner",
      },
    },
  );

  expect(response.ok()).toBeTruthy();

  const body = await response.json();

  console.log(body);

  expect(body.success).toBeFalsy();
});
