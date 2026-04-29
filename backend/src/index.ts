import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';

dotenv.config();

import channelRouter from './routes/channel.routes';
import jobRouter from './routes/job.routes';

const app = express();
app.use(cors());
app.use(express.json());

// Ensure download directories exist
const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || './downloads';
['raw', 'assets', 'final'].forEach((dir) => {
  fs.mkdirSync(path.join(DOWNLOADS_DIR, dir), { recursive: true });
});

// Routes
app.use('/api/channel', channelRouter);
app.use('/api/jobs', jobRouter);

// Serve final videos statically
app.use('/downloads/final', express.static(path.join(DOWNLOADS_DIR, 'final')));

const PORT = process.env.PORT || 3001;
createServer(app).listen(PORT, () => {
  console.log(`ZackLocalizer backend running on port ${PORT}`);
});
