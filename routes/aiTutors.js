const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Storing active chat objects by sessionId
const chats = new Map();

const SYSTEM_PROMPT = `
You are an AI Tutor for a school website.

Give short, simple and accurate answers.
Usually respond in 1-3 short sentences.
Explain things in a way children can understand.
Encourage learning and curiosity.
Do not overwhelm the learner with unnecessary information.
`;

// Helper to instantiate a new chat session for a specific model
function createChatSession(modelName) {
  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });
}

router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        message: "Please enter a question.",
      });
    }

    // Retrieve or initialize the chat session
    let chat = chats.get(sessionId);
    if (!chat) {
      chat = createChatSession("gemini-3.5-flash-lite");
      chats.set(sessionId, chat);
    }

    let response;
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        response = await chat.sendMessage({
          message: message.trim(),
        });
        
        // Success! Break out of the loop
        break; 
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts - 1;
        
        // Check for 503 Overloaded Error
        if (error.status === 503 && !isLastAttempt) {
          // If the first attempt fails, retry the lite model after a short delay
          // If the second attempt fails, switch the active chat model to a backup
          if (attempt === 1) {
            console.warn(`Attempt ${attempt + 1} failed with 503. Switching session to backup model.`);
            
            // Re-create the chat instance using a stable fallback model
            // Note: This starts a fresh history for this fallback window.
            chat = createChatSession("gemini-2.5-flash");
            chats.set(sessionId, chat);
          }

          // Exponential backoff delay (1s, then 2s)
          const delay = 1000 * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Rethrow the error if it's not a 503, or if we have run out of retry attempts
        throw error;
      }
    }

    res.json({
      reply: response.text,
    });
  } catch (error) {
    console.error("AI Tutor error:", error);

    res.status(500).json({
      message: "AI Tutor is temporarily busy. Please try sending your message again.",
    });
  }
});

module.exports = router;






// const express = require('express');
// const { GoogleGenAI } = require('@google/genai');

// const router = express.Router();

// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

// const chats = new Map();

// const SYSTEM_PROMPT = `
// You are a friendly AI Tutor for a school.

// Give short, clear, age-appropriate answers.
// Usually respond in 1-3 short sentences.
// Do not give long explanations unless the learner asks for more detail.
// Use simple language.
// Encourage curiosity and learning.
// If a learner asks a difficult question, explain the basic idea simply.
// `;

// router.post("/chat", async (req, res) => {
//   try {
//     const { message, sessionId } = req.body;

//     if (!message?.trim()) {
//       return res.status(400).json({
//         message: "Please enter a question.",
//       });
//     }

//     let chat = chats.get(sessionId);

//     if (!chat) {
//       chat = ai.chats.create({
//         model: "gemini-3.5-flash-lite",
//         config: {
//           systemInstruction: `
// You are an AI Tutor for a school website.

// Give short, simple and accurate answers.
// Usually respond in 1-3 short sentences.
// Explain things in a way children can understand.
// Encourage learning and curiosity.
// Do not overwhelm the learner with unnecessary information.
//           `,
//         },
//       });

//       chats.set(sessionId, chat);
//     }

//     let response;

// for (let attempt = 0; attempt < 3; attempt++) {
//   try {
//     response = await chat.sendMessage({
//       message,
//     });

//     break;
//   } catch (error) {
//     if (error.status === 503 && attempt < 2) {
//       await new Promise((resolve) =>
//         setTimeout(resolve, 1000 * (attempt + 1))
//       );

//       continue;
//     }

//     throw error;
//   }
// }

//     // const res = await chat.sendMessage({
//     //   message: message.trim(),
//     // });

//     res.json({
//       reply: response.text,
//     });
//   } catch (error) {
//     console.error("AI Tutor error:", error);

//     res.status(500).json({
//       message: "AI Tutor is temporarily unavailable.",
//     });
//   }
// });

// module.exports = router;