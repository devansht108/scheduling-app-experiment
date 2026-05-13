import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import path from "path";
import { Server } from "socket.io";
import { setIO } from "./config/socket";
import vapiRoutes from "./routes/vapiRoutes";
import calendarRoutes from "./routes/calendarRoutes";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Routes
app.use("/api/vapi", vapiRoutes);
app.use("/api", calendarRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Scheduling app running" });
});

// Socket.IO
setIO(io);

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n🚀 Scheduling App running on http://localhost:${PORT}`);
    console.log(`📅 Google Calendar: Connected`);
    console.log(`🤖 VAPI: Ready`);
    console.log(`\n📋 Steps to complete setup:`);
    console.log(`   1. Run ngrok: ngrok http ${PORT}`);
    console.log(`   2. Copy ngrok URL`);
    console.log(`   3. POST /api/setup-vapi with { "ngrokUrl": "https://xxx.ngrok.io" }`);
    console.log(`   4. Open http://localhost:${PORT} for dashboard\n`);
  });
}

export default app;