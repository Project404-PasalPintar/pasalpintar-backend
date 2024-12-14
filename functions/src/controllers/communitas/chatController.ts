import {Request, Response} from "express";
import * as admin from "firebase-admin";

// Create or Send a Message in a Chat Room
export const sendMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {chatRoomId, senderID, receiverID, message} = req.body;

    if (!chatRoomId || !senderID || !receiverID || !message) {
      res.status(400).json({
        status: "fail",
        message: "chatRoomId, senderID, receiverID, and message are required.",
      });
      return;
    }

    const chatRoomRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("chats")
      .doc(chatRoomId);

    const messageRef = chatRoomRef.collection("messages").doc();

    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // Save message to Firestore
    await messageRef.set({
      senderID,
      receiverID,
      message,
      createdAt: timestamp,
    });

    // Update chat room metadata
    await chatRoomRef.set(
      {
        lastMessage: message,
        lastMessageAt: timestamp,
        participants: [senderID, receiverID],
      },
      {merge: true}
    );

    res.status(201).json({
      status: "success",
      message: "Message sent successfully.",
      data: {
        id: messageRef.id,
        senderID,
        receiverID,
        message,
        createdAt: timestamp,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to send message.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};

// Fetch Messages from a Chat Room
export const getMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {chatRoomId} = req.params;

    if (!chatRoomId) {
      res.status(400).json({
        status: "fail",
        message: "chatRoomId is required.",
      });
      return;
    }

    const messagesRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("chats")
      .doc(chatRoomId)
      .collection("messages");

    const snapshot = await messagesRef.orderBy("createdAt", "asc").get();

    if (snapshot.empty) {
      res.status(404).json({
        status: "fail",
        message: "No messages found in this chat room.",
      });
      return;
    }

    const messages = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const messageData = doc.data();

        const senderRef = admin
          .firestore()
          .collection("testing")
          .doc("data")
          .collection("users")
          .doc(messageData.senderID);

        const receiverRef = admin
          .firestore()
          .collection("testing")
          .doc("data")
          .collection("lawyers")
          .doc(messageData.receiverID);

        const [senderSnapshot, receiverSnapshot] = await Promise.all([
          senderRef.get(),
          receiverRef.get(),
        ]);

        const senderData = senderSnapshot.exists ? senderSnapshot.data() : {};
        const receiverData = receiverSnapshot.exists ?
          receiverSnapshot.data() :
          {};

        return {
          id: doc.id,
          ...messageData,
          sender: {
            id: messageData.senderID,
            username: senderData?.username || null,
            profilePic: senderData?.profilePic || null,
          },
          receiver: {
            id: messageData.receiverID,
            username: receiverData?.username || null,
            profilePic: receiverData?.profilePic || null,
          },
          createdAt: messageData.createdAt?.toDate().toISOString() || null,
        };
      })
    );

    res.status(200).json({
      status: "success",
      message: "Messages fetched successfully.",
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to fetch messages.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};

// Fetch All Chat Rooms for a User or Lawyer
// Fetch All Chat Rooms for a User or Lawyer
export const getChatRooms = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {userID} = req.params;

    if (!userID) {
      res.status(400).json({
        status: "fail",
        message: "userID is required.",
      });
      return;
    }

    const chatRoomsRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("chats");

    const snapshot = await chatRoomsRef
      .where("participants", "array-contains", userID)
      .orderBy("lastMessageAt", "desc")
      .get();

    if (snapshot.empty) {
      res.status(404).json({
        status: "fail",
        message: "No chat rooms found for this user.",
      });
      return;
    }

    const chatRooms = snapshot.docs.map((doc) => {
      const chatRoomData = doc.data();

      return {
        id: doc.id,
        ...chatRoomData,
        lastMessageAt: chatRoomData.lastMessageAt ?
          chatRoomData.lastMessageAt.toDate().toISOString() :
          null,
      };
    });

    res.status(200).json({
      status: "success",
      message: "Chat rooms fetched successfully.",
      data: chatRooms,
    });
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to fetch chat rooms.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};
