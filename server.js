const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

let rooms = {};
let talkingState = {};

io.on("connection", (socket) => {

    socket.on("join", ({ user, serverId }) => {
        socket.join(serverId);
        socket.user = user;
        socket.serverId = serverId;

        if (!rooms[serverId]) rooms[serverId] = [];
        rooms[serverId].push(user);

        io.to(serverId).emit("users", rooms[serverId]);
    });

    socket.on("signal", (data) => {
        socket.to(data.serverId).emit("signal", data);
    });

    socket.on("volume", (data) => {
        socket.to(data.serverId).emit("volume", data);
    });

    socket.on("talking", (data) => {
        talkingState[data.serverId] = talkingState[data.serverId] || {};
        talkingState[data.serverId][data.user] = data.talking;

        io.to(data.serverId).emit("talking", data);
    });

    socket.on("mute", (data) => {
        socket.to(data.serverId).emit("mute", data);
    });

    socket.on("disconnect", () => {
        let room = rooms[socket.serverId];
        if (room) {
            rooms[socket.serverId] = room.filter(u => u !== socket.user);
            io.to(socket.serverId).emit("users", rooms[socket.serverId]);
        }
    });
});

// STATUS (ROBLOX POLLING)
app.get("/status", (req, res) => {
    res.json(talkingState);
});

// MUTE (ROBLOX → BROWSER)
app.post("/mute", (req, res) => {
    const data = req.body;
    io.to(data.serverId).emit("mute", data);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Voice server running");
});
