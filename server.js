const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ===== BASIC CHECK =====
app.get("/", (req, res) => {
  res.send("VC Server Running");
});

// ===== IMPORTANT ROUTE (DO NOT REMOVE) =====
app.get("/voice/:room/:token", (req, res) => {
  res.sendFile(path.join(__dirname, "voice.html"));
});

// ===== VOICE SYSTEM =====
let rooms = {};

io.on("connection", (socket) => {

  socket.on("join", ({ user, serverId }) => {

    if (!rooms[serverId]) rooms[serverId] = {};

    rooms[serverId][user] = socket.id;

    // Send existing players
    const others = Object.entries(rooms[serverId])
      .filter(([u]) => u !== user)
      .map(([u, id]) => ({ user: u, id }));

    socket.emit("peers", others);

    // Notify others
    socket.to(serverId).emit("peer-joined", {
      user,
      id: socket.id
    });

    socket.join(serverId);
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data
    });
  });

  socket.on("disconnect", () => {
    for (const serverId in rooms) {
      for (const user in rooms[serverId]) {
        if (rooms[serverId][user] === socket.id) {
          delete rooms[serverId][user];
        }
      }
    }
  });

});

server.listen(3000, () => {
  console.log("Voice server running on port 3000");
});
