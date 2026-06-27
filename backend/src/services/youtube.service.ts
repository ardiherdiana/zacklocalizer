import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const TOKENS_FILE = path.resolve('./youtube_tokens.json');

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3001/api/youtube/callback',
);

// Load persisted tokens on startup
if (fs.existsSync(TOKENS_FILE)) {
  try {
    const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    oauth2Client.setCredentials(tokens);
  } catch {
    // ignore corrupt file
  }
}

export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
    prompt: 'consent',
  });
}

export async function handleOAuthCallback(code: string): Promise<void> {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

export function isAuthorized(): boolean {
  const creds = oauth2Client.credentials;
  return !!(creds?.refresh_token || creds?.access_token);
}

export function isAutoPostEnabled(): boolean {
  return process.env.YOUTUBE_AUTO_POST === 'true';
}

export async function uploadVideo(params: {
  filePath: string;
  title: string;
  description: string;
  tags?: string[];
}): Promise<{ videoId: string; url: string }> {
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const privacyStatus =
    (process.env.YOUTUBE_PRIVACY as 'public' | 'private' | 'unlisted') ?? 'public';

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: params.title,
        description: params.description,
        tags: params.tags ?? [],
        categoryId: '22', // People & Blogs
        defaultLanguage: 'id',
        defaultAudioLanguage: 'id',
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(params.filePath),
    },
  });

  const videoId = response.data.id!;
  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
}
