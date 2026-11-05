import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const mimeTypes = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };
const imageProductionRules = `This is a SQUARE, IMAGE-ONLY illustration panel for a professionally typeset book. Compose for a nearly square page, not a wide landscape. The story title is deliberately withheld: never invent or draw it. Never draw, write, imitate, or crop any text: no words, letters, title, caption, logo, watermark, speech bubble, sign, label, or decorative pseudo-text. The book layout adds all written story text separately. Keep every face, head, hand, key prop, and focal action safely inside the central 72% of the frame; leave calm, uncluttered outer margins on every side and never crop the hero or the key story action.`;
const teaserMode = process.env.PRINTALE_SITE_MODE === 'teaser';
const previewPassword = process.env.PRINTALE_PREVIEW_PASSWORD || '';
const previewCookieName = 'printale_preview';
const previewSessionToken = previewPassword
  ? createHash('sha256').update(`printale-preview:${previewPassword}`).digest('base64url')
  : '';

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function cookies(request) {
  return Object.fromEntries(String(request.headers.cookie || '').split(';').map((part) => {
    const [key, ...value] = part.trim().split('=');
    return [key, value.join('=')];
  }).filter(([key]) => key));
}

function hasMatchingValue(received, expected) {
  const left = Buffer.from(received || '');
  const right = Buffer.from(expected || '');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function grantPreviewAccess(request, response) {
  if (!teaserMode) return true;
  if (previewSessionToken && hasMatchingValue(cookies(request)[previewCookieName], previewSessionToken)) return true;
  const authorization = String(request.headers.authorization || '');
  const encoded = authorization.startsWith('Basic ') ? authorization.slice(6) : '';
  let submittedPassword = '';
  try { submittedPassword = Buffer.from(encoded, 'base64').toString('utf8').split(':').slice(1).join(':'); } catch { /* denied below */ }
  if (previewPassword && hasMatchingValue(submittedPassword, previewPassword)) {
    response.setHeader('Set-Cookie', `${previewCookieName}=${previewSessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
    return true;
  }
  response.writeHead(401, {
    'Content-Type': 'text/plain; charset=utf-8',
    'WWW-Authenticate': 'Basic realm="PrinTale private preview", charset="UTF-8"',
    'Cache-Control': 'no-store',
  });
  response.end('Private preview only.');
  return false;
}

function peechoSetupStatus() {
  const missing = [];
  if (!process.env.PEECHO_API_KEY) missing.push('a private Peecho API key');
  if (!process.env.PEECHO_PUBLIC_FILE_BASE_URL) missing.push('a public HTTPS file address');
  return {
    ready: missing.length === 0,
    missing,
    environment: process.env.PEECHO_ENV === 'production' ? 'production' : 'sandbox',
    note: 'Peecho checkout will collect payment and delivery details directly. PrinTale will never receive card details.',
  };
}

function createParentProof(payload) {
  const id = randomUUID();
  const output = join(root, 'outputs', 'print-proofs', `${id}.pdf`);
  const python = process.env.STORYSPARK_PYTHON || (process.platform === 'win32'
    ? 'C:\\Users\\sciampa\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe'
    : 'python3');
  return new Promise((resolve, reject) => {
    // Explicit UTF-8 prevents curly apostrophes and names from turning into
    // mojibake when Windows launches the PDF renderer.
    const child = spawn(python, ['-X', 'utf8', join(root, 'print_proof.py')], { stdio: ['pipe', 'ignore', 'pipe'], env: { ...process.env, PYTHONUTF8: '1' } });
    let errors = '';
    child.stderr.on('data', (chunk) => { errors += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(`/outputs/print-proofs/${id}.pdf`) : reject(new Error(errors || 'The parent PDF proof could not be created.')));
    child.stdin.end(JSON.stringify({ ...payload, output }));
  });
}

function extractText(apiResponse) {
  if (apiResponse.output_text) return apiResponse.output_text.trim();
  return (apiResponse.output || []).flatMap((item) => item.content || []).filter((content) => content.type === 'output_text').map((content) => content.text).join('\n').trim();
}

async function translateInterface(texts, language) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Website translation is not configured on this computer.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-6-astra', store: false, instructions: `Translate each item in the JSON input array from English to ${({ de: 'German', 'pt-BR': 'Brazilian Portuguese', es: 'Spanish', it: 'Italian' })[language] || 'English'}. Keep names, numbers, arrows, symbols, and brand name PrinTale unchanged. Return only a JSON array of translated strings in exactly the same order.`, input: JSON.stringify(texts) }),
  });
  if (!response.ok) throw new Error('The website translation service is unavailable right now.');
  const output = extractText(await response.json()).replace(/^```json\s*|\s*```$/g, '');
  const result = JSON.parse(output);
  if (!Array.isArray(result) || result.length !== texts.length) throw new Error('The website translation could not be verified.');
  return result;
}

function decodeImageDataUrl(imageDataUrl) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
  if (!match) throw new Error('Please choose a PNG, JPEG, or WebP image.');
  const image = Buffer.from(match[2], 'base64');
  if (image.length > 7 * 1024 * 1024) throw new Error('Please choose an image smaller than 7 MB.');
  return { type: match[1], image };
}

async function imageServiceError(response, action) {
  let detail = '';
  try {
    const body = JSON.parse(await response.text());
    detail = String(body?.error?.message || body?.message || '');
  } catch { /* The upstream response may not be JSON. */ }
  if (response.status === 401) return `The ${action} service could not verify its private connection.`;
  if (response.status === 403) return `This API account is not allowed to use the ${action} service yet.`;
  if (response.status === 429) return `The ${action} service is temporarily unavailable or the API account needs billing or limit attention.`;
  if (response.status === 400 && detail) return `The ${action} request was rejected: ${detail.slice(0, 180)}`;
  return `The ${action} service could not complete the request right now (status ${response.status}).`;
}

async function generateStory(idea, heroName, language = 'en') {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Story generation is not configured on this computer.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-6-astra',
      store: false,
      instructions: `Write a gentle, child-safe PrinTale story for ages 6–10. Write entirely in ${({ en: 'English', de: 'German', 'pt-BR': 'Brazilian Portuguese', es: 'Spanish', it: 'Italian' })[language] || 'English'}. The hero's exact name is "${heroName || 'the child'}". Whenever the hero is named, use that exact name; never replace it with a different name. Use the child idea as inspiration, but do not include scary, violent, sexual, personal, or identifying details. Write 260-320 words with five connected story beats: an inviting beginning, a discovery, a small challenge, a clever solution, and a warm ending. Each beat must continue the same requested topic, setting, hero, and supporting characters. Format: first line is a short title with no quotation marks; then a blank line; then five short paragraphs, one for each beat.`,
      input: idea,
    }),
  });
  if (!response.ok) {
    const message = response.status === 401
      ? 'The story service could not verify its private connection.'
      : response.status === 429
        ? 'The story service is temporarily unavailable or needs account attention.'
        : 'The story service could not create a draft right now.';
    throw new Error(message);
  }
  const text = extractText(await response.json());
  if (!text) throw new Error('The story service returned an empty draft.');
  const [firstLine, ...rest] = text.split(/\r?\n/);
  return { title: firstLine.trim().slice(0, 90), story: rest.join(' ').trim().slice(0, 2600) || firstLine.trim() };
}

