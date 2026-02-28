const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on("connection", (socket) => {

  socket.on("createRoom", (name) => {
    const code = generateRoomCode();

    rooms[code] = {
      players: {},
      winner: null
    };

    rooms[code].players[socket.id] = {
      name,
      points: 0
    };

    socket.join(code);
    socket.emit("roomCreated", code);
    io.to(code).emit("playersUpdate", rooms[code].players);
  });

  socket.on("joinRoom", ({ code, playerName }) => {
    if (!rooms[code]) {
      socket.emit("errorMessage", "الغرفة غير موجودة");
      return;
    }

    rooms[code].players[socket.id] = {
      name: playerName,
      points: 0
    };

    socket.join(code);
    io.to(code).emit("playersUpdate", rooms[code].players);
  });

  socket.on("pressButton", (code) => {
    const room = rooms[code];
    if (!room) return;

    // إذا فيه فائز خلاص ما تنحسب
    if (room.winner) return;

    room.winner = socket.id;
    room.players[socket.id].points += 1;

    io.to(code).emit("winner", {
      name: room.players[socket.id].name,
      players: room.players
    });
  });

  socket.on("resetRound", (code) => {
    if (!rooms[code]) return;
    rooms[code].winner = null;
    io.to(code).emit("roundReset");
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      if (rooms[code].players[socket.id]) {
        delete rooms[code].players[socket.id];
        io.to(code).emit("playersUpdate", rooms[code].players);
      }
    }
  });

});

server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});