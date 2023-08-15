const socket = io();
const messages = document.getElementById("messages");
const form = document.getElementById("send-form");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const joinButton = document.getElementById("join-button");
const createButton = document.getElementById("create-button");

let localStream;
let peerConnection;

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const message = document.getElementById("message").value;

  socket.emit("join", username);
  socket.emit("message", message);

  document.getElementById("message").value = "";
});

socket.on("message", (data) => {
  const li = document.createElement("li");
  li.innerHTML = `${data.username}: ${data.message}`;
  messages.appendChild(li);
});

createButton.addEventListener("click", () => {
  socket.emit("create-room");
});

joinButton.addEventListener("click", () => {
  const roomID = prompt("Enter room ID:");
  if (roomID) {
    socket.emit("join-room", roomID);
  }
});

navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then((stream) => {
    localStream = stream;
    localVideo.srcObject = stream;

    // Call the function to initiate the WebRTC connection
    startWebRTC();
  })
  .catch((error) => {
    console.error("Error accessing webcam:", error);
  });

function startWebRTC() {
  peerConnection = new RTCPeerConnection();

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };

  socket.on("ice-candidate", (candidate) => {
    if (candidate) {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });

  socket.on("offer", (offer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    peerConnection
      .createAnswer()
      .then((answer) => peerConnection.setLocalDescription(answer))
      .then(() => {
        socket.emit("answer", peerConnection.localDescription);
      });
  });

  socket.on("answer", (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  peerConnection.createOffer().then((offer) => {
    peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
  });
}
