const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ===== DATA =====
const codes = {};
const rooms = {};
const positions = {};

// ===== FIXED ROOT (IMPORTANT) =====
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// ===== CREATE CODE =====
app.get("/create", (req, res) => {
  const { user, serverId } = req.query;

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  codes[code] = { user, serverId };

  console.log("CODE:", code, user);

  res.json({ code });
});

// ===== JOIN =====
app.post("/join", (req, res) => {
  const { code } = req.body;

  if (!codes[code]) return res.sendStatus(404);

  res.json(codes[code]);
});

// ===== POSITION =====
app.post("/pos", (req, res) => {
  const { user, serverId, position } = req.body;

  if (!positions[serverId]) positions[serverId] = {};
  positions[serverId][user] = position;

  res.sendStatus(200);
});

// ===== SOCKET =====
io.on("connection", (socket) => {

  socket.on("join", ({ user, serverId }) => {

    if (!rooms[serverId]) rooms[serverId] = {};
    rooms[serverId][user] = socket.id;

    const others = Object.entries(rooms[serverId])
      .filter(([u]) => u !== user)
      .map(([u, id]) => ({ user: u, id }));

    socket.emit("peers", others);
    socket.to(serverId).emit("peer-joined", { user, id: socket.id });

    socket.join(serverId);
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

});

server.listen(3000, () => {
  console.log("Server running");
});
