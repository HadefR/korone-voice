// server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// =========================
// STATE
// =========================
// talking states for Roblox polling
// { serverId: { username: boolean } }
const voiceStates = {};

// rooms for WebRTC (socket ids)
const rooms = {}; // { serverId: { username: socketId } }

// =========================
// HTTP ROUTES
// =========================
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/talk", (req, res) => {
  const { user, talking, serverId } = req.body || {};
  if (!user || !serverId) return res.sendStatus(400);

  if (!voiceStates[serverId]) voiceStates[serverId] = {};
  voiceStates[serverId][user] = !!talking;

  res.sendStatus(200);
});

app.get("/status", (req, res) => {
  res.json(voiceStates);
});

// =========================
// SOCKET.IO (WEBRTC SIGNALING)
// =========================
io.on("connection", (socket) => {
  let current = { user: null, serverId: null };

  socket.on("join", ({ user, serverId }) => {
    if (!user || !serverId) return;

    current.user = user;
    current.serverId = serverId;

    if (!rooms[serverId]) rooms[serverId] = {};
    rooms[serverId][user] = socket.id;

    // send existing peers to the new client
    const peers = Object.entries(rooms[serverId])
      .filter(([u, id]) => u !== user)
      .map(([u, id]) => ({ user: u, id }));

    socket.emit("peers", peers);

    // notify others
    socket.to(serverId).emit("peer-joined", { user, id: socket.id });

    socket.join(serverId);

    // init talking state
    if (!voiceStates[serverId]) voiceStates[serverId] = {};
    if (!(user in voiceStates[serverId])) {
      voiceStates[serverId][user] = false;
    }
  });

  socket.on("signal", ({ to, data }) => {
    // forward SDP/ICE
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("leave", () => {
    const { user, serverId } = current;
    if (!user || !serverId) return;

    if (rooms[serverId]) {
      delete rooms[serverId][user];
    }
    socket.to(serverId).emit("peer-left", { user });
  });

  socket.on("disconnect", () => {
    const { user, serverId } = current;
    if (!user || !serverId) return;

    if (rooms[serverId]) {
      delete rooms[serverId][user];
    }
    socket.to(serverId).emit("peer-left", { user });
  });
});

// =========================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Voice server running on", PORT);
});
