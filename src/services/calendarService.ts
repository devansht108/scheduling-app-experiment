import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import { getIO } from "../config/socket";

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOKEN_PATH = path.join(process.cwd(), "token.json");

const BUSINESS_OPEN_HOUR = 11;
const BUSINESS_CLOSE_HOUR = 23;
const MIN_ADVANCE_MINUTES = 30;
const MAX_FUTURE_DAYS = 365;

export const getAuthClient = () => {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));

  const { client_id, client_secret, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));

    oAuth2Client.setCredentials(token);
  }

  return oAuth2Client;
};

const normalizeName = (name: string) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9]/g, "")
    .replace(/ph/g, "f")
    .replace(/v/g, "w");
};

const isValidCustomerName = (name: string) => {
  const trimmed = name.trim();

  if (trimmed.length < 2 || trimmed.length > 50) {
    return false;
  }

  return /^[a-zA-Z\s]+$/.test(trimmed);
};

const isValidFutureDate = (date: Date) => {
  if (isNaN(date.getTime())) {
    return {
      valid: false,
      message: "Please provide a valid reservation date.",
    };
  }

  const now = new Date();

  if (date < now) {
    return {
      valid: false,
      message: "Reservations cannot be booked in the past.",
    };
  }

  if (date.getFullYear() < 2026) {
    return {
      valid: false,
      message: "Please provide a valid future reservation date.",
    };
  }

  const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays > MAX_FUTURE_DAYS) {
    return {
      valid: false,
      message: "Reservations can only be booked within the next 1 year.",
    };
  }

  return {
    valid: true,
    message: "",
  };
};

const isWithinBusinessHours = (startTime: Date, durationMinutes: number) => {
  const startHour = startTime.getHours();

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const endHour = endTime.getHours();

  const sameDay =
    startTime.toDateString() === endTime.toDateString();

  return (
    sameDay &&
    startHour >= BUSINESS_OPEN_HOUR &&
    endHour <= BUSINESS_CLOSE_HOUR
  );
};

const hasMinimumAdvanceNotice = (startTime: Date) => {
  const now = new Date();

  const diffMinutes = (startTime.getTime() - now.getTime()) / (1000 * 60);

  return diffMinutes >= MIN_ADVANCE_MINUTES;
};

const findNearbyCustomerBooking = async (
  customerName: string,
  startTime: Date,
) => {
  try {
    const auth = getAuthClient();

    const calendar = google.calendar({
      version: "v3",
      auth,
    });

    const calendarId =
      process.env.GOOGLE_CALENDAR_ID ||
      "bfd14d4cef2cfce48dddb2a590559f76ad45c3d4bd26d08043c2eac8773c04a9@group.calendar.google.com";

    const rangeStart = new Date(startTime.getTime() - 2 * 60 * 60 * 1000);

    const rangeEnd = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const events = await calendar.events.list({
      calendarId,
      timeMin: rangeStart.toISOString(),
      timeMax: rangeEnd.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const normalizedInput = normalizeName(customerName);

    return events.data.items?.find((event) => {
      const summary = normalizeName(event.summary || "");

      return (
        summary.includes(normalizedInput) || normalizedInput.includes(summary)
      );
    });
  } catch {
    return null;
  }
};

export const checkAvailability = async (
  date: string,
  time: string,
  durationMinutes: number = 60,
): Promise<{
  available: boolean;
  message: string;
}> => {
  try {
    const auth = getAuthClient();

    const calendar = google.calendar({
      version: "v3",
      auth,
    });

    let startTime: Date | null = null;

    try {
      startTime = parseDateTime(date, time);
    } catch (error: any) {
      return {
        available: false,
        message:
          error instanceof Error
            ? error.message
            : "Please provide a valid future reservation date and time.",
      };
    }

    if (!startTime) {
      return {
        available: false,
        message: "Please provide a valid future reservation date and time.",
      };
    }

    if (durationMinutes < 30 || durationMinutes > 180) {
      return {
        available: false,
        message: "Reservation duration must be between 30 minutes and 3 hours.",
      };
    }

    if (!isWithinBusinessHours(startTime, durationMinutes)) {
      return {
        available: false,
        message: "Reservations are only available between 11 AM and 11 PM.",
      };
    }

    if (!hasMinimumAdvanceNotice(startTime)) {
      return {
        available: false,
        message: "Reservations must be booked at least 30 minutes in advance.",
      };
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const calendarId =
      process.env.GOOGLE_CALENDAR_ID ||
      "bfd14d4cef2cfce48dddb2a590559f76ad45c3d4bd26d08043c2eac8773c04a9@group.calendar.google.com";

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [
          {
            id: calendarId,
          },
        ],
      },
    });

    const busySlots = response.data.calendars?.[calendarId]?.busy || [];

    const isAvailable = busySlots.length === 0;

    const formattedDate = startTime.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const formattedTime = startTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

   getIO().emit("activity", {
  message: `Availability checked for ${formattedDate} at ${formattedTime}`,
});

if (isAvailable) {
  return {
    available: true,
    message: `${formattedDate} at ${formattedTime} is available for ${durationMinutes} minutes.`,
  };
}

    return {
      available: false,
      message: `${formattedDate} at ${formattedTime} is already booked.`,
    };
  } catch (error: any) {
    console.error(
      "Calendar check error:",
      error.response?.data || error.message,
    );

    return {
      available: false,
      message:
        "Calendar service is temporarily unavailable. Please try again shortly.",
    };
  }
};