async function generateArt(direction, title, heroImage, heroName) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Illustration generation is not configured on this computer.');
  const coloringPage = direction.startsWith('[COLORING]');
  const cleanDirection = direction.replace(/^\[COLORING\]\s*/, '');
  const artworkRules = imageProductionRules;
  if (coloringPage) {
    const prompt = heroImage
      ? `Use the supplied approved cartoon hero as the child character in a single professionally composed PrinTale coloring-book scene. This hero is named ${heroName || 'the child'}; preserve the hero's face, hair, clothing style, and proportions. Required story context: ${cleanDirection}. ${artworkRules} Use clean black ink outlines only on pure white: no color, fills, shading, gray, texture, border, frame, or text. Draw one clear, content-specific final story moment with the relevant supporting character or prop from the required topic. Use large closed shapes and generous open areas for a child to color. Never make a doodle sheet, collage, generic symbols, or unrelated scene.`
      : `Create one professionally composed PrinTale coloring-book scene. The hero is named ${heroName || 'the child'}. Required story context: ${cleanDirection}. ${artworkRules} Use clean black ink outlines only on pure white: no color, fills, shading, gray, texture, border, frame, or text. Draw one clear, content-specific final story moment with the relevant supporting character or prop from the required topic. Use large closed shapes and generous open areas for a child to color. Never make a doodle sheet, collage, generic symbols, or unrelated scene.`;
    const request = heroImage
      ? (() => {
          const hero = decodeImageDataUrl(heroImage);
          const form = new FormData();
          form.set('model', 'gpt-image-2.5-flare');
          form.set('image', new Blob([hero.image], { type: hero.type }), 'cartoon-hero.png');
          form.set('prompt', prompt);
          form.set('size', '1024x1024');
          form.set('quality', 'low');
          form.set('output_format', 'png');
          form.set('moderation', 'auto');
          return { url: 'https://api.openai.com/v1/images/edits', headers: { Authorization: `Bearer ${key}` }, body: form };
        })()
      : { url: 'https://api.openai.com/v1/images/generations', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: 'gpt-image-2.5-flare', prompt, size: '1024x1024', quality: 'low', output_format: 'png', moderation: 'auto' }) };
    const response = await fetch(request.url, { method: 'POST', headers: request.headers, body: request.body });
    if (!response.ok) throw new Error(await imageServiceError(response, 'coloring-page'));
    const image = (await response.json()).data?.[0];
    if (!image?.b64_json) throw new Error('The illustration service returned no coloring page.');
    return { image: `data:image/png;base64,${image.b64_json}` };
  }
  const prompt = heroImage
    ? `Use the supplied cartoon hero as the main character in one warm, polished children's storybook illustration. This hero is named ${heroName || 'the child'}; preserve the hero’s face, hair, clothing style, colors, and proportions consistently. Required scene brief: ${direction}. ${artworkRules} Use a flat hand-drawn cartoon style with bold clean outlines, simple child-friendly shapes, and gentle color. Never make it photorealistic or painterly. Keep it safe and suitable for ages 6–10. If the brief is FRONT COVER, reserve the upper 30% as a calm open background for the separately typeset title; keep the characters and action below it.`
    : `Create one warm, polished children's storybook illustration for a parent preview. The hero is named ${heroName || 'the child'}. Required scene brief: ${direction}. ${artworkRules} Use a flat hand-drawn cartoon style with bold clean outlines, simple child-friendly shapes, and gentle color. Never make it photorealistic or painterly. Keep it safe and suitable for ages 6–10. If the brief is FRONT COVER, reserve the upper 30% as a calm open background for the separately typeset title; keep the characters and action below it.`;
  const request = heroImage
    ? (() => {
        const hero = decodeImageDataUrl(heroImage);
        const form = new FormData();
        form.set('model', 'gpt-image-2.5-flare');
        form.set('image', new Blob([hero.image], { type: hero.type }), 'cartoon-hero.png');
        form.set('prompt', prompt);
          form.set('size', '1024x1024');
        form.set('quality', 'low');
        form.set('output_format', 'png');
        form.set('moderation', 'auto');
        return { url: 'https://api.openai.com/v1/images/edits', headers: { Authorization: `Bearer ${key}` }, body: form };
      })()
    : { url: 'https://api.openai.com/v1/images/generations', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: 'gpt-image-2.5-flare', prompt, size: '1024x1024', quality: 'low', output_format: 'png', moderation: 'auto' }) };
  const response = await fetch(request.url, { method: 'POST', headers: request.headers, body: request.body });
  if (!response.ok) throw new Error(await imageServiceError(response, 'illustration'));
  const image = (await response.json()).data?.[0];
  if (!image?.b64_json) throw new Error('The illustration service returned no preview image.');
  return { image: `data:image/png;base64,${image.b64_json}` };
}

