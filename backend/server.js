
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const path = require('path');
const { randomUUID } = require('crypto');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Firebase connection
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase();

console.log('Firebase connected successfully!');

// Test route
app.get('/', (req, res) => {
  res.send('LIFE-BOT Backend is running!');
});

// ==================================
// CONVERSATION HISTORY
// ==================================

// 1. Get all conversations
app.get('/conversations', async (req, res) => {
  try {
    const snapshot = await db.ref('conversations').once('value');

    const conversations = [];

    snapshot.forEach((child) => {
      const data = child.val();
      const messages = data.messages || {};

      const messageList = Object.entries(messages).map(([id, msg]) => ({
        id,
        ...msg,
      }));

      messageList.sort((a, b) => a.timestamp - b.timestamp);

      if (messageList.length > 0) {
        const lastMessage = messageList[messageList.length - 1];

        conversations.push({
          id: child.key,
          lastMessage: lastMessage.text,
          updatedAt: lastMessage.timestamp,
          messageCount: messageList.length,
        });
      }
    });

    conversations.sort((a, b) => b.updatedAt - a.updatedAt);

    res.json(conversations);

  } catch (error) {
    console.error('History Error:', error.message);
    res.status(500).json({ error: 'Cannot retrieve conversations' });
  }
});


// 2. Get messages of one conversation
app.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await db.ref(`conversations/${id}/messages`).once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        error: 'Conversation not found',
      });
    }

    const messages = [];

    snapshot.forEach((child) => {
      messages.push({
        id: child.key,
        ...child.val(),
      });
    });

    messages.sort((a, b) => a.timestamp - b.timestamp);

    res.json({
      conversationId: id,
      messages,
    });

  } catch (error) {
    console.error('Get Messages Error:', error.message);
    res.status(500).json({ error: 'Cannot retrieve messages' });
  }
});


// 3. Delete a conversation
app.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const conversationRef = db.ref(`conversations/${id}`);
    const snapshot = await conversationRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        error: 'Conversation not found',
      });
    }

    await conversationRef.remove();

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });

  } catch (error) {
    console.error('Delete Error:', error.message);
    res.status(500).json({ error: 'Cannot delete conversation' });
  }
});


// ==================================
// SMART REMINDERS
// ==================================

// 1. Create a reminder
app.post('/reminders', async (req, res) => {
  try {
    const { title, description, remindAt, category } = req.body;

    if (!title || !remindAt) {
      return res.status(400).json({
        error: 'Title and remindAt are required',
      });
    }

    const reminderDate = new Date(remindAt);

    if (isNaN(reminderDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid reminder date',
      });
    }

    if (reminderDate.getTime() <= Date.now()) {
      return res.status(400).json({
        error: 'Reminder date must be in the future',
      });
    }

    const reminderRef = db.ref('reminders').push();

    const reminder = {
      id: reminderRef.key,
      title: title.trim(),
      description: description || '',
      category: category || 'general',
      remindAt: reminderDate.toISOString(),
      createdAt: Date.now(),
      status: 'pending',
      timezone: 'Africa/Tunis',
    };

    await reminderRef.set(reminder);

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      reminder,
    });

  } catch (error) {
    console.error('Create Reminder Error:', error.message);
    res.status(500).json({ error: 'Cannot create reminder' });
  }
});


// 2. Get all reminders
app.get('/reminders', async (req, res) => {
  try {
    const snapshot = await db.ref('reminders').once('value');

    const reminders = [];

    snapshot.forEach((child) => {
      reminders.push(child.val());
    });

    reminders.sort((a, b) =>
      new Date(a.remindAt) - new Date(b.remindAt)
    );

    res.json(reminders);

  } catch (error) {
    console.error('Get Reminders Error:', error.message);
    res.status(500).json({ error: 'Cannot retrieve reminders' });
  }
});


// 3. Update a reminder
app.patch('/reminders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, remindAt, category, status } = req.body;

    const reminderRef = db.ref(`reminders/${id}`);
    const snapshot = await reminderRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        error: 'Reminder not found',
      });
    }

    const updates = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Invalid title' });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;

    if (remindAt !== undefined) {
      const date = new Date(remindAt);

      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid reminder date' });
      }

      if (date.getTime() <= Date.now()) {
        return res.status(400).json({
          error: 'Reminder date must be in the future',
        });
      }

      updates.remindAt = date.toISOString();
    }

    if (status !== undefined) {
      if (!['pending', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid reminder status' });
      }
      updates.status = status;
    }

    await reminderRef.update(updates);

    const updatedSnapshot = await reminderRef.once('value');

    res.json({
      success: true,
      reminder: updatedSnapshot.val(),
    });

  } catch (error) {
    console.error('Update Reminder Error:', error.message);
    res.status(500).json({ error: 'Cannot update reminder' });
  }
});


// 4. Delete a reminder
app.delete('/reminders/:id', async (req, res) => {
  try {
    const reminderRef = db.ref(`reminders/${req.params.id}`);
    const snapshot = await reminderRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        error: 'Reminder not found',
      });
    }

    await reminderRef.remove();

    res.json({
      success: true,
      message: 'Reminder deleted successfully',
    });

  } catch (error) {
    console.error('Delete Reminder Error:', error.message);
    res.status(500).json({ error: 'Cannot delete reminder' });
  }
});

