import express from 'express';
import multer from 'multer';
import { handleUpload, generatedPages } from '../controllers/uploadController.js';
import { handleForm } from '../controllers/formController.js';
import { storePerson, getPerson } from '../controllers/personController.js';
import upload from "../middleware/upload.js";

const router = express.Router();

router.post('/upload', upload.fields([{ name: 'email' }, { name: 'schema' }]), handleUpload);
router.post('/form', handleForm);
router.post('/person', upload.single('headshot'), storePerson);
router.get('/person/:slug', getPerson); // Assuming this is for fetching a person's details
router.get('/generated-pages', generatedPages);

export default router;