async function createCartoonHero(imageDataUrl) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Cartoon creation is not configured on this computer.');
  const { type, image: original } = decodeImageDataUrl(imageDataUrl);
  const form = new FormData();
  form.set('model', 'gpt-image-2.5-flare');
  form.set('image', new Blob([original], { type }), 'parent-approved-photo');
  form.set('prompt', `Transform this parent-approved child photo into one polished, friendly storybook cartoon hero portrait. Preserve the child’s general appearance and expression without adding identifying details. Head-and-shoulders only, warm illustrated style, simple soft background, no other people, safe for ages 6–10. ${imageProductionRules}`);
  form.set('size', '1024x1024');
  form.set('quality', 'low');
  form.set('output_format', 'png');
  form.set('moderation', 'auto');
  const response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  if (!response.ok) throw new Error(await imageServiceError(response, 'cartoon'));
  const image = (await response.json()).data?.[0];
  if (!image?.b64_json) throw new Error('The cartoon service returned no hero image.');
  return { image: `data:image/png;base64,${image.b64_json}` };
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  const privateStudioRequest = url.pathname === '/preview' || url.pathname === '/index.html';
  const protectedApiRequest = url.pathname.startsWith('/api/') || url.pathname.startsWith('/outputs/');
  if (teaserMode && (privateStudioRequest || protectedApiRequest) && !grantPreviewAccess(request, response)) return;
  if (request.method === 'GET' && url.pathname === '/api/peecho/status') {
    return sendJson(response, 200, peechoSetupStatus());
  }
  if (request.method === 'POST' && url.pathname === '/api/generate-story') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; if (body.length > 8192) request.destroy(); });
    request.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const idea = String(payload.idea || '').trim();
        const heroName = String(payload.heroName || '').trim().slice(0, 60);
        const language = ['en', 'de', 'pt-BR', 'es', 'it'].includes(payload.language) ? payload.language : 'en';
        if (!idea || idea.length > 280) return sendJson(response, 400, { error: 'Please share a short adventure idea first.' });
        sendJson(response, 200, await generateStory(idea, heroName, language));
      } catch (error) {
        sendJson(response, 502, { error: error instanceof Error ? error.message : 'Story generation could not start.' });
      }
    });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/translate-interface') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const language = ['de', 'pt-BR', 'es', 'it'].includes(payload.language) ? payload.language : 'en';
        const texts = Array.isArray(payload.texts) ? payload.texts.slice(0, 180).map((text) => String(text).slice(0, 360)) : [];
        if (!texts.length || language === 'en') return sendJson(response, 200, { texts });
        sendJson(response, 200, { texts: await translateInterface(texts, language) });
      } catch (error) { sendJson(response, 502, { error: error instanceof Error ? error.message : 'Website translation could not start.' }); }
    });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/generate-art') {
    let body = '';
    let tooLarge = false;
    request.on('data', (chunk) => { body += chunk; if (body.length > 20 * 1024 * 1024) tooLarge = true; });
    request.on('end', async () => {
      try {
        if (tooLarge) return sendJson(response, 413, { error: 'The cartoon reference is too large for an illustration request. Please make a new cartoon hero from a smaller photo.' });
        const payload = JSON.parse(body);
        const direction = String(payload.direction || '').trim();
        const title = String(payload.title || '').trim().slice(0, 90);
        if (!direction || direction.length > 320) return sendJson(response, 400, { error: 'Please add a short illustration direction first.' });
        const heroImage = String(payload.heroImage || '');
        const heroName = String(payload.heroName || '').trim().slice(0, 60);
        sendJson(response, 200, await generateArt(direction, title, heroImage, heroName));
      } catch (error) {
        sendJson(response, 502, { error: error instanceof Error ? error.message : 'Illustration generation could not start.' });
      }
    });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/create-cartoon-hero') {
    let body = '';
    let tooLarge = false;
    // Do not destroy an oversized request: that makes the browser report only
    // a generic "Failed to fetch" message. Finish receiving it and return a
    // helpful, local validation error instead.
    request.on('data', (chunk) => { body += chunk; if (body.length > 20 * 1024 * 1024) tooLarge = true; });
    request.on('end', async () => {
      try {
        if (tooLarge) return sendJson(response, 413, { error: 'That photo is too large for a cartoon request. Please choose a photo smaller than 7 MB.' });
        const image = String(JSON.parse(body).image || '');
        sendJson(response, 200, await createCartoonHero(image));
      } catch (error) {
        sendJson(response, 502, { error: error instanceof Error ? error.message : 'Cartoon creation could not start.' });
      }
    });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/api/create-parent-proof') {
    let body = '';
    let tooLarge = false;
    request.on('data', (chunk) => { body += chunk; if (body.length > 45 * 1024 * 1024) tooLarge = true; });
    request.on('end', async () => {
      try {
        if (tooLarge) return sendJson(response, 413, { error: 'This proof has too much artwork for a low-resolution PDF. Please use the current approved pages only.' });
        const payload = JSON.parse(body);
        const title = String(payload.title || '').slice(0, 90);
        const hero = String(payload.hero || '').slice(0, 60);
        const story = String(payload.story || '').slice(0, 1500);
        if (!title || !story) return sendJson(response, 400, { error: 'Finish the story draft before creating a parent proof.' });
        const scenes = Array.isArray(payload.scenes) ? payload.scenes.slice(0, 6).map((value) => String(value || '')) : [];
        const coloring = String(payload.coloring || '');
        sendJson(response, 200, { url: await createParentProof({ title, hero, story, scenes, coloring }) });
      } catch (error) { sendJson(response, 502, { error: error instanceof Error ? error.message : 'The parent PDF proof could not be created.' }); }
    });
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'Method not allowed.' });
  const requested = privateStudioRequest ? '/index.html' : url.pathname === '/' ? (teaserMode ? '/teaser.html' : '/index.html') : url.pathname;
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root) || requested.includes('/.')) return sendJson(response, 404, { error: 'Not found.' });
  try {
    const file = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': `${mimeTypes[extname(filePath)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : file);
  } catch { sendJson(response, 404, { error: 'Not found.' }); }
}).listen(port, '0.0.0.0', () => console.log(`PrinTale server listening on ${port}`));
