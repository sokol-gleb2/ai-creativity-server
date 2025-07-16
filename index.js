import express from 'express';
import cors from 'cors';
import uploadRoutes from './routes/uploadRoutes.js';
import "dotenv/config.js";

const app = express();
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use(cors({
  origin: process.env.CLIENT_URL, // or whatever port your Vite frontend runs on
}));

app.use(cors());

app.use('/api', uploadRoutes);

app.listen(process.env.PORT, () => console.log(`Server running on http://localhost:${process.env.PORT}`));
