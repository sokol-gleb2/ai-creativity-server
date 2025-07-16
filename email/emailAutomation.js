import 'dotenv/config';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import axios from 'axios';
// import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
// import { v4 as uuidv4 } from 'uuid';
import { sendToOpenAI } from '../llm/openai.js';

// Helpers for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Python environment and script
// const pythonScriptPath = path.resolve(__dirname, '../parser', 'formScript.py');
// const venvActivate = path.resolve(__dirname, '../parser', '.venv/bin/activate');

// IMAP Setup
const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: process.env.IMAP_HOST,
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

let nextUid = null;

imap.once('ready', function () {
  openInbox(function (err, box) {
    if (err) {
      console.error('❌ Failed to open inbox:', err);
      return;
    }

    console.log('✅ IMAP connected. Watching for new emails...');
    nextUid = box.uidnext;

    imap.on('mail', function () {
      if (!nextUid) return;

      const fetch = imap.fetch(`${nextUid}:*`, { bodies: '', struct: true });

      fetch.on('message', msg => {
        let rawEmail = '';

        msg.on('body', stream => {
          stream.on('data', chunk => {
            rawEmail += chunk.toString('utf8');
          });
        });

        msg.once('end', () => {
          simpleParser(rawEmail, async (err, parsed) => {
            if (err) {
              console.error('❌ Parse error:', err);
              return;
            }

            const emailData = {
              name: parsed.from?.text || '',
              subject: parsed.subject || '',
              detail: parsed.text || '',
              html: parsed.html || ''
            };

            const previewText = parsed.text?.slice(0, 200)?.replace(/\s+/g, ' ') || '[no text]';
            console.log('📩 New Email Received');
            console.log('📨 Subject:', emailData.subject);
            console.log('📝 Preview:', previewText);

            try {
              const tmpDir = path.resolve(__dirname, './tmp');
              if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

              // Optionally log email
              const logPath = path.join(__dirname, 'emails.log');
              fs.appendFileSync(logPath, JSON.stringify(emailData, null, 2) + '\n\n');
              console.log('✅ Email data logged');

              // Format prompt and send to OpenAI
              const prompt = await formatEmailPrompt(emailData);
              try {
                const openaiResponse = await sendToOpenAI(prompt);
                console.log('🤖 OpenAI response:', openaiResponse);
              } catch (openaiErr) {
                console.error('❌ OpenAI API error:', openaiErr.message);
              }
            } catch (error) {
              console.error('❌ Email processing error:', error.message);
            }
          });
        });
      });

      nextUid++;
    });
  });
});

imap.once('error', function (err) {
  console.error('❌ IMAP error:', err);
});

imap.once('end', function () {
  console.log('📭 IMAP connection ended');
});

imap.connect();

const loadSchema = (fileName) => {
  const fullPath = path.join(__dirname, fileName);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

const formatSchema = (title, schema) => {
  let formatted = `- ${title}:\n`;
  for (const key in schema) {
      const val = schema[key];
      if (Array.isArray(val)) {
          formatted += `  - ${key}: one of [${val.map(v => `"${v}"`).join(', ')}]\n`;
      } else if (val === 'long string') {
          formatted += `  - ${key}: long string\n`;
      } else {
          formatted += `  - ${key}: ${val}\n`;
      }
  }
  return formatted;
}

const formatEmailPrompt = async (emailData) => {
  // Load schemas
  const profileSchema = loadSchema('../structure/profile-structure.json');
  const eventSchema = loadSchema('../structure/event-structure.json');
  const groupSchema = loadSchema('../structure/group-structure.json');

  // Build prompt
  const prompt = `
    You will be given an email body and subject. Your task is to:
    1. Classify it into one of the following categories: "profile", "event", or "group".
    2. Extract the relevant fields based on the category's schema.
    3. If the email does not match any of the categories, return: { "category": false }

    Schemas:

    ${formatSchema('profile', profileSchema)}
    ${formatSchema('event', eventSchema)}
    ${formatSchema('group', groupSchema)}

    Return your result as a JSON object with the following format:
    {
      "category": "<profile | event | group>",
      "data": {
        // filled-in fields based on the category schema
      }
    }

    Input:
    ${emailData}
  `;

  return prompt;
}