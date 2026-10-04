import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { analyzeWithGemmaApi, analyzeWithOllama, buildPrompt, parseModelText, prepareChat, validateAnalysis } from './analyze.js';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/calendar.js': ['calendar.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'GET' && assets[path]) {
      const [file, type] = assets[path];
      return send(res, 200, await readFile(join(root, 'public', file), 'utf8'), type);
    }
    if (req.method === 'GET' && path === '/api/config') {
      return send(res, 200, { cloudAvailable: Boolean(process.env.GEMMA_API_KEY) });
    }
    if (req.method === 'POST' && path === '/api/analyze') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 16000) throw new Error('The conversation is too long.');
      }
      const input = JSON.parse(body);
      const lines = prepareChat(input.chat);
      const name = String(input.name || '').slice(0, 80);
      const today = /^\d{4}-\d{2}-\d{2}$/.test(input.today) ? input.today : '2026-10-03';
      const prompt = buildPrompt(lines, name, today);
      const text = input.provider === 'cloud' ? await analyzeWithGemmaApi(prompt) : await analyzeWithOllama(prompt);
      return send(res, 200, { ...validateAnalysis(parseModelText(text), lines), provider: input.provider === 'cloud' ? 'Gemma API' : 'local Ollama' });
    }
    send(res, 404, { error: 'Not found.' });
  } catch (error) {
    send(res, 400, { error: error.message || 'Something went wrong.' });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Pakka? is running at http://localhost:${port}`));