export const bookAppointment = async (
  date: string,
  time: string,
  customerName: string,
  purpose: string = "Reservation",
  durationMinutes: number = 60,
): Promise<{
  success: boolean;
  message: string;
  eventId?: string;
}> => {
  try {
    customerName = customerName.trim();

    if (!isValidCustomerName(customerName)) {
      return {
        success: false,
        message:
          "Please provide a valid customer name using alphabetic characters only.",
      };
    }

    const auth = getAuthClient();

    const calendar = google.calendar({
      version: "v3",
      auth,
    });

    let startTime: Date | null = null;

    try {
      startTime = parseDateTime(date, time);
    } catch (error: any) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Please provide a valid future reservation date and time.",
      };
    }

    if (!startTime) {
      return {
        success: false,
        message: "Please provide a valid future reservation date and time.",
      };
    }

    if (durationMinutes < 30 || durationMinutes > 180) {
      return {
        success: false,
        message: "Reservation duration must be between 30 minutes and 3 hours.",
      };
    }

    if (!isWithinBusinessHours(startTime, durationMinutes)) {
      return {
        success: false,
        message: "Reservations are only available between 11 AM and 11 PM.",
      };
    }

    if (!hasMinimumAdvanceNotice(startTime)) {
      return {
        success: false,
        message: "Reservations must be booked at least 30 minutes in advance.",
      };
    }

    const nearbyBooking = await findNearbyCustomerBooking(
      customerName,
      startTime,
    );

    if (nearbyBooking) {
      return {
        success: false,
        message: "You already appear to have a nearby reservation booked.",
      };
    }

    const availability = await checkAvailability(date, time, durationMinutes);

    if (!availability.available) {
      return {
        success: false,
        message: availability.message,
      };
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const calendarId =
      process.env.GOOGLE_CALENDAR_ID ||
      "bfd14d4cef2cfce48dddb2a590559f76ad45c3d4bd26d08043c2eac8773c04a9@group.calendar.google.com";

    const event = await calendar.events.insert({
      calendarId,

      requestBody: {
        summary: `${purpose} - ${customerName}`,

        description: `Reservation for ${customerName}
Duration: ${durationMinutes} minutes`,

        start: {
          dateTime: formatLocalDate(startTime),
          timeZone: "Asia/Kolkata",
        },

        end: {
          dateTime: formatLocalDate(endTime),
          timeZone: "Asia/Kolkata",
        },

        colorId: "2",
      },
    });

    const formattedDate = startTime.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const formattedTime = startTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

   getIO().emit("activity", {
  message: `${customerName} booked a reservation for ${formattedDate} at ${formattedTime}`,
});

return {
  success: true,
  message: `Your reservation for ${customerName} is confirmed on ${formattedDate} at ${formattedTime} for ${durationMinutes} minutes.`,
  eventId: event.data.id || undefined,
};
  } catch (error: any) {
    console.error("Booking error:", error.response?.data || error.message);

    return {
      success: false,
      message:
        "Calendar service is temporarily unavailable. Please try again shortly.",
    };
  }
};

export const cancelReservation = async (
  customerName: string,
  date: string,
): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const auth = getAuthClient();

    const calendar = google.calendar({
      version: "v3",
      auth,
    });

    const calendarId =
      process.env.GOOGLE_CALENDAR_ID ||
      "bfd14d4cef2cfce48dddb2a590559f76ad45c3d4bd26d08043c2eac8773c04a9@group.calendar.google.com";

    const targetDate = new Date(`${date} GMT+0530`);

    if (isNaN(targetDate.getTime())) {
      return {
        success: false,
        message: "Please provide a valid reservation date.",
      };
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const normalizedInput = normalizeName(customerName);

    const matchingEvent = events.data.items?.find((event) => {
      const summary = normalizeName(event.summary || "");

      return (
        summary.includes(normalizedInput) || normalizedInput.includes(summary)
      );
    });

    if (!matchingEvent || !matchingEvent.id) {
      return {
        success: false,
        message: `I couldn't find a reservation for ${customerName} on ${date}.`,
      };
    }

    await calendar.events.delete({
      calendarId,
      eventId: matchingEvent.id,
    });

    getIO().emit("activity", {
  message: `${customerName}'s reservation was cancelled`,
});

return {
  success: true,
  message: `The reservation for ${customerName} on ${date} has been cancelled.`,
};
  } catch (error: any) {
    console.error("Cancellation error:", error.response?.data || error.message);

    return {
      success: false,
      message:
        "Calendar service is temporarily unavailable. Please try again shortly.",
    };
  }
};

