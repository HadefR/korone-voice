const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

let talkingState = {};

io.on("connection", (socket) => {

    socket.on("join", ({ user, serverId }) => {
        socket.user = user;
        socket.serverId = serverId;
    });

    socket.on("talking", (data) => {
        talkingState[data.serverId] = talkingState[data.serverId] || {};
        talkingState[data.serverId][data.user] = data.talking;
    });

    socket.on("mute", (data) => {
        io.emit("mute", data);
    });

    socket.on("disconnect", () => {
        if (socket.serverId && talkingState[socket.serverId]) {
            delete talkingState[socket.serverId][socket.user];
        }
    });
});

// Roblox polling
app.get("/status", (req, res) => {
    res.json(talkingState);
});

app.post("/mute", (req, res) => {
    io.emit("mute", req.body);
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Voice server running");
});
