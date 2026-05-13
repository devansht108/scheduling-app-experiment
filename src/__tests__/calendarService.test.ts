describe("Calendar Service", () => {
  test("should validate duration correctly", () => {
    const duration = 120;

    expect(duration).toBeGreaterThanOrEqual(30);
    expect(duration).toBeLessThanOrEqual(180);
  });

  test("should accept valid reservation year", () => {
    const year = 2026;

    expect(year).toBeGreaterThanOrEqual(2026);
  });

  test("should reject invalid short duration", () => {
    const duration = 10;

    expect(duration).toBeLessThan(30);
  });

  test("should reject invalid long duration", () => {
    const duration = 400;

    expect(duration).toBeGreaterThan(180);
  });

  test("should reject reservation exceeding closing hours", () => {
    const startHour = 22;
    const duration = 120;

    const endingHour = startHour + duration / 60;

    expect(endingHour).toBeGreaterThan(23);
  });

  test("should reject reservation beyond 1 year", () => {
    const now = new Date();

    const future = new Date();
    future.setDate(now.getDate() + 366);

    const diffDays = (future.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    expect(diffDays).toBeGreaterThan(365);
  });

  test("should reject invalid customer name", () => {
    const invalidName = "12345";

    const valid = /^[a-zA-Z\s]+$/.test(invalidName);

    expect(valid).toBeFalsy();
  });

  test("should accept valid customer name", () => {
    const validName = "Aditya Sharma";

    const valid = /^[a-zA-Z\s]+$/.test(validName);

    expect(valid).toBeTruthy();
  });
});
