import { Router, Request, Response } from "express";
import { getUpcomingBookings } from "../services/calendarService";
import { createVapiAssistant } from "../services/vapiService";

const router = Router();

router.get("/bookings", async (_req: Request, res: Response) => {
  const bookings = await getUpcomingBookings();
  res.json({ bookings });
});

router.post("/setup-vapi", async (req: Request, res: Response) => {
  try {
    const { ngrokUrl } = req.body;

    if (!ngrokUrl) {
      return res.status(400).json({
        success: false,
        message: "ngrokUrl is required",
      });
    }

    const assistant = await createVapiAssistant(ngrokUrl);

    return res.json({
      success: true,
      assistant,
    });
  } catch (error: any) {
    console.error("Setup VAPI error:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;