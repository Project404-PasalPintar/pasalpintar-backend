import {Request, Response} from "express";
import * as admin from "firebase-admin";

// Simulate AI Response (Replace with an actual AI API call)
const generateAIResponse = async (prompt: string): Promise<string> => {
  return `AI Response to: ${prompt}`; // Replace with actual AI logic
};

// Create or Append to an AI Chat
export const createOrAppendAIChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userID = (req.user as { userID: string })?.userID;
    const {message, chatRoomId} = req.body;

    if (!userID || !message) {
      res.status(400).json({
        status: "fail",
        message: "userID and message are required.",
      });
      return;
    }

    const userRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(userID);

    const chatsRef = userRef.collection("aiChats");

    // Generate AI response
    const aiResponse = await generateAIResponse(message);

    // If chatRoomId exists, append to the chat
    if (chatRoomId) {
      const chatRoomRef = chatsRef.doc(chatRoomId);
      const chatRoomSnapshot = await chatRoomRef.get();

      if (!chatRoomSnapshot.exists) {
        res.status(404).json({
          status: "fail",
          message: "Chat room not found.",
        });
        return;
      }

      const messageRef = chatRoomRef.collection("messages").doc();
      await messageRef.set({
        sender: "user",
        content: message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const aiMessageRef = chatRoomRef.collection("messages").doc();
      await aiMessageRef.set({
        sender: "ai",
        content: aiResponse,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        status: "success",
        message: "Message appended to AI chat.",
        data: {userMessage: message, aiResponse},
      });
      return;
    }

    // If no chatRoomId, create a new chat
    const newChatRoomRef = chatsRef.doc();
    const title = `AI Chat: ${message.slice(0, 50)}`; // Use the first user message as the title

    await newChatRoomRef.set({
      title,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const userMessageRef = newChatRoomRef.collection("messages").doc();
    await userMessageRef.set({
      sender: "user",
      content: message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const aiMessageRef = newChatRoomRef.collection("messages").doc();
    await aiMessageRef.set({
      sender: "ai",
      content: aiResponse,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      status: "success",
      message: "New AI chat created.",
      data: {
        chatRoomId: newChatRoomRef.id,
        title,
        userMessage: message,
        aiResponse,
      },
    });
  } catch (error) {
    console.error("Error handling AI chat:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to process AI chat.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};

// Fetch AI Chats
export const getAIChats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userID = (req.user as { userID: string })?.userID;

    if (!userID) {
      res.status(400).json({
        status: "fail",
        message: "userID is required.",
      });
      return;
    }

    const userRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(userID);

    const chatsRef = userRef.collection("aiChats");
    const snapshot = await chatsRef.orderBy("createdAt", "desc").get();

    if (snapshot.empty) {
      res.status(404).json({
        status: "fail",
        message: "No AI chats found for this user.",
      });
      return;
    }

    const chats = snapshot.docs.map((doc) => {
      const chatData = doc.data();

      return {
        id: doc.id,
        ...chatData,
        createdAt: chatData.createdAt ?
          chatData.createdAt.toDate().toISOString() :
          null,
      };
    });

    res.status(200).json({
      status: "success",
      message: "Fetched AI chats successfully.",
      data: chats,
    });
  } catch (error) {
    console.error("Error fetching AI chats:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to fetch AI chats.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};

// Fetch Messages in an AI Chat
export const getAIChatMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userID = (req.user as { userID: string })?.userID;
    const {chatRoomId} = req.params;

    if (!userID || !chatRoomId) {
      res.status(400).json({
        status: "fail",
        message: "userID and chatRoomId are required.",
      });
      return;
    }

    const userRef = admin
      .firestore()
      .collection("testing")
      .doc("data")
      .collection("users")
      .doc(userID);

    const messagesRef = userRef
      .collection("aiChats")
      .doc(chatRoomId)
      .collection("messages");

    const snapshot = await messagesRef.orderBy("createdAt", "asc").get();

    if (snapshot.empty) {
      res.status(404).json({
        status: "fail",
        message: "No messages found in this chat.",
      });
      return;
    }

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate().toISOString() || null,
    }));

    res.status(200).json({
      status: "success",
      message: "Fetched AI chat messages successfully.",
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching AI chat messages:", error);
    res.status(500).json({
      status: "fail",
      message: "Failed to fetch AI chat messages.",
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
};