export const rescheduleReservation = async (
  customerName: string,
  oldDate: string,
  newDate: string,
  newTime: string,
  durationMinutes: number = 60,
): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const auth = getAuthClient();

    const calendar = google.calendar({
      version: "v3",
      auth,
    });

    const calendarId =
      process.env.GOOGLE_CALENDAR_ID ||
      "bfd14d4cef2cfce48dddb2a590559f76ad45c3d4bd26d08043c2eac8773c04a9@group.calendar.google.com";

    const oldTargetDate = new Date(`${oldDate} GMT+0530`);

    const startOfDay = new Date(oldTargetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(oldTargetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const normalizedInput = normalizeName(customerName);

    const matchingEvent = events.data.items?.find((event) => {
      const summary = normalizeName(event.summary || "");

      return (
        summary.includes(normalizedInput) || normalizedInput.includes(summary)
      );
    });

    if (!matchingEvent || !matchingEvent.id) {
      return {
        success: false,
        message: `I couldn't find an existing reservation for ${customerName}.`,
      };
    }

    const availability = await checkAvailability(
      newDate,
      newTime,
      durationMinutes,
    );

    if (!availability.available) {
      return {
        success: false,
        message: availability.message,
      };
    }

    let startTime: Date | null = null;

    try {
      startTime = parseDateTime(newDate, newTime);
    } catch (error: any) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Please provide a valid new reservation date and time.",
      };
    }

    if (!startTime) {
      return {
        success: false,
        message: "Please provide a valid new reservation date and time.",
      };
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    await calendar.events.update({
      calendarId,
      eventId: matchingEvent.id,
      requestBody: {
        ...matchingEvent,

        start: {
          dateTime: formatLocalDate(startTime),
          timeZone: "Asia/Kolkata",
        },

        end: {
          dateTime: formatLocalDate(endTime),
          timeZone: "Asia/Kolkata",
        },
      },
    });

    getIO().emit("activity", {
  message: `${customerName} rescheduled reservation to ${newDate} at ${newTime}`,
});

return {
  success: true,
  message: `The reservation for ${customerName} has been successfully rescheduled to ${newDate} at ${newTime}.`,
};
  } catch (error: any) {
    console.error("Reschedule error:", error.response?.data || error.message);

    return {
      success: false,
      message:
        "Calendar service is temporarily unavailable. Please try again shortly.",
    };
  }
};

export const getUpcomingBookings = async () => {
  try {
    const auth = getAuthClient();

    const calendar = google.calendar({
      version: "v3",
      auth,
    });

    const response = await calendar.events.list({
      calendarId:
        process.env.GOOGLE_CALENDAR_ID ||
        "bfd14d4cef2cfce48dddb2a590559f76ad45c3d4bd26d08043c2eac8773c04a9@group.calendar.google.com",

      timeMin: new Date().toISOString(),

      maxResults: 10,

      singleEvents: true,

      orderBy: "startTime",
    });

    return response.data.items || [];
  } catch (error) {
    console.error("Error fetching bookings:", error);

    return [];
  }
};

const parseDateTime = (date: string, time: string): Date | null => {
  try {
    const targetDate = new Date(`${date} GMT+0530`);

    const futureDateValidation = isValidFutureDate(targetDate);

    if (!futureDateValidation.valid) {
      throw new Error(futureDateValidation.message);
    }

    const timeLower = time.toLowerCase().trim();

    let hours = 0;
    let minutes = 0;

    const timeMatch = timeLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);

    if (timeMatch) {
      hours = parseInt(timeMatch[1]);

      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

      if (hours > 23 || minutes > 59) {
        return null;
      }

      const meridiem = timeMatch[3];

      if (meridiem === "pm" && hours !== 12) {
        hours += 12;
      }

      if (meridiem === "am" && hours === 12) {
        hours = 0;
      }
    }

    targetDate.setHours(hours, minutes, 0, 0);

    return targetDate;
  } catch (error: any) {
    console.error(error);

    throw error;
  }
};

const formatLocalDate = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:00`;
};