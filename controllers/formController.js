import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import knex from '../db/knex.js';
import { sendToOpenAI } from '../llm/openai.js';
// import fs from 'fs';
// import path from 'path';

const pythonScriptPath = path.resolve('../parser', 'formScript.py');
const venvActivate = path.resolve('../parser', '.venv/bin/activate');

export const handleForm = async (req, res) => {
  const inputParameters = req.body;
  console.log('Received input parameters:', inputParameters);
  const { form_type, ...data } = inputParameters;

  const detail = data.detail;
  if (form_type === 'generic') {
    let openai_response = null;
    try {
      const prompt = await formatEmailPrompt(detail);
      openai_response = await sendToOpenAI(prompt);
    } catch (err) {
      return res.status(400).json({ error: `Can't connect to OpenAI: ${err}` });
    }
    
    let parsed;
    try {
      parsed = JSON.parse(openai_response);
    } catch (err) {
      return res.status(400).json({ error: `Can't parse OpenAI response: ${err}` });
    }

    if (parsed.category === false) {
      return res.status(400).json({ error: `Can't parse OpenAI response: ${err}` });
    }

    form_type = parsed.category;
    data = parsed.data;
    data.detail = detail;
  }

  // Map form_type to table name (pluralized)
  const tableMap = {
    event: 'events',
    group: 'groups',
    profile: 'profiles', // 'profile' form_type maps to 'persons' table
  };
  const tableName = tableMap[form_type];
  if (!tableName) {
    return res.status(400).json({ error: `Unknown form_type: ${form_type}` });
  }

  // Load structure JSON
  const structurePath = path.resolve('structure', `${form_type}-structure.json`);
  let structure;
  try {
    structure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
  } catch (err) {
    console.error('Error loading structure file:', err);
    return res.status(500).json({ error: 'Could not load structure file.' });
  }

  // Extract only the fields defined in the structure
  const fields = Object.keys(structure);
  const insertData = {};
  for (const field of fields) {
    if (data[field] !== undefined) {
      insertData[field] = data[field];
    }
  }

  try {
    const [inserted] = await knex(tableName)
      .insert(insertData)
      .returning('*');

    // Send detail to OpenAI if present
    // let openai_response = null;


    // console.log('OpenAI response:', openai_response);

    res.status(201).json({
      message: `${form_type} information stored successfully`,
      data: inserted,
      // openai_response,
    });
  } catch (error) {
    console.error(`Error storing ${form_type} information:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }

  
};

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

const formatEmailPrompt = async (description) => {
  // Load schemas
  const profileSchema = loadSchema('./profile-structure.json');
  const eventSchema = loadSchema('./event-structure.json');
  const groupSchema = loadSchema('./group-structure.json');

  // Build prompt
  const prompt = `
    You will be given a natural language description. Your task is to:
    1. Classify it into one of the following categories: "profile", "event", or "group".
    2. Extract the relevant fields based on the category's schema.
    3. If the description does not match any of the categories, return: { "category": false }

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
    ${description}
  `;

  return prompt;
}
