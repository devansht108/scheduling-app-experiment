import Vapi from "@vapi-ai/web";

const VAPI_PUBLIC_KEY   = "3e059ef9-b83f-48de-a96a-73be4461a921";
const VAPI_ASSISTANT_ID = "94fc4f5a-5437-4c13-af2f-f375a438ceec";

const vapi     = new Vapi(VAPI_PUBLIC_KEY);
const startBtn = document.getElementById("startBtn");
const btnIcon  = document.getElementById("btnIcon");
const btnLabel = document.getElementById("btnLabel");
const statusEl = document.getElementById("status");
const orbWrap  = document.getElementById("orbWrap");

let callActive = false;
let connecting = false;

startBtn.addEventListener("click", () => {
  if (connecting) return;
  if (!callActive) {
    startCall();
  } else {
    vapi.stop();
  }
});

async function startCall() {
  connecting = true;
  startBtn.disabled = true;
  statusEl.textContent = "Connecting…";
  statusEl.className   = "calling";
  btnIcon.textContent  = "⏳";
  btnLabel.textContent = "Connecting";

  try {
    await vapi.start(VAPI_ASSISTANT_ID);
  } catch (err) {
    console.error(err);
    resetUI("Connection failed", "error");
    connecting = false;
  }
}

vapi.on("call-start", () => {
  connecting  = false;
  callActive  = true;
  startBtn.disabled = false;
  startBtn.classList.add("active-call");
  orbWrap.classList.add("active");
  btnIcon.textContent  = "🔴";
  btnLabel.textContent = "End Call";
  statusEl.textContent = "Riley is listening…";
  statusEl.className   = "online";
});

vapi.on("call-end", () => {
  callActive = false;
  connecting = false;
  startBtn.classList.remove("active-call");
  orbWrap.classList.remove("active");
  resetUI("Call ended — tap to start again", "");
});

vapi.on("error", (e) => {
  console.error("VAPI ERROR:", e);
  callActive = false;
  connecting = false;
  startBtn.classList.remove("active-call");
  orbWrap.classList.remove("active");
  resetUI("Something went wrong", "error");
});

function resetUI(msg, cls) {
  startBtn.disabled    = false;
  btnIcon.textContent  = "🎙";
  btnLabel.textContent = "Talk to Riley";
  statusEl.textContent = msg || "Tap to start";
  statusEl.className   = cls || "";
}