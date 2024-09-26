//npm start
import React, { useState, useEffect, useRef } from "react";
import "./App.css";

function App() {
  // Hold the input text, response, and user's name
  const [inputText, setInputText] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [userName, setUserName] = useState(""); // Store user's name
  const [isFirstQuestionFetched, setIsFirstQuestionFetched] = useState(false); // Track if first question has been fetched
  const hasPromptedForName = useRef(false); // Track if the prompt has been shown

  // Prompt user for their name only once
  useEffect(() => {
    if (!hasPromptedForName.current) {
      const name = prompt("Please enter your name:");
      if (name) {
        setUserName(name); // Store the entered name
      }
      hasPromptedForName.current = true; // Mark the prompt as shown
    }
  }, []);

  // Fetch the first question only after the user's name is set
  useEffect(() => {
    const fetchFirstQuestion = async () => {
      if (userName && !isFirstQuestionFetched) {
        try {
          const res = await fetch("http://localhost:5000/start", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: userName }), // Send the user's name
          });

          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }

          const data = await res.json();
          setChatHistory([{ sender: "bot", message: data.response }]);
          setIsFirstQuestionFetched(true); // Mark the first question as fetched
        } catch (error) {
          console.error("Error fetching first question:", error);
        }
      }
    };

    fetchFirstQuestion();
  }, [userName, isFirstQuestionFetched]);

  // To stop refreshing the page
  const handleSubmit = (e) => {
    e.preventDefault();
  };

  // Function to handle input from user
  const handleChange = (e) => {
    setInputText(e.target.value);
  };

  const handleClick = async () => {
    setChatHistory([...chatHistory, { sender: "user", message: inputText }]);

    try {
      // Send the user's input and name to the backend
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: inputText, name: userName }), // Send the user's message and name
      });

      if (!res.ok) {
        console.log(res.status);
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      // Add the chatbot's response to the chat history
      setChatHistory((prevHistory) => [
        ...prevHistory,
        { sender: "bot", message: data.response },
      ]);

      // Clear the input after sending
      setInputText("");
    } catch (error) {
      console.error("Error fetching chatbot response:", error);
    }
  };

  return (
    <div className="App">
      <form action="" onSubmit={handleSubmit}>
        <div className="card">
          <div className="chat-history">
            {chatHistory.map((chat, index) => (
              <div
                key={index}
                className={`chat-message ${
                  chat.sender === "user" ? "user" : "bot"
                }`}
              >
                <strong>{chat.sender === "user" ? "You" : "Bot"}: </strong>
                <span>{chat.message}</span>
              </div>
            ))}
          </div>
          <div className="chat-body">
            <div className="chat-input">
              <input type="text" value={inputText} onChange={handleChange} />
              <div className="chat-btn">
                <button onClick={handleClick}>Send</button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default App;