// Chatbot Gemini AI
async function startServer() {
  try {
    const { GoogleGenAI } = await import('@google/genai');

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is missing in .env');
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // AI REMINDER UNDERSTANDING
    async function detectReminderRequest(message) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Tunis',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date());

      const get = (type) => parts.find(p => p.type === type).value;

      const localNow =
        `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}+01:00`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `
You are a reminder extraction assistant.

Current date and time in Tunisia (Africa/Tunis): ${localNow}

Analyze this user message:
"${message}"

Return ONLY valid JSON with this structure:
{
  "isReminderRequest": false,
  "title": "",
  "description": "",
  "category": "general",
  "remindAt": null
}

Rules:
- Detect clear requests to create a reminder.
- Do not create reminders for ordinary questions or hypothetical examples.
- Understand French, English and Tunisian Arabic.
- Resolve relative dates like tomorrow and next Friday using the current Tunisia date.
- Convert the requested time to ISO 8601 with Tunisia offset +01:00.
- Categories: study, medication, appointment, task, general.
- If date or time is missing, keep remindAt null.
- Never invent a date or time.
- Do not create reminders for dates in the past.
`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      return JSON.parse(result.text);
    }


    app.post('/chat', async (req, res) => {
      try {
        const { message } = req.body;

        let { conversationId } = req.body;

        if (!message || !message.trim()) {
          return res.status(400).json({
            error: 'Message is required',
          });
        }

        // Create an ID if this is a new conversation
        if (!conversationId) {
          conversationId = randomUUID();
        }

        // Firebase reference for this conversation
        const messagesRef = db.ref(
          `conversations/${conversationId}/messages`
        );

        // Save user's message
        await messagesRef.push({
          role: 'user',
          text: message,
          timestamp: Date.now(),
        });


        // Detect reminders only when the message looks like a reminder request
        let createdReminder = null;
        let reminderIntent = false;

        const reminderKeywords =
          /\b(remind me|reminder|rappel|rappelle-moi|n'oublie pas|don't forget|remember to|fakkerni|dhakkerni|ma tensach|ذكّرني|ذكرني)\b/i;

        if (reminderKeywords.test(message)) {
          try {
            const extracted = await detectReminderRequest(message);

            reminderIntent = extracted.isReminderRequest === true;

            if (reminderIntent && extracted.title && extracted.remindAt) {
              const reminderDate = new Date(extracted.remindAt);

              if (
                !isNaN(reminderDate.getTime()) &&
                reminderDate.getTime() > Date.now()
              ) {
                const reminderRef = db.ref('reminders').push();

                createdReminder = {
                  id: reminderRef.key,
                  title: extracted.title,
                  description: extracted.description || '',
                  category: extracted.category || 'general',
                  remindAt: reminderDate.toISOString(),
                  createdAt: Date.now(),
                  status: 'pending',
                  timezone: 'Africa/Tunis',
                };

                await reminderRef.set(createdReminder);
              }
            }
          } catch (error) {
            console.error('AI Reminder Error:', error.message);
          }
        }

        const snapshot = await messagesRef
          .orderByKey()
          .limitToLast(20)
          .once('value');

        const contents = [];

        snapshot.forEach((child) => {
          const data = child.val();

          contents.push({
            role: data.role,
            parts: [{ text: data.text }],
          });
        });

        // Generate AI response
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: contents,
          config: {
            
systemInstruction: `You are LIFE-BOT, a friendly AI companion.
Be kind, patient, supportive and helpful.
Give clear and natural answers.
Help users with daily organization and emotional support.
You are not a medical professional.

REMINDER RULES:
${createdReminder
  ? `A reminder was successfully saved in Firebase:
     Title: ${createdReminder.title}
     Date: ${createdReminder.remindAt}
     Confirm its creation naturally to the user.`
  : reminderIntent
    ? `The user requested a reminder, but a valid future date and time were not provided.
       Ask the user for the missing date or time.
       Never claim that a reminder was created.`
    : `Do not claim that reminders were created unless they were actually saved.`}`,

          },
        });

        const reply = response.text;

        // Save AI response
        await messagesRef.push({
          role: 'model',
          text: reply,
          timestamp: Date.now(),
        });

        res.json({
          reply: reply,
          conversationId: conversationId,
        });

      } catch (error) {
        console.error('Chat Error:', error.message);

        const isQuotaError =
          error.status === 429 ||
          error.code === 429 ||
          error.message?.includes('429') ||
          error.message?.includes('RESOURCE_EXHAUSTED');

        if (isQuotaError) {
          return res.status(429).json({
            error: 'LIFE-BOT AI is temporarily unavailable because the daily Gemini quota has been reached. Please try again later.',
            code: 'GEMINI_QUOTA_EXCEEDED',
            conversationId,
          });
        }

        return res.status(500).json({
          error: 'Sorry, something went wrong.',
          conversationId,
        });
      }

      
    });

    const PORT = 3000;

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`LIFE-BOT Gemini server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Server startup error:', error.message);
  }
}

startServer();
