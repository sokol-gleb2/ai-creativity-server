import 'dotenv/config';
import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-3.5-turbo';

export async function sendToOpenAI(prompt) {
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 512,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    throw new Error('Failed to get response from OpenAI API');
  }
} 