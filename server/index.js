require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const twilio = require('twilio');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key'
});

// Initialize Twilio (optional)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve static files from parent directory

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.post('/api/diagnose', async (req, res) => {
    try {
        const { painPoint, problem } = req.body;

        const prompt = `
            Act as a no-jargon operations consultant for a small local business.
            Pain point: ${painPoint}
            Specific complaint: "${problem}"
            Give a 3-step action plan (1–2 sentences each) that shows what a custom solution could look like,
            then end with a friendly invitation: "Want this done for you? Book a call here → [Calendly link]."
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
        });

        const response = completion.choices[0].message.content;
        
        // Parse the response into steps
        const steps = response
            .split('\n')
            .filter(line => line.trim().match(/^\d+\./))
            .map(line => line.replace(/^\d+\.\s*/, ''));

        res.json({ steps });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});

// SMS Route
app.post('/api/send-sms', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        if (!twilioClient) {
            // In development, just return success
            console.log('SMS would be sent to:', phone);
            return res.json({ 
                success: true, 
                messageId: 'dev-mode',
                note: 'SMS sending is disabled in development mode'
            });
        }

        // Format phone number (remove any non-digit characters)
        const formattedPhone = phone.replace(/\D/g, '');

        // Send SMS using Twilio
        const message = await twilioClient.messages.create({
            body: "Thanks for your interest! Here's your custom plan:\n\n" +
                  "1. We'll analyze your workflow and identify bottlenecks\n" +
                  "2. We'll implement an automated solution that fits your needs\n" +
                  "3. We'll train your team and ensure everything runs smoothly\n\n" +
                  "Want to discuss this in detail? Book a call: [Calendly link]",
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedPhone
        });

        res.json({ success: true, messageId: message.sid });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ error: 'Failed to send SMS' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    if (!twilioClient) {
        console.log('Note: SMS functionality is disabled (Twilio credentials not found)');
    }
}); 