const state = { name: 'Aria', step: 1, age: '6–10', friend: false, spread: 1, language: localStorage.getItem('storyspark-language') || 'en' };
const cacheKeys = { progress: 'storyspark-progress-v1', cartoon: 'storyspark-cartoon-v1', artwork: 'storyspark-artwork-v1' };
const languageSelect = document.getElementById('story-language');
const websiteLanguageSelect = document.getElementById('website-language');
const languageNames = { en: 'English', de: 'German', 'pt-BR': 'Brazilian Portuguese', es: 'Spanish', it: 'Italian' };
const languagePickerCopy = {
  en: { website: 'Website', story: 'Story', en: 'English', de: 'German', 'pt-BR': 'Portuguese (Brazil)', es: 'Spanish', it: 'Italian' },
  de: { website: 'Website', story: 'Geschichte', en: 'Englisch', de: 'Deutsch', 'pt-BR': 'Portugiesisch (Brasilien)', es: 'Spanisch', it: 'Italienisch' },
  'pt-BR': { website: 'Site', story: 'História', en: 'Inglês', de: 'Alemão', 'pt-BR': 'Português (Brasil)', es: 'Espanhol', it: 'Italiano' },
  es: { website: 'Sitio web', story: 'Historia', en: 'Inglés', de: 'Alemán', 'pt-BR': 'Portugués (Brasil)', es: 'Español', it: 'Italiano' },
  it: { website: 'Sito web', story: 'Storia', en: 'Inglese', de: 'Tedesco', 'pt-BR': 'Portoghese (Brasile)', es: 'Spagnolo', it: 'Italiano' },
};
function updateLanguagePickerLabels(interfaceLanguage) {
  const copy = languagePickerCopy[interfaceLanguage] || languagePickerCopy.en;
  [...websiteLanguageSelect.options].forEach((option) => { option.textContent = `${copy.website}: ${copy[option.value]}`; });
  [...languageSelect.options].forEach((option) => { option.textContent = `${copy.story}: ${copy[option.value]}`; });
}
const actionLabels = {
  en: { next: 'Next spread →', color: 'Open coloring page', cover: 'Create cover & opening preview ✦', proof: 'Create full illustrated book proof ✦' },
  de: { next: 'Nächste Doppelseite →', color: 'Ausmalbild öffnen', cover: 'Cover & Vorschau erstellen ✦', proof: 'Vollständigen Buchentwurf erstellen ✦' },
  'pt-BR': { next: 'Próxima dupla de páginas →', color: 'Abrir página para colorir', cover: 'Criar capa e prévia ✦', proof: 'Criar prova ilustrada completa ✦' },
  es: { next: 'Siguiente doble página →', color: 'Abrir página para colorear', cover: 'Crear portada y vista previa ✦', proof: 'Crear prueba ilustrada completa ✦' },
  it: { next: 'Pagina doppia successiva →', color: 'Apri pagina da colorare', cover: 'Crea copertina e anteprima ✦', proof: 'Crea bozza illustrata completa ✦' },
};
function repairInteractiveLabels() {
  const labels = actionLabels[state.language] || actionLabels.en;
  const set = (id, label) => { const element = document.getElementById(id); if (element && !element.textContent.trim()) element.textContent = label; };
  set('next-spread', labels.next); set('show-coloring', labels.color); set('generate-cover-art', labels.cover); set('generate-full-proof', labels.proof);
}
const artGenerationOverlay = document.getElementById('art-generation-overlay');
const artGenerationTitle = document.getElementById('art-generation-title');
const artGenerationDetail = document.getElementById('art-generation-detail');
const artGenerationBar = document.getElementById('art-generation-bar');
const artGenerationPercent = document.getElementById('art-generation-percent');
function setArtGenerationLock(percent, title, detail) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  artGenerationOverlay.hidden = false;
  document.body.classList.add('art-generation-active');
  artGenerationTitle.textContent = title;
  artGenerationDetail.textContent = detail;
  artGenerationBar.style.width = `${value}%`;
  artGenerationPercent.textContent = `${value}%`;
}
function clearArtGenerationLock() {
  artGenerationOverlay.hidden = true;
  document.body.classList.remove('art-generation-active');
}
const translationCache = new Map();
const protectedTranslationSelectors = '#generated-story-title,#generated-story-text,#generated-story-heading,#story-idea-text,.hero-name,#custom-hero-name,#custom-hero-name + *,.avatar-choice,.pill,#voice-story-idea,#custom-hero-name,#print-book-title,#print-page-title,#print-page-copy';
const interfaceTextNodes = [...document.querySelectorAll('header, main, footer')].flatMap((root) => [...root.childNodes]).flatMap(function collect(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim() ? [node] : [];
  if (node.nodeType !== Node.ELEMENT_NODE || node.matches('script,style,option,textarea,input') || node.closest(protectedTranslationSelectors)) return [];
  return [...node.childNodes].flatMap(collect);
}).filter((node) => node.parentElement && !node.parentElement.closest(protectedTranslationSelectors));
const interfaceSource = interfaceTextNodes.map((node) => node.textContent);
async function translateWebsite(language) {
  if (language === 'en') { interfaceTextNodes.forEach((node, index) => { node.textContent = interfaceSource[index]; }); return; }
  const cached = translationCache.get(language) || JSON.parse(localStorage.getItem(`storyspark-interface-${language}`) || 'null');
  if (cached && cached.length === interfaceTextNodes.length) { interfaceTextNodes.forEach((node, index) => { node.textContent = cached[index]; }); return; }
  document.body.classList.add('is-translating');
  try {
    const response = await fetch('/api/translate-interface', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, texts: interfaceSource }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Website translation could not start.');
    translationCache.set(language, result.texts); localStorage.setItem(`storyspark-interface-${language}`, JSON.stringify(result.texts));
    interfaceTextNodes.forEach((node, index) => { node.textContent = result.texts[index]; });
  } catch (error) { console.warn(error); }
  finally { document.body.classList.remove('is-translating'); }
}
languageSelect.value = state.language;
const websiteLanguage = localStorage.getItem('storyspark-website-language') || 'en';
websiteLanguageSelect.value = websiteLanguage;
document.documentElement.lang = websiteLanguage;
updateLanguagePickerLabels(websiteLanguage);
window.setTimeout(repairInteractiveLabels, 0);
languageSelect.addEventListener('change', async () => {
  state.language = languageSelect.value;
  localStorage.setItem('storyspark-language', state.language);
  saveProgress();
});
const websiteCopySelectors = [
  '.announcement-copy', '.announcement a', 'header nav a', '.header-cta',
  '.hero-copy .eyebrow', '.hero-copy h1', '.hero-lede', '.hero-actions a', '.hero-actions button', '.trust-row span',
  '.proof-strip p', '.intro .section-label', '.intro h2', '.step-card h3', '.step-card p',
  '.featured-story .eyebrow', '.featured-story h2', '.featured-story p', '.story-meta span', '.featured-story a',
  '.studio-heading .section-label', '.studio-heading h2', '.studio-heading p', '.progress-item b', '.progress-item small',
  '[data-panel="1"] .panel-kicker', '[data-panel="1"] h3', '[data-panel="1"] .panel-intro', '[data-panel="1"] .photo-studio-copy b', '[data-panel="1"] .photo-studio-copy small', '[data-panel="1"] .hero-name-field > span', '[data-panel="1"] .photo-picker', '[data-panel="1"] #reset-hero', '[data-panel="1"] .photo-consent b', '[data-panel="1"] .photo-consent small', '[data-panel="1"] .friend-row b', '[data-panel="1"] .friend-row small', '[data-panel="1"] #friend-toggle',
  '[data-panel="2"] .panel-kicker', '[data-panel="2"] h3', '[data-panel="2"] .panel-intro', '[data-panel="2"] h4', '[data-panel="2"] .voice-story-copy p', '[data-panel="2"] #start-story-voice', '[data-panel="2"] .voice-upload-button', '[data-panel="2"] .voice-parent-consent span', '[data-panel="2"] .back-button', '[data-panel="2"] #see-story',
  '[data-panel="3"] .panel-kicker', '[data-panel="3"] .parent-approved', '[data-panel="3"] .parent-preview-intro > p', '[data-panel="3"] .edit-hero-button', '[data-panel="3"] .chapter', '[data-panel="3"] #cover-art-status', '[data-panel="3"] .preview-controls > span', '[data-panel="3"] #next-spread', '[data-panel="3"] .coloring-callout b', '[data-panel="3"] .coloring-callout small', '[data-panel="3"] #show-coloring', '[data-panel="3"] .back-button', '[data-panel="3"] .open-book-proof-now', '[data-panel="3"] .next-button',
  '[data-panel="4"] .panel-kicker', '[data-panel="4"] > h3', '[data-panel="4"] > p', '[data-panel="4"] .chapter', '[data-panel="4"] #print-preview-title', '[data-panel="4"] .print-preview-head > span', '[data-panel="4"] #art-cost-title', '[data-panel="4"] .art-cost-control p', '[data-panel="4"] label', '[data-panel="4"] #replacement-page option', '[data-panel="4"] #generate-single-replacement', '[data-panel="4"] #replacement-status', '[data-panel="4"] #rebuild-full-proof', '[data-panel="4"] .open-book-preview', '[data-panel="4"] .print-book-preview > p', '[data-panel="4"] .handoff-summary h4', '[data-panel="4"] .handoff-summary > div span', '[data-panel="4"] .handoff-summary > div b', '[data-panel="4"] .handoff-summary p', '[data-panel="4"] .safe-handoff p', '[data-panel="4"] #print-route-title', '[data-panel="4"] #print-route-copy', '[data-panel="4"] #print-route-note', '[data-panel="4"] #print-provider option', '[data-panel="4"] #prepare-parent-proof', '[data-panel="4"] #prepare-print-package', '[data-panel="4"] #print-route-status', '[data-panel="4"] .back-button', '[data-panel="4"] #start-new-story', '[data-panel="4"] #complete-demo',
  '.privacy-section .section-label', '.privacy-section h2', '.privacy-section p', '.privacy-copy span', '.closing h2', '.closing p', '.closing a', 'footer span',
  '#coloring-dialog .panel-kicker', '#coloring-dialog h3', '#coloring-dialog p', '#print-coloring', '#success-dialog h3', '#success-dialog p', '#close-success', '.book-reader-head .chapter', '.book-reader-head h3', '.book-reader-head p', '#reader-back', '#reader-next'
].join(',');
const websiteCopyNodes = [...document.querySelectorAll(websiteCopySelectors)].filter((element) => !element.closest('#generated-story-heading,#generated-story-title,#generated-story-text,#story-idea-text,.hero-name,.avatar-choice,.pill,#parent-cover-title,#print-book-title,#print-page-title,#print-page-copy,#reader-left-title,#reader-right-title,#reader-right-copy'));
const websiteCopySource = websiteCopyNodes.map((element) => element.textContent.trim());
async function translateWebsiteCopy(language) {
  if (language === 'en') { websiteCopyNodes.forEach((element, index) => { element.textContent = websiteCopySource[index]; }); return; }
  const cacheKey = `storyspark-website-copy-v6-${language}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
  const translated = cached && cached.length === websiteCopyNodes.length ? cached : await fetch('/api/translate-interface', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, texts: websiteCopySource }) }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); localStorage.setItem(cacheKey, JSON.stringify(result.texts)); return result.texts; });
  websiteCopyNodes.forEach((element, index) => { element.textContent = translated[index]; });
}
let websiteTranslationRun = 0;
async function applyWebsiteLanguage(language) {
  const run = ++websiteTranslationRun;
  websiteLanguageSelect.value = language;
  localStorage.setItem('storyspark-website-language', language);
  try {
    await translateWebsiteCopy(language);
    if (run !== websiteTranslationRun) return;
    document.documentElement.lang = language;
    updateLanguagePickerLabels(language);
  } catch {
    if (run !== websiteTranslationRun) return;
    websiteLanguageSelect.value = 'en';
    localStorage.setItem('storyspark-website-language', 'en');
    document.documentElement.lang = 'en';
    await translateWebsiteCopy('en');
    updateLanguagePickerLabels('en');
  }
}
websiteLanguageSelect.addEventListener('change', () => applyWebsiteLanguage(websiteLanguageSelect.value));
// A saved website choice must translate the page again after a refresh. Previously
// the picker displayed the saved language while the page stayed in English.
if (websiteLanguage !== 'en') {
  window.addEventListener('load', () => applyWebsiteLanguage(websiteLanguage), { once: true });
}
const panels = [...document.querySelectorAll('.builder-panel')];
const progressItems = [...document.querySelectorAll('.progress-item')];
const heroNameNodes = document.querySelectorAll('.hero-name');
const storyHeroPortrait = document.getElementById('story-hero-portrait');

function updateName() { heroNameNodes.forEach((node) => { node.textContent = state.name; }); }
function updateStoryHero(choice) {
  storyHeroPortrait.classList.add('swap');
  window.setTimeout(() => storyHeroPortrait.classList.remove('swap'), 30);
  storyHeroPortrait.className = `story-hero-portrait ${choice.dataset.style || 'aria'} swap`;
  if (choice.dataset.style === 'custom' && choice.dataset.cartoon === 'ready' && customAvatarPhoto.src) {
    storyHeroPortrait.style.backgroundImage = `url("${customAvatarPhoto.src}")`;
  } else {
    storyHeroPortrait.style.backgroundImage = '';
  }
  window.setTimeout(() => storyHeroPortrait.classList.remove('swap'), 360);
}
function showStep(step) {
  state.step = step;
  panels.forEach((panel) => panel.classList.toggle('active', Number(panel.dataset.panel) === step));
  progressItems.forEach((item) => {
    const itemStep = Number(item.dataset.step);
    item.classList.toggle('active', itemStep === step);
    item.classList.toggle('complete', itemStep < step);
    const circle = item.querySelector('span');
    circle.textContent = itemStep < step ? '✓' : itemStep;
  });
  document.querySelector('.builder-shell').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  saveProgress();
}

document.querySelectorAll('.avatar-choice').forEach((choice) => {
  choice.addEventListener('click', () => {
    document.querySelectorAll('.avatar-choice').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false'); });
    choice.classList.add('selected'); choice.setAttribute('aria-checked', 'true'); state.name = choice.dataset.name; updateName(); updateStoryHero(choice);
  });
});
document.querySelectorAll('.segmented button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.segmented button').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false'); });
  button.classList.add('selected'); button.setAttribute('aria-checked', 'true'); state.age = button.dataset.age;
}));
document.querySelectorAll('.pill').forEach((pill) => pill.addEventListener('click', () => pill.classList.toggle('selected')));
document.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => {
  const nextStep = Number(button.dataset.next);
  const idea = document.getElementById('voice-story-idea');
  const consent = document.getElementById('voice-consent');
  const status = document.getElementById('voice-story-status');
  const hasPhotoHero = photoUpload.files.length > 0 && customAvatarChoice.classList.contains('selected');
  if (nextStep === 2 && hasPhotoHero && customAvatarChoice.dataset.cartoon !== 'ready') {
    photoCartoonStatus.textContent = 'Create the cartoon hero first. Every cover and story illustration will use that cartoon—not the original photo or a random character.';
    photoConsentRow.hidden = false;
    document.querySelector('.photo-studio').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (nextStep === 3 && idea.value.trim() && !consent.checked) {
    status.textContent = 'A parent needs to approve this idea before the preview.';
    document.getElementById('voice-parent-consent').hidden = false;
    return;
  }
  if (nextStep !== 3) return showStep(nextStep);
  const storyIdea = idea.value.trim() || `${state.name} solves the Missing Birthday Cake Mystery with a friendly dog and robot.`;
  button.disabled = true;
  button.textContent = 'Creating story & illustrations…';
  status.textContent = 'Creating a child-safe story and its illustrations…';
  setArtGenerationLock(0, 'Creating your story…', 'Writing the story and preparing 7 illustrations. Please keep this page open.');
  fetch('/api/generate-story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea: storyIdea, heroName: state.name, language: state.language }) })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Story generation could not start.');
      document.getElementById('generated-story-title').textContent = result.title;
      document.getElementById('generated-story-heading').textContent = result.title;
      document.getElementById('parent-cover-title').textContent = result.title;
      document.getElementById('generated-story-text').textContent = result.story;
      coverDirection.value = buildIllustrationDirection();
      syncPrintPreview();
      status.textContent = 'Story ready. Creating the full illustrated book…';
      showStep(nextStep);
      await createFullProof();
    })
    .catch((error) => { status.textContent = error.message || 'Story generation could not start.'; })
    .finally(() => { clearArtGenerationLock(); button.disabled = false; button.innerHTML = 'Create their story <span>→</span>'; updateStoryCreationAvailability(); });
}));
document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
document.getElementById('friend-toggle').addEventListener('click', (event) => {
  state.friend = !state.friend;
  event.currentTarget.textContent = state.friend ? 'Friend added ✓' : 'Add friend';
  event.currentTarget.style.color = state.friend ? '#32876c' : '';
});
const photoUpload = document.getElementById('photo-upload');
const photoDemoResult = document.getElementById('photo-demo-result');
const sourcePhotoPreview = document.getElementById('source-photo-preview');
const photoConsentRow = document.getElementById('photo-consent-row');
const photoConsent = document.getElementById('photo-consent');
const customHeroName = document.getElementById('custom-hero-name');
const customAvatarChoice = document.getElementById('custom-avatar-choice');
const customAvatarPhoto = document.getElementById('custom-avatar-photo');
const customAvatarName = document.getElementById('custom-avatar-name');
const photoCartoonStatus = document.getElementById('photo-cartoon-status');
const demoResultAvatar = document.getElementById('demo-result-avatar');
let cartoonCreationInFlight = false;
function selectAvatar(choice) {
  document.querySelectorAll('.avatar-choice').forEach((item) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false'); });
  choice.classList.add('selected'); choice.setAttribute('aria-checked', 'true'); state.name = choice.dataset.name; updateName();
  updateStoryHero(choice);
}
function refreshCustomHeroName() {
  const name = customHeroName.value.trim() || 'Your hero';
  customAvatarChoice.dataset.name = name;
  customAvatarName.textContent = name;
  if (customAvatarChoice.classList.contains('selected')) { state.name = name; updateName(); }
}
customHeroName.addEventListener('input', refreshCustomHeroName);
photoUpload.addEventListener('change', () => {
  const [photo] = photoUpload.files;
  if (!photo) return;
  if (sourcePhotoPreview.src.startsWith('blob:')) URL.revokeObjectURL(sourcePhotoPreview.src);
  sourcePhotoPreview.src = URL.createObjectURL(photo);
  customAvatarPhoto.src = sourcePhotoPreview.src;
  customAvatarChoice.dataset.cartoon = '';
  document.body.classList.remove('custom-photo-hero');
  document.documentElement.style.removeProperty('--hero-photo');
  photoDemoResult.hidden = true;
  demoResultAvatar.style.backgroundImage = '';
  customAvatarChoice.hidden = false;
  refreshCustomHeroName();
  selectAvatar(customAvatarChoice);
  photoConsentRow.hidden = false;
  photoConsent.checked = false;
  photoConsent.disabled = false;
  photoCartoonStatus.textContent = 'Your photo stays in this browser until you approve the one-time cartoon request.';
});
photoConsent.addEventListener('change', () => {
  if (!photoConsent.checked) {
    photoCartoonStatus.textContent = 'Cartoon creation is waiting for parent approval.';
    return;
  }
  createCartoonHero();
});
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The photo could not be read on this browser.'));
    reader.readAsDataURL(file);
  });
}
async function prepareCartoonPhoto(file) {
  // A phone photo can be much larger than a portrait reference needs to be.
  // Resize it locally before upload so the local request does not fail on a
  // large base64 payload. The original file never leaves this browser.
  const original = await readAsDataUrl(file);
  const image = new Image();
  image.src = original;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('This photo could not be prepared for the cartoon. Please try another PNG or JPG.'));
  });
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, 1280 / longestSide);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
}
async function createCartoonHero() {
  const [photo] = photoUpload.files;
  if (!photo || !photoConsent.checked || cartoonCreationInFlight) return;
  cartoonCreationInFlight = true;
  photoConsent.disabled = true;
  photoUpload.disabled = true;
  photoCartoonStatus.textContent = 'Creating the approved cartoon hero…';
  try {
    const image = await prepareCartoonPhoto(photo);
    const response = await fetch('/api/create-cartoon-hero', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Cartoon creation could not start.');
    customAvatarPhoto.src = result.image;
    customAvatarChoice.dataset.cartoon = 'ready';
    demoResultAvatar.style.backgroundImage = `url("${result.image}")`;
    document.documentElement.style.setProperty('--hero-photo', `url("${result.image}")`);
    document.body.classList.add('custom-photo-hero');
    selectAvatar(customAvatarChoice);
    photoDemoResult.hidden = false;
    photoCartoonStatus.textContent = 'Cartoon hero ready. This is the version used in the cover and story preview.';
    saveProgress();
  } catch (error) {
    photoCartoonStatus.textContent = `${error.message || 'Cartoon creation could not start.'} Uncheck and approve again to retry.`;
    photoConsent.disabled = false;
    photoUpload.disabled = false;
  } finally {
    cartoonCreationInFlight = false;
  }
}
document.getElementById('reset-hero').addEventListener('click', () => {
  if (sourcePhotoPreview.src.startsWith('blob:')) URL.revokeObjectURL(sourcePhotoPreview.src);
  photoUpload.value = '';
  customHeroName.value = '';
  sourcePhotoPreview.removeAttribute('src');
  customAvatarPhoto.removeAttribute('src');
  customAvatarChoice.hidden = true;
  customAvatarChoice.dataset.cartoon = '';
  photoDemoResult.hidden = true;
  photoConsentRow.hidden = true;
  photoConsent.checked = false;
  photoConsent.disabled = false;
  photoUpload.disabled = false;
  cartoonCreationInFlight = false;
  photoCartoonStatus.textContent = 'Hero reset. Choose a photo when you are ready.';
  localStorage.removeItem(cacheKeys.cartoon);
  localStorage.removeItem(cacheKeys.artwork);
  saveProgress();
  document.body.classList.remove('custom-photo-hero');
  document.documentElement.style.removeProperty('--hero-photo');
  selectAvatar(document.querySelector('.avatar-choice[data-name="Aria"]'));
});
const voiceStoryButton = document.getElementById('start-story-voice');
const voiceStoryIdea = document.getElementById('voice-story-idea');
const voiceStoryStatus = document.getElementById('voice-story-status');
const voiceParentConsent = document.getElementById('voice-parent-consent');
const voiceConsent = document.getElementById('voice-consent');
const seeStoryButton = document.getElementById('see-story');
const storyIdeaPreview = document.getElementById('story-idea-preview');
const storyIdeaText = document.getElementById('story-idea-text');
const voiceAudioUpload = document.getElementById('voice-audio-upload');
const voiceAudioPreview = document.getElementById('voice-audio-preview');
let activeRecognition = null;
let voiceCaptureHadResult = false;
function updateStoryIdea() {
  const idea = voiceStoryIdea.value.trim();
  voiceParentConsent.hidden = !idea;
  if (!idea) voiceConsent.checked = false;
  storyIdeaPreview.hidden = !idea;
  storyIdeaText.textContent = idea;
  updateStoryCreationAvailability();
}
function updateStoryCreationAvailability() {
  seeStoryButton.disabled = !voiceStoryIdea.value.trim() || !voiceConsent.checked;
}
voiceStoryIdea.addEventListener('input', () => {
  voiceConsent.checked = false;
  updateStoryIdea();
});
voiceConsent.addEventListener('change', updateStoryCreationAvailability);
voiceAudioUpload.addEventListener('change', () => {
  const [audio] = voiceAudioUpload.files;
  if (!audio) return;
  if (voiceAudioPreview.src.startsWith('blob:')) URL.revokeObjectURL(voiceAudioPreview.src);
  voiceAudioPreview.src = URL.createObjectURL(audio);
  voiceAudioPreview.hidden = false;
  voiceStoryStatus.textContent = 'Audio selected on this browser only. A future speech-to-text service will turn it into editable words after parent approval.';
});
voiceStoryButton.addEventListener('click', () => {
  if (activeRecognition) {
    voiceStoryStatus.textContent = 'Finishing the story idea…';
    activeRecognition.stop();
    return;
  }
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    voiceStoryStatus.textContent = 'Voice capture is not available in this browser. You can type the idea instead.';
    voiceStoryIdea.focus();
    return;
  }
  const recognition = new Recognition();
  recognition.lang = navigator.language || 'en-US';
  recognition.interimResults = true;
  recognition.continuous = true;
  voiceCaptureHadResult = false;
  activeRecognition = recognition;
  voiceStoryButton.innerHTML = '<span>■</span> Stop listening';
  recognition.onstart = () => { voiceStoryStatus.textContent = 'Listening… tell the adventure idea.'; };
  recognition.onresult = (event) => {
    voiceCaptureHadResult = true;
    voiceStoryIdea.value = [...event.results].map((result) => result[0].transcript).join(' ');
    updateStoryIdea();
  };
  recognition.onerror = (event) => {
    const message = event.error === 'not-allowed'
      ? 'Microphone permission was not allowed. You can allow it in the browser settings, upload audio, or type the idea.'
      : 'This preview browser could not transcribe the voice. You can upload audio or type the idea instead.';
    voiceStoryStatus.textContent = message;
  };
  recognition.onend = () => {
    activeRecognition = null;
    voiceStoryButton.innerHTML = '<span>●</span> Tell it';
    if (voiceCaptureHadResult && voiceStoryIdea.value.trim()) {
      voiceStoryStatus.textContent = 'Idea captured. A parent can review or edit it below.';
    } else if (!voiceStoryIdea.value.trim()) {
      voiceStoryStatus.textContent = 'No words were captured. Upload audio or type the idea while the secure transcription connection is being finished.';
    }
  };
  try {
    recognition.start();
  } catch {
    activeRecognition = null;
    voiceStoryButton.innerHTML = '<span>●</span> Tell it';
    voiceStoryStatus.textContent = 'Voice input could not start in this browser. Upload audio or type the idea instead.';
  }
});
document.getElementById('next-spread').addEventListener('click', (event) => {
  state.spread = state.spread === 5 ? 1 : state.spread + 1;
  event.currentTarget.previousElementSibling.textContent = state.spread === 1 ? 'Opening spread: pages 2–3 · 12 pages total' : `Preview: interior spread ${state.spread} of 5 · 12 pages total`;
  event.currentTarget.textContent = state.spread === 5 ? 'Back to opening spread ↺' : 'Next spread →';
});
const coverDirection = document.getElementById('cover-direction');
const coverArtStatus = document.getElementById('cover-art-status');
const parentCoverArt = document.getElementById('parent-cover-art');
const storySceneArt = document.getElementById('story-scene-art');
let bookSceneArt = [];
let coloringSceneArt = '';
const proofCache = { database: 'storyspark-private-proof', store: 'book-art', key: 'current-proof' };
function openProofDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('Private proof storage is unavailable.')); return; }
    const request = window.indexedDB.open(proofCache.database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(proofCache.store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveProofArt() {
  if (!bookSceneArt.length && !coloringSceneArt) return;
  try {
    const database = await openProofDatabase();
    const transaction = database.transaction(proofCache.store, 'readwrite');
    transaction.objectStore(proofCache.store).put({ scenes: bookSceneArt, coloring: coloringSceneArt }, proofCache.key);
    transaction.oncomplete = () => database.close();
  } catch {
    // The live proof remains usable when private browser storage is unavailable.
  }
}
async function restoreProofArt() {
  try {
    const database = await openProofDatabase();
    const transaction = database.transaction(proofCache.store, 'readonly');
    const request = transaction.objectStore(proofCache.store).get(proofCache.key);
    request.onsuccess = () => {
      const proof = request.result;
      if (!proof) return;
      bookSceneArt = Array.isArray(proof.scenes) ? proof.scenes : [];
      coloringSceneArt = proof.coloring || '';
      const title = document.getElementById('generated-story-title').textContent;
      if (bookSceneArt[0]) parentCoverArt.style.backgroundImage = `linear-gradient(180deg,rgba(22,47,77,0) 42%,rgba(22,47,77,.18)),url("${bookSceneArt[0]}")`;
      if (bookSceneArt[1]) { storySceneArt.src = bookSceneArt[1]; storySceneArt.alt = `Opening story illustration for ${title}`; }
      syncPrintPreview();
      paintReader();
    };
    transaction.oncomplete = () => database.close();
  } catch {
    // Nothing is restored if this browser does not provide private storage.
  }
}
function syncPrintPreview() {
  const title = document.getElementById('generated-story-title').textContent;
  const story = document.getElementById('generated-story-text').textContent;
  const replacementLabels = {
    0: 'Page 1 · front cover',
    1: 'Pages 3–4 · opening story scene',
    2: 'Pages 5–6 · middle story scene',
    3: 'Pages 7–8 · later story scene',
    4: 'Pages 9–10 · ending story scene',
    5: 'Page 12 · back cover',
    11: 'Page 11 · outline coloring scene',
  };
  [...document.getElementById('replacement-page').options].forEach((option) => { option.textContent = replacementLabels[option.value] || option.textContent; });
  document.getElementById('print-book-title').textContent = title;
  document.getElementById('print-page-title').textContent = title;
  document.getElementById('print-page-copy').textContent = story.length > 92 ? `${story.slice(0, 92).trim()}…` : story;
  const artwork = storySceneArt.src;
  if (artwork) {
    document.getElementById('print-cover-preview').style.backgroundImage = `linear-gradient(180deg,rgba(22,47,77,.02) 35%,rgba(22,47,77,.28)),url("${artwork}")`;
    document.getElementById('print-page-art').style.backgroundImage = `linear-gradient(180deg,rgba(22,47,77,0) 35%,rgba(22,47,77,.2)),url("${artwork}")`;
  }
}
const bookPreviewDialog = document.getElementById('book-preview-dialog');
const readerStage = document.getElementById('reader-stage');
const readerLeft = document.getElementById('reader-left');
const readerRight = document.getElementById('reader-right');
let readerSpread = 0;
function readerSpreads() {
  const title = document.getElementById('generated-story-title').textContent;
  const story = document.getElementById('generated-story-text').textContent;
  const art = storySceneArt.src;
  const scene = (index) => bookSceneArt[index] || art;
  const sentences = story.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [story];
  const chunks = Array.from({ length: 5 }, (_, index) => {
    const start = Math.floor(index * sentences.length / 5);
    const end = Math.floor((index + 1) * sentences.length / 5);
    return sentences.slice(start, Math.max(start + 1, end)).join(' ') || story;
  });
  return [
    { left: { label: '01 · COVER', title, caption: `Starring ${state.name}`, art: scene(0) }, right: { label: '02 · CHAPTER ONE', title, copy: chunks[0] } },
    { left: { label: '03 · ILLUSTRATION', title: 'A moment from the story', caption: chunks[0], art: scene(1) }, right: { label: '04 · THE ADVENTURE', title: title, copy: chunks[1] } },
    { left: { label: '05 · ILLUSTRATION', title: 'A moment from the story', caption: chunks[2], art: scene(2) }, right: { label: '06 · THE ADVENTURE', title, copy: chunks[2] } },
    { left: { label: '07 · ILLUSTRATION', title: 'A moment from the story', caption: chunks[3], art: scene(3) }, right: { label: '08 · THE ADVENTURE', title, copy: chunks[3] } },
    { left: { label: '09 · ILLUSTRATION', title: 'The story ending', caption: chunks[4], art: scene(4) }, right: { label: '10 · THE ENDING', title, copy: chunks[4] } },
    { left: { label: '11 · COLORING PAGE', title: 'Color a scene from the story', caption: 'A clean outline-only scene from this adventure, ready to color.', coloring: true, coloringArt: coloringSceneArt }, right: { label: '12 · BACK COVER', title: 'The end — and the next adventure', caption: `A PrinTale keepsake for ${state.name}.`, art: scene(5), backCover: true } },
  ];
}
function coloringLineArt() {
  const dinosaurStory = /dinosaur|dino/i.test(`${document.getElementById('generated-story-title').textContent} ${document.getElementById('generated-story-text').textContent}`);
  if (dinosaurStory) return `<svg class="coloring-line-art" viewBox="0 0 360 260" role="img" aria-label="Outline coloring illustration of a child meeting a friendly dinosaur"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M28 224h303M43 218c18-49 43-78 77-78 19 0 25 18 12 34-12 14-2 32 23 32h58c12 0 23-7 23-18 0-10-9-19-22-19l-19 2c-3-37 22-82 61-96 37-13 69 3 73 29 4 28-15 52-44 60l4 36c2 15-25 17-25 0l-3-36-36 0-4 36c-2 16-28 15-26 0l4-39c-27-7-41-22-39-43"/><path d="M240 93c6-20 23-33 43-33 22 0 39 14 43 33"/><circle cx="289" cy="92" r="2"/><path d="M295 109c7 5 14 5 21 0M75 213v-55c0-18 36-18 36 0v55M84 143c0-16 24-16 24 0M71 160l-20 25M111 160l23 15M93 150v8M59 214h68M301 74l9-13M316 84l16-6M180 92l-11-12M163 107l-15-2"/><path d="M17 230c22-13 44-13 66 0M274 230c18-13 38-13 58 0"/></g></svg>`;
  return `<svg class="coloring-line-art" viewBox="0 0 360 260" role="img" aria-label="Outline coloring illustration from the story"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M28 224h304M65 215v-64c0-17 34-17 34 0v64M74 137c0-15 20-15 20 0M64 157l-23 21M100 157l24 17M180 219c-34 0-62-24-62-54 0-31 28-55 62-55s62 24 62 55c0 30-28 54-62 54Z"/><path d="M151 154c18-28 40-28 58 0M146 174c22 15 47 15 68 0M180 111V78M162 91h36M282 79l9-15M296 92l17-5M38 95l11 8M47 75l-3-16"/></g></svg>`;
}
function paintReader() {
  const spread = readerSpreads()[readerSpread];
  const paintPage = (element, page) => {
    element.innerHTML = page.coloring ? (page.coloringArt ? `<img class="generated-coloring-art" src="${page.coloringArt}" alt="Outline coloring illustration from the story" />` : coloringLineArt()) : page.art ? '' : `<span class="reader-page-no">${page.label}</span><b>${page.title}</b>${page.copy ? `<p>${page.copy}</p>` : `<i>${page.caption || ''}</i>`}`;
    element.classList.toggle('reader-coloring', Boolean(page.coloring));
    element.classList.toggle('reader-back', Boolean(page.backCover));
    if (page.art) {
      element.style.backgroundImage = `linear-gradient(180deg,rgba(22,47,77,.03) 35%,rgba(22,47,77,.34)),url("${page.art}")`;
      element.style.color = '#fffdf2';
    } else {
      element.style.backgroundImage = '';
      element.style.color = '';
    }
  };
  paintPage(readerLeft, spread.left);
  paintPage(readerRight, spread.right);
  const progress = ['Cover + page 2', 'Pages 3–4', 'Pages 5–6', 'Pages 7–8', 'Pages 9–10', 'Coloring page + back cover'];
  document.getElementById('reader-progress').textContent = progress[readerSpread];
  document.getElementById('reader-back').disabled = readerSpread === 0;
  document.getElementById('reader-next').textContent = readerSpread === readerSpreads().length - 1 ? 'Back to cover ↺' : 'Turn page →';
}
function turnReader(direction) {
  const lastSpread = readerSpreads().length - 1;
  const next = direction === 'back' ? Math.max(0, readerSpread - 1) : readerSpread === lastSpread ? 0 : readerSpread + 1;
  if (next === readerSpread) return;
  readerStage.classList.add('turning');
  window.setTimeout(() => { readerSpread = next; paintReader(); readerStage.classList.remove('turning'); }, 330);
}
document.querySelectorAll('.mini-book-page').forEach((page) => page.addEventListener('click', () => { readerSpread = 0; paintReader(); bookPreviewDialog.showModal(); }));
document.getElementById('open-book-preview').addEventListener('click', () => { readerSpread = 0; paintReader(); bookPreviewDialog.showModal(); });
document.querySelector('.open-book-proof-now').addEventListener('click', () => { readerSpread = 0; paintReader(); bookPreviewDialog.showModal(); });
document.getElementById('close-book-preview').addEventListener('click', () => bookPreviewDialog.close());
document.getElementById('reader-next').addEventListener('click', () => turnReader('next'));
document.getElementById('reader-back').addEventListener('click', () => turnReader('back'));
readerStage.addEventListener('click', () => turnReader('next'));
function buildIllustrationDirection() {
  const selectedMoods = [...document.querySelectorAll('.mood-row .pill.selected')].map((pill) => pill.textContent.trim()).join(', ') || 'warmth and curiosity';
  const adventure = document.querySelector('.adventure-card b')?.textContent.trim() || 'a playful mystery';
  return `Warm, joyful, child-safe picture-book art for ages ${state.age}. Adventure: ${adventure}. Tone: ${selectedMoods}. Keep the hero expressive, the setting inviting, and the visual storytelling clear.`;
}
async function createFullProof() {
  const direction = coverDirection.value.trim();
  const story = document.getElementById('generated-story-text').textContent;
  const title = document.getElementById('generated-story-title').textContent;
  const heroImage = customAvatarChoice.dataset.cartoon === 'ready' ? customAvatarPhoto.src : '';
  if (!direction) { coverArtStatus.textContent = 'Please describe the story scene first.'; return; }
  if (photoUpload.files.length > 0 && customAvatarChoice.classList.contains('selected') && !heroImage) {
    coverArtStatus.textContent = 'Create the cartoon hero first, then the book can use it in every illustration.';
    showStep(1);
    return;
  }
  const sentences = story.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [story];
  const moments = Array.from({ length: 5 }, (_, index) => {
    const start = Math.floor(index * sentences.length / 5);
    const end = Math.max(start + 1, Math.floor((index + 1) * sentences.length / 5));
    return sentences.slice(start, end).join(' ') || story;
  });
  const storyPromise = `Required customer topic (never change): ${(voiceStoryIdea.value.trim() || title).slice(0, 120)}.`;
  const artBrief = `Visual direction: ${direction.slice(0, 90)}. Do not draw the story title or any words.`;
  const directions = [
    `FRONT COVER. ${storyPromise} ${artBrief} Show the hero and the key supporting character or prop in a joyful opening moment.`,
    `OPENING SCENE. ${storyPromise} Beat: ${moments[0].slice(0, 130)}. ${artBrief} Show only this early moment, before the discovery.`,
    `MIDDLE SCENE. ${storyPromise} Beat: ${moments[2].slice(0, 130)}. ${artBrief} Continue the same adventure with the same hero, clothes, supporting characters, and setting.`,
    `LATER SCENE. ${storyPromise} Beat: ${moments[3].slice(0, 130)}. ${artBrief} Continue the same adventure naturally and consistently.`,
    `FINAL SCENE. ${storyPromise} Beat: ${moments[4].slice(0, 130)}. ${artBrief} Show the gentle happy ending with the same hero and story world.`,
    `BACK COVER. ${storyPromise} ${artBrief} Show one small, peaceful closing moment with the same hero and story world. No new characters or unrelated scenery.`,
  ];
  bookSceneArt = [];
  const totalImages = directions.length + 1;
  setArtGenerationLock(0, 'Preparing your illustrated book…', `Creating 0 of ${totalImages} illustrations. Please keep this page open.`);
  try {
    for (let index = 0; index < directions.length; index += 1) {
      coverArtStatus.textContent = `Creating illustration ${index + 1} of ${directions.length}…`;
      setArtGenerationLock((index / totalImages) * 100, 'Creating your illustrated book…', `Creating illustration ${index + 1} of ${totalImages}.`);
      const response = await fetch('/api/generate-art', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction: directions[index].slice(0, 320), title, heroImage, heroName: state.name }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Illustration generation could not start.');
      bookSceneArt.push(result.image);
      setArtGenerationLock(((index + 1) / totalImages) * 100, 'Creating your illustrated book…', `Illustration ${index + 1} of ${totalImages} is ready.`);
    }
    coverArtStatus.textContent = 'Creating the outline coloring page…';
    setArtGenerationLock((directions.length / totalImages) * 100, 'Creating the coloring page…', `Creating illustration ${totalImages} of ${totalImages}.`);
    const coloringDirection = `[COLORING] ${storyPromise} Final coloring moment: ${(moments[4] || story).slice(0, 150)}. ${artBrief}`;
    const coloringResponse = await fetch('/api/generate-art', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction: coloringDirection.slice(0, 320), title, heroImage, heroName: state.name }) });
    const coloringResult = await coloringResponse.json();
    if (!coloringResponse.ok) throw new Error(coloringResult.error || 'Coloring page generation could not start.');
    coloringSceneArt = coloringResult.image;
    setArtGenerationLock(100, 'Your illustrated book is ready', 'Opening the parent preview…');
    parentCoverArt.style.backgroundImage = `linear-gradient(180deg,rgba(22,47,77,0) 42%,rgba(22,47,77,.18)),url("${bookSceneArt[0]}")`;
    storySceneArt.src = bookSceneArt[1];
    storySceneArt.alt = `Opening story illustration for ${title}`;
    syncPrintPreview();
    saveProofArt();
    coverArtStatus.textContent = 'Your full illustrated 12-page proof is ready to review.';
    readerSpread = 0;
    paintReader();
  } catch (error) {
    coverArtStatus.textContent = error.message || 'The full book proof could not be completed.';
  } finally {
    clearArtGenerationLock();
  }
}
document.getElementById('rebuild-full-proof').addEventListener('click', createFullProof);
const replacementPage = document.getElementById('replacement-page');
const generateSingleReplacement = document.getElementById('generate-single-replacement');
const replacementStatus = document.getElementById('replacement-status');
generateSingleReplacement.addEventListener('click', async () => {
  const page = Number(replacementPage.value);
  const title = document.getElementById('generated-story-title').textContent;
  const story = document.getElementById('generated-story-text').textContent;
  const direction = coverDirection.value.trim();
  const storyPromise = `Required customer topic (never change): ${(voiceStoryIdea.value.trim() || title).slice(0, 120)}.`;
  const artBrief = `Visual direction: ${direction.slice(0, 90)}. Do not draw the story title or any words.`;
  const heroImage = customAvatarChoice.dataset.cartoon === 'ready' ? customAvatarPhoto.src : '';
  const pageNames = { 0: 'front cover', 1: 'opening illustration for pages 3–4', 2: 'middle illustration for pages 5–6', 3: 'later illustration for pages 7–8', 4: 'ending illustration for pages 9–10', 5: 'back cover' };
  if (!direction) { replacementStatus.textContent = 'Add the art direction first.'; return; }
  if (photoUpload.files.length > 0 && customAvatarChoice.classList.contains('selected') && !heroImage) {
    replacementStatus.textContent = 'Create the cartoon hero first, so the replacement can match them.';
    showStep(1);
    return;
  }
  generateSingleReplacement.disabled = true;
  document.getElementById('rebuild-full-proof').disabled = true;
  replacementStatus.textContent = `Creating one replacement for ${page === 11 ? 'the coloring page' : pageNames[page]}…`;
  try {
    const singleDirection = page === 11
      ? `[COLORING] ${storyPromise} Coloring scene: ${story.slice(-150)}. ${artBrief}`
      : `${storyPromise} ${pageNames[page]}. Story context: ${story.slice(0, 140)}. ${artBrief} Keep the same hero, clothes, supporting characters, and story world. ${page === 5 ? 'Show a peaceful closing moment only. No new characters or unrelated scenery.' : ''}`;
    const response = await fetch('/api/generate-art', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction: singleDirection.slice(0, 320), title, heroImage, heroName: state.name }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The page replacement could not start.');
    if (page === 11) {
      coloringSceneArt = result.image;
    } else {
      bookSceneArt[page] = result.image;
      if (page === 0) parentCoverArt.style.backgroundImage = `linear-gradient(180deg,rgba(22,47,77,0) 42%,rgba(22,47,77,.18)),url("${result.image}")`;
      if (page === 1) { storySceneArt.src = result.image; storySceneArt.alt = `Opening story illustration for ${title}`; }
    }
    syncPrintPreview();
    paintReader();
    saveProofArt();
    replacementStatus.textContent = 'That one page is ready. No other illustration was regenerated.';
  } catch (error) {
    replacementStatus.textContent = error.message || 'The page replacement could not be completed.';
  } finally {
    generateSingleReplacement.disabled = false;
    document.getElementById('rebuild-full-proof').disabled = false;
  }
});
const coloringDialog = document.getElementById('coloring-dialog');
document.getElementById('show-coloring').addEventListener('click', () => coloringDialog.showModal());
document.querySelector('.modal-close').addEventListener('click', () => coloringDialog.close());
document.getElementById('print-coloring').addEventListener('click', () => window.print());
const successDialog = document.getElementById('success-dialog');
const printProvider = document.getElementById('print-provider');
const printRouteCopy = document.getElementById('print-route-copy');
const printRouteNote = document.getElementById('print-route-note');
const printRouteStatus = document.getElementById('print-route-status');
function updatePrintRoute() {
  const peecho = printProvider.value === 'peecho';
  const peechoCheckoutButton = document.getElementById('open-peecho-checkout');
  const peechoCheckoutLink = document.getElementById('peecho-checkout-link');
  printRouteCopy.textContent = peecho
    ? 'Peecho is the direct print-on-demand route for a parent-approved personalized book.'
    : 'Amazon KDP is for a separate, manually published retail edition - it is not the parent checkout route.';
  printRouteNote.textContent = peecho
    ? 'Peecho collects payment and delivery details in its own secure checkout. PrinTale does not collect card or address details.'
    : 'PrinTale can prepare a print-ready package for manual KDP upload. It cannot automatically submit to KDP.';
  document.getElementById('prepare-print-package').textContent = peecho
    ? 'Check Peecho sandbox setup'
    : 'Prepare KDP handoff';
  peechoCheckoutButton.hidden = !peecho;
  if (!peecho) peechoCheckoutLink.hidden = true;
  localStorage.setItem('storyspark-print-provider', printProvider.value);
}
printProvider.value = localStorage.getItem('storyspark-print-provider') || 'peecho';
updatePrintRoute();
printProvider.addEventListener('change', updatePrintRoute);
document.getElementById('prepare-print-package').addEventListener('click', async () => {
  if (printProvider.value === 'peecho') {
    const button = document.getElementById('prepare-print-package');
    button.disabled = true;
    printRouteStatus.textContent = 'Checking the private Peecho setup…';
    try {
      const response = await fetch('/api/peecho/status');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Peecho setup could not be checked.');
      printRouteStatus.textContent = result.ready
        ? 'Peecho is configured. The next production step is generating a high-resolution, product-specific print PDF before opening secure checkout.'
        : `Peecho is not connected yet: ${result.missing.join(' and ')}. No customer information or payment is collected in PrinTale.`;
    } catch (error) {
      printRouteStatus.textContent = error.message || 'Peecho setup could not be checked.';
    } finally { button.disabled = false; }
  } else {
    printRouteStatus.textContent = 'KDP export is selected. The next build creates a print-ready PDF and metadata package for manual KDP upload - no book is submitted automatically.';
  }
});
document.getElementById('open-peecho-checkout').addEventListener('click', async () => {
  const button = document.getElementById('open-peecho-checkout');
  const link = document.getElementById('peecho-checkout-link');
  const title = document.getElementById('generated-story-title').textContent;
  const story = document.getElementById('generated-story-text').textContent;
  if (bookSceneArt.length < 6 || !coloringSceneArt) {
    printRouteStatus.textContent = 'Finish the full illustrated book before opening Peecho checkout.';
    return;
  }
  button.disabled = true;
  printRouteStatus.textContent = 'Creating a secure Peecho sandbox checkout…';
  try {
    const response = await fetch('/api/peecho/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, hero: state.name, story, scenes: bookSceneArt, coloring: coloringSceneArt }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Peecho checkout could not be created.');
    link.href = result.checkoutUrl;
    link.hidden = false;
    printRouteStatus.textContent = `Secure Peecho ${result.environment} checkout is ready. Payment and delivery stay on Peecho.`;
    window.open(result.checkoutUrl, '_blank', 'noopener');
  } catch (error) {
    printRouteStatus.textContent = error.message || 'Peecho checkout could not be created.';
  } finally { button.disabled = false; }
});
document.getElementById('prepare-parent-proof').addEventListener('click', async () => {
  const button = document.getElementById('prepare-parent-proof');
  const download = document.getElementById('download-parent-proof');
  const title = document.getElementById('generated-story-title').textContent;
  const story = document.getElementById('generated-story-text').textContent;
  button.disabled = true;
  printRouteStatus.textContent = 'Building the low-resolution parent PDF proof…';
  try {
    const response = await fetch('/api/create-parent-proof', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, hero: state.name, story, scenes: bookSceneArt, coloring: coloringSceneArt }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The parent proof could not be created.');
    window.open(result.url, '_blank', 'noopener');
    download.href = `${result.url}?download=1`;
    download.hidden = false;
    printRouteStatus.textContent = 'Low-resolution parent proof opened. You can also download it for approval only; it is not sent to a printer.';
  } catch (error) { printRouteStatus.textContent = error.message || 'The parent proof could not be created.'; }
  finally { button.disabled = false; }
});
document.getElementById('complete-demo').addEventListener('click', () => successDialog.showModal());
document.getElementById('close-success').addEventListener('click', () => successDialog.close());
const flightPreviewButton = document.getElementById('preview-flight');
flightPreviewButton.addEventListener('click', () => {
  document.body.classList.remove('motion-preview');
  void document.body.offsetWidth;
  document.body.classList.add('motion-preview');
  flightPreviewButton.innerHTML = 'Flying now <span>✦</span>';
  window.setTimeout(() => {
    document.body.classList.remove('motion-preview');
    flightPreviewButton.innerHTML = 'Watch it fly <span>✦</span>';
  }, 6500);
});
updateName();
let isStartingFresh = false;

function saveProgress() {
  if (isStartingFresh) return;
  try {
    const selectedHero = document.querySelector('.avatar-choice.selected');
    const progress = {
      state: { ...state },
      selectedStyle: selectedHero?.dataset.style || 'aria',
      name: customHeroName.value,
      idea: voiceStoryIdea.value,
      parentConsent: photoConsent.checked,
      storyConsent: document.getElementById('voice-consent').checked,
      title: document.getElementById('generated-story-title').textContent,
      story: document.getElementById('generated-story-text').textContent,
      direction: coverDirection.value,
    };
    localStorage.setItem(cacheKeys.progress, JSON.stringify(progress));
    if (customAvatarChoice.dataset.cartoon === 'ready' && customAvatarPhoto.src.startsWith('data:image/')) localStorage.setItem(cacheKeys.cartoon, customAvatarPhoto.src);
    if (storySceneArt.src.startsWith('data:image/')) localStorage.setItem(cacheKeys.artwork, storySceneArt.src);
  } catch {
    // The visual preview is optional; core choices still remain in the current page.
  }
}

function restoreProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(cacheKeys.progress) || 'null');
    if (!saved) return;
    Object.assign(state, saved.state || {});
    customHeroName.value = saved.name || '';
    voiceStoryIdea.value = saved.idea || '';
    document.getElementById('voice-consent').checked = Boolean(saved.storyConsent);
    document.getElementById('generated-story-title').textContent = saved.title || document.getElementById('generated-story-title').textContent;
    document.getElementById('generated-story-heading').textContent = saved.title || document.getElementById('generated-story-heading').textContent;
    document.getElementById('generated-story-text').textContent = saved.story || document.getElementById('generated-story-text').textContent;
    coverDirection.value = saved.direction || buildIllustrationDirection();
    const cartoon = localStorage.getItem(cacheKeys.cartoon);
    const artwork = localStorage.getItem(cacheKeys.artwork);
    if (saved.selectedStyle === 'custom' && cartoon) {
      customAvatarChoice.hidden = false;
      customAvatarChoice.dataset.cartoon = 'ready';
      customAvatarPhoto.src = cartoon;
      demoResultAvatar.style.backgroundImage = `url("${cartoon}")`;
      document.documentElement.style.setProperty('--hero-photo', `url("${cartoon}")`);
      document.body.classList.add('custom-photo-hero');
      refreshCustomHeroName();
      selectAvatar(customAvatarChoice);
      photoDemoResult.hidden = false;
      photoCartoonStatus.textContent = 'Your cartoon hero was restored from this browser.';
    } else {
      const hero = document.querySelector(`.avatar-choice[data-style="${saved.selectedStyle || 'aria'}"]`) || document.querySelector('.avatar-choice[data-style="aria"]');
      selectAvatar(hero);
    }
    if (artwork) {
      storySceneArt.src = artwork;
      parentCoverArt.style.backgroundImage = `linear-gradient(180deg,rgba(22,47,77,0) 42%,rgba(22,47,77,.18)),url("${artwork}")`;
    }
    syncPrintPreview();
    updateStoryIdea();
    showStep(Number(state.step) || 1);
  } catch {
    // If browser storage is unavailable, StorySpark still starts safely from step one.
  }
}

document.addEventListener('input', () => window.setTimeout(saveProgress, 0));
document.addEventListener('change', () => window.setTimeout(saveProgress, 0));
document.addEventListener('click', () => window.setTimeout(saveProgress, 0));
restoreProgress();
syncPrintPreview();
restoreProofArt();
const startNewStory = document.getElementById('start-new-story');
let resetArmed = false;
startNewStory.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    startNewStory.textContent = 'Confirm: erase this book';
    window.setTimeout(() => { resetArmed = false; startNewStory.textContent = 'Start a new story'; }, 6000);
    return;
  }
  isStartingFresh = true;
  localStorage.removeItem(cacheKeys.progress);
  localStorage.removeItem(cacheKeys.cartoon);
  localStorage.removeItem(cacheKeys.artwork);
  if (window.indexedDB) window.indexedDB.deleteDatabase(proofCache.database);
  window.location.replace(`${window.location.pathname}?new-story=${Date.now()}#create`);
});
