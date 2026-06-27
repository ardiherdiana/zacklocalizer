import { Router } from 'express';
import { getAuthUrl, handleOAuthCallback, isAuthorized, isAutoPostEnabled } from '../services/youtube.service';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({
    authorized: isAuthorized(),
    autoPost: isAutoPostEnabled(),
  });
});

router.get('/auth', (_req, res) => {
  res.redirect(getAuthUrl());
});

router.get('/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).send('Missing code');
    return;
  }
  try {
    await handleOAuthCallback(code);
    res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>✅ YouTube authorized!</h2>
        <p>Token tersimpan. Kamu bisa tutup tab ini.</p>
      </body></html>
    `);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).send(`OAuth error: ${msg}`);
  }
});

export default router;
