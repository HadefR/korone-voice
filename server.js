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

        talkingState[data.serverId][data.user] = {
            talking: data.talking,
            lastUpdate: Date.now()
        };
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

app.get("/status", (req, res) => {
    const now = Date.now();
    let clean = {};

    for (let serverId in talkingState) {
        clean[serverId] = {};

        for (let user in talkingState[serverId]) {
            let d = talkingState[serverId][user];

            clean[serverId][user] =
                (now - d.lastUpdate < 300) ? d.talking : false;
        }
    }

    res.json(clean);
});

app.post("/mute", (req, res) => {
    io.emit("mute", req.body);
    res.sendStatus(200);
});

server.listen(process.env.PORT || 3000, () => {
    console.log("Voice server running");
});
