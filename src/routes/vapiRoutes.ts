import { Router, Request, Response } from "express";
import {
  checkAvailability,
  bookAppointment,
  cancelReservation,
  rescheduleReservation,
} from "../services/calendarService";
import { getIO } from "../config/socket";

const router = Router();

/**
 * TOOL CALL HANDLER
 */
router.post("/tool-call", async (req: Request, res: Response) => {
  try {
    console.log("\n========== TOOL CALL ==========");
    console.log(JSON.stringify(req.body, null, 2));

    const body = req.body;

    // =====================================================
    // CHECK AVAILABILITY
    // =====================================================

    if (
      body.action === "check_availability" ||
      (body.time &&
        body.date &&
        !body.customer_name &&
        !body.oldDate)
    ) {
      console.log("\n========== CHECKING AVAILABILITY ==========");

      const result = await checkAvailability(
        body.date,
        body.time,
        body.durationMinutes || 60,
      );

      console.log("Availability Result:", result);

      try {
        const io = getIO();

        io.emit("availability_checked", {
          date: body.date,
          time: body.time,
          durationMinutes: body.durationMinutes || 60,
          available: result.available,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error("[Socket Error]", e);
      }

      return res.status(200).json({
        available: result.available,
        message: result.message,
      });
    }

    // =====================================================
    // BOOK APPOINTMENT
    // =====================================================

    if (
      body.action === "book_appointment" ||
      (body.time &&
        body.date &&
        body.customer_name &&
        !body.oldDate)
    ) {
      console.log("\n========== BOOKING APPOINTMENT ==========");

      const result = await bookAppointment(
        body.date,
        body.time,
        body.customer_name,
        body.purpose || "Restaurant Reservation",
        body.durationMinutes || 60,
      );

      console.log("Booking Result:", result);

      if (result.success) {
        try {
          const io = getIO();

          io.emit("booking_created", {
            date: body.date,
            time: body.time,
            durationMinutes: body.durationMinutes || 60,
            customerName: body.customer_name,
            purpose: body.purpose || "Restaurant Reservation",
            eventId: result.eventId,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.error("[Socket Error]", e);
        }
      }

      return res.status(200).json({
        success: result.success,
        message: result.message,
      });
    }

    // =====================================================
    // CANCEL RESERVATION
    // =====================================================

    if (
      body.action === "cancel_reservation" ||
      (body.customer_name &&
        body.date &&
        body.cancel === true)
    ) {
      console.log("\n========== CANCELLING RESERVATION ==========");

      const result = await cancelReservation(
        body.customer_name,
        body.date,
      );

      console.log("Cancellation Result:", result);

      if (result.success) {
        try {
          const io = getIO();

          io.emit("reservation_cancelled", {
            customerName: body.customer_name,
            date: body.date,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.error("[Socket Error]", e);
        }
      }

      return res.status(200).json({
        success: result.success,
        message: result.message,
      });
    }

    // =====================================================
    // RESCHEDULE RESERVATION
    // =====================================================

    if (
      body.action === "reschedule_reservation" ||
      (body.customer_name &&
        body.oldDate &&
        body.newDate &&
        body.newTime)
    ) {
      console.log("\n========== RESCHEDULING RESERVATION ==========");

      const result = await rescheduleReservation(
        body.customer_name,
        body.oldDate,
        body.newDate,
        body.newTime,
        body.durationMinutes || 60,
      );

      console.log("Reschedule Result:", result);

      if (result.success) {
        try {
          const io = getIO();

          io.emit("reservation_rescheduled", {
            customerName: body.customer_name,
            oldDate: body.oldDate,
            newDate: body.newDate,
            newTime: body.newTime,
            durationMinutes: body.durationMinutes || 60,
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          console.error("[Socket Error]", e);
        }
      }

      return res.status(200).json({
        success: result.success,
        message: result.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid tool payload",
    });
  } catch (error) {
    console.error("\n========== TOOL ERROR ==========");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * GENERAL WEBHOOK EVENTS
 */
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    console.log("[VAPI WEBHOOK EVENT]", message?.type);

    if (message?.type === "end-of-call-report") {
      try {
        const io = getIO();

        io.emit("call_ended", {
          duration: message.durationSeconds,
          transcript: message.transcript,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.error("[Socket Error]", e);
      }
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      received: false,
    });
  }
});

export default router;