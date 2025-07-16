import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import knex from '../db/knex.js';

const pythonScriptPath = path.resolve('../parser', 'script.py'); // use relative to project root
const venvActivate = path.resolve('../parser', '.venv/bin/activate'); // adjust if needed

export const handleUpload = (req, res) => {
  const email = req.files?.email?.[0];
  const schema = req.files?.schema?.[0];

  if (!email || !schema) {
    return res.status(400).json({ error: 'Both email and schema files are required.' });
  }

  const emailPath = email.path;
  const schemaPath = schema.path;

  const command = `source ${venvActivate} && python ${pythonScriptPath} ${emailPath} ${schemaPath}`;

  console.log(command)

  exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
    console.log('STDOUT:', stdout);
    console.log('STDERR:', stderr);

    if (error) {
      console.error('EXEC ERROR:', error);
      return res.status(500).json({ error: stderr || error.message });
    }

    try {
      const parsed = JSON.parse(stdout);
      return res.json(parsed);
    } catch (err) {
      console.error('JSON PARSE ERROR:', err.message);
      return res.status(500).json({ error: 'Invalid JSON from Python script' });
    }
  });
};

export const generatedPages = async (req, res) => {
  try {
    // Fetch the 5 most recent entries from each table by descending id
    const [profiles, groups, events] = await Promise.all([
      knex('profiles').orderBy('id', 'desc').limit(5),
      knex('groups').orderBy('id', 'desc').limit(5),
      knex('events').orderBy('id', 'desc').limit(5),
    ]);
    const all = [
      ...profiles.map(item => ({ ...item, category: 'Profile' })),
      ...groups.map(item => ({ ...item, category: 'Group' })),
      ...events.map(item => ({ ...item, category: 'Event' })),
    ];
    res.json(all);
  } catch (error) {
    console.error('Error fetching generated pages:', error);
    res.status(500).json({ error: 'Failed to fetch generated pages' });
  }
};
