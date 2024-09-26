//nodemon index.js
import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
import OpenAI from "openai";

config();

// Setup server
const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// MongoDB connection
mongoose
  .connect("mongodb://127.0.0.1:27017/chatbot")
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define Mongoose Schema for storing user responses
const responseSchema = new mongoose.Schema(
  {
    name: String,
    question: String,
    answer: String,
    date: { type: Date, default: Date.now },
  },
  { collection: "questions" }
);

const Response = mongoose.model("Response", responseSchema);

// Instantiate OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to generate a new question from OpenAI
async function generateQuestion(userMessage) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "user", content: userMessage },
      {
        role: "system",
        content: "Ask a follow-up question based on the user's response.",
      },
    ],
  });
  return completion.choices[0].message.content;
}

// Start route to ask the first question
app.post("/start", async (req, res) => {
  const { name } = req.body;

  try {
    // Check if there's already a session for the user
    const existingResponse = await Response.findOne({ name }).sort({
      date: -1,
    });

    if (existingResponse) {
      // Continue the conversation with the last unanswered question
      return res.json({ response: existingResponse.question });
    }

    // Ask the first question if no previous session exists
    const firstQuestion = await generateQuestion(
      "Start a conversation with a general question."
    );

    // Save the first question in the database with an empty answer field
    const newResponse = new Response({
      name,
      question: firstQuestion,
      answer: "", // No answer yet
    });
    await newResponse.save();

    // Send the first question as the response
    res.json({ response: firstQuestion });
  } catch (error) {
    console.error("Error generating the first question:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// Chatbot POST route to handle user responses and generate the next question
app.post("/chat", async (req, res) => {
  const { message: userMessage, name } = req.body;

  if (!userMessage) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    // Get the last question asked to the user
    const lastResponse = await Response.findOne({ name }).sort({ date: -1 });

    if (!lastResponse) {
      return res.status(400).json({
        message: "No previous question found. Please start the conversation.",
      });
    }

    // Save the user's answer to the last unanswered question
    if (lastResponse.answer === "") {
      lastResponse.answer = userMessage;
      await lastResponse.save();
    } else {
      return res.status(400).json({
        message: "Please answer the previous question before proceeding.",
      });
    }

    // Generate the next question based on the user's input
    const nextQuestion = await generateQuestion(userMessage);

    // Save the new question to the database (empty answer for now)
    const newChatResponse = new Response({
      name,
      question: nextQuestion,
      answer: "", // The new question has no answer yet
    });
    await newChatResponse.save();

    // Send the next question as the response
    res.json({ response: nextQuestion });
  } catch (error) {
    console.error("Error during OpenAI call:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Listen on a port
const port = 5000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
