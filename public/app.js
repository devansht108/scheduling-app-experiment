import Vapi from "@vapi-ai/web";

const vapi = new Vapi("3e059ef9-b83f-48de-a96a-73be4461a921");

const startBtn = document.getElementById("startBtn");
const statusDiv = document.getElementById("status");

let callActive = false;
let connecting = false;

async function startCall() {
  if (connecting) return;

  connecting = true;

  try {
    statusDiv.innerText = "Connecting...";

    startBtn.disabled = true;

    await vapi.start("94fc4f5a-5437-4c13-af2f-f375a438ceec");
  } catch (err) {
    console.error(err);

    statusDiv.innerText = "Connection Failed";

    startBtn.disabled = false;

    connecting = false;
  }
}

function stopCall() {
  vapi.stop();
}

startBtn.addEventListener("click", async () => {
  if (!callActive) {
    await startCall();
  } else {
    stopCall();
  }
});

vapi.on("call-start", () => {
  connecting = false;

  callActive = true;

  startBtn.disabled = false;

  startBtn.innerText = "End Call";

  statusDiv.innerText = "Assistant Online";

  console.log("Call started");
});

vapi.on("call-end", () => {
  connecting = false;

  callActive = false;

  startBtn.disabled = false;

  startBtn.innerText = "Start Voice Assistant";

  statusDiv.innerText = "Assistant Offline";

  console.log("Call ended");
});

vapi.on("error", (e) => {
  console.error("VAPI ERROR:", e);

  connecting = false;

  callActive = false;

  startBtn.disabled = false;

  startBtn.innerText = "Start Voice Assistant";

  statusDiv.innerText = "Assistant Offline";
});
