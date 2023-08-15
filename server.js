const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

dotenv.config({ path: ".env" });
const DB = process.env.MONGO_URI;

mongoose.connect(DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
});

const Message = mongoose.model("Message", messageSchema);

io.on("connection", (socket) => {
  socket.on("join", (username) => {
    socket.username = username;
  });

  // Create a new room and join it
  socket.on("create-room", () => {
    const roomID = generateRoomID(); // You can implement your own room ID generation logic
    socket.join(roomID);
    socket.emit("room-created", roomID);
  });

  // Join an existing room
  socket.on("join-room", (roomID) => {
    socket.join(roomID);
    socket.emit("room-joined", roomID);
  });

  socket.on("message", (msg) => {
    const message = new Message({
      username: socket.username,
      message: msg,
    });

    message.save();

    io.to(socket.roomID).emit("message", {
      username: socket.username,
      message: msg,
    });
  });

  socket.on("offer", (offer) => {
    socket.to(socket.roomID).emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    socket.to(socket.roomID).emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate) => {
    socket.to(socket.roomID).emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    // Handle user disconnect and leave room
    socket.leave(socket.roomID);
  });
});

app.use(express.static("public"));

server.listen(3000, () => {
  console.log("Listening on port 3000");
});
