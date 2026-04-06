const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 DATA STORE
// structure:
// {
//   serverId: {
//     username: true/false
//   }
// }
const voiceStates = {};

// =========================
// JOIN (optional tracking)
// =========================
app.get("/", (req, res) => {
  const { user, server } = req.query;

  if (!user || !server) {
    return res.send("Missing user/server");
  }

  if (!voiceStates[server]) {
    voiceStates[server] = {};
  }

  // default = not talking
  if (!(user in voiceStates[server])) {
    voiceStates[server][user] = false;
  }

  console.log(`JOIN: ${user} @ ${server}`);

  res.sendFile(__dirname + "/index.html");
});

// =========================
// TALK (from Roblox OR web)
// =========================
app.post("/talk", (req, res) => {
  const { user, talking, serverId } = req.body;

  if (!user || !serverId) {
    return res.sendStatus(400);
  }

  if (!voiceStates[serverId]) {
    voiceStates[serverId] = {};
  }

  voiceStates[serverId][user] = talking;

  console.log(`TALK: ${user} -> ${talking}`);

  res.sendStatus(200);
});

// =========================
// STATUS (for Roblox polling)
// =========================
app.get("/status", (req, res) => {
  res.json(voiceStates);
});

// =========================
// CLEANUP (optional)
// =========================
setInterval(() => {
  for (const server in voiceStates) {
    const users = voiceStates[server];

    for (const user in users) {
      // optional timeout cleanup later
    }
  }
}, 10000);

// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Voice server running on port", PORT);
});
