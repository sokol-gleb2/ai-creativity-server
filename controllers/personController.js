import knex from '../db/knex.js'; // adjust if needed

import multer from 'multer'; // Import multer for handling file uploads
const upload = multer({ dest: 'uploads/' }); // configure Multer to store files in 'uploads/' directory 

export const uploadHeadshot = upload.single('headshot'); // Middleware to handle file upload
/**
 * Person Controller
 * Handles storing and retrieving person information.
 */



export const storePerson = async (req, res) => {
  try {
    const { name, institution, industry, email, website, interests, bio } = req.body;

    console.log('Received person information:', req.body)

    // handle file upload (Multer should handle this before)
    const headshot = req.file ? req.file.path : null;

    // Generate a slug from the name (you can use a library like slugify). take into account that the same name may already exist. 
    // if so, append a number to the slug.
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = slugBase;
    let counter = 1;
    while (await knex('people').where({ slug }).first()) {
      slug = `${slugBase}-${counter}`;
      counter++;
    }


    

    console.log('Storing person information:', {
      slug,
      name,
      institution,
      industry,
      email,
      website,
      interests,
      bio,
      headshot,
    });

    // store person in the database
    const [person] = await knex('people')
      .insert({
        slug,
        name,
        institution,
        industry,
        email,
        website,
        interests,
        bio,
        headshot,
      })
      .returning(['id', 'slug', 'name', 'institution', 'industry', 'email', 'website', 'interests', 'bio', 'headshot']); // returning all fields

    res.status(201).json({
      message: 'Person information stored successfully',
      data: person,
    });
  } catch (error) {
    console.error('Error storing person information:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getPerson = async (req, res) => {
  const { slug } = req.params;

  try {
    // Fetch person by slug (assuming slug is the person's name or a unique identifier)
    const person = await knex('people').where({ slug }).first();

    if (!person) {
      return res.status(404).json({ message: 'Person not found' });
    }

    person.headshot = process.env.SERVER_URL + '/' + person.headshot; // prepend server URL to headshot path

    res.status(200).json({
      message: 'Person retrieved successfully',
      data: person,
    });
  } catch (error) {
    console.error('Error retrieving person:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}