import * as WebSocket from "ws";
import * as http from "http";
import * as admin from "firebase-admin";

// Create WebSocket server
const wss = new WebSocket.Server({noServer: true});

// Active WebSocket connections map
const activeConnections: Map<string, WebSocket> = new Map();

// Message handler types
type MessageType = {
  type: "message";
  chatRoomId: string;
  message: string;
};

type WebSocketMessage = MessageType;

// Handle new WebSocket connections
wss.on("connection", (ws: WebSocket, request: http.IncomingMessage) => {
  const userID = request.headers["userid"] as string;

  if (userID) {
    console.log(`User connected: ${userID}`);
    activeConnections.set(userID, ws);

    // Handle incoming messages
    ws.on("message", async (message: string) => {
      try {
        const parsedMessage: WebSocketMessage = JSON.parse(message);

        if (parsedMessage.type === "message") {
          const {chatRoomId, message: chatMessage} = parsedMessage;

          // Save the message to Firestore
          await saveChatMessage(chatRoomId, userID, chatMessage);

          // Broadcast the message to other participants in the chat room
          broadcastMessage(chatRoomId, userID, chatMessage);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
        ws.send(
          JSON.stringify({type: "error", message: "Invalid message format"})
        );
      }
    });

    // Handle WebSocket close
    ws.on("close", () => {
      console.log(`User disconnected: ${userID}`);
      activeConnections.delete(userID);
    });
  } else {
    console.error("Connection attempted without userID");
    ws.close();
  }
});

// Function to save chat messages to Firestore
async function saveChatMessage(
  chatRoomId: string,
  senderID: string,
  message: string
): Promise<void> {
  const chatRoomRef = admin
    .firestore()
    .collection("testing")
    .doc("data")
    .collection("chats")
    .doc(chatRoomId);

  const messageRef = chatRoomRef.collection("messages").doc();
  const timestamp = admin.firestore.FieldValue.serverTimestamp();

  await messageRef.set({
    senderID,
    message,
    createdAt: timestamp,
  });

  // Update last message metadata
  await chatRoomRef.set(
    {
      lastMessage: message,
      lastMessageAt: timestamp,
    },
    {merge: true}
  );

  console.log(`Message saved for chatRoomId: ${chatRoomId}`);
}

// Function to broadcast messages to all participants in a chat room
async function broadcastMessage(
  chatRoomId: string,
  senderID: string,
  message: string
): Promise<void> {
  try {
    const chatRoomRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("chats")
      .doc(chatRoomId);

    const chatRoomSnapshot = await chatRoomRef.get();

    if (chatRoomSnapshot.exists) {
      const {participants} = chatRoomSnapshot.data() || {};

      if (Array.isArray(participants)) {
        participants.forEach((participantID: string) => {
          const connection = activeConnections.get(participantID);
          if (connection && participantID !== senderID) {
            connection.send(
              JSON.stringify({
                type: "message",
                chatRoomId,
                senderID,
                message,
                timestamp: new Date().toISOString(),
              })
            );
          }
        });
      }
    }
  } catch (error) {
    console.error("Error broadcasting message:", error);
  }
}

// Export WebSocket server
export default wss;
