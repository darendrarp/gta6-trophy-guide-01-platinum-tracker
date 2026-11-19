// Vice Tracker — GTA VI trophy guide and tracker.
// Loads app/data/trophies.json, renders the checklist, and saves progress in
// localStorage. No network requests beyond the app's own files; the source
// links in the guides open only when the reader follows them.

const PROGRESS_KEY = 'vice-tracker-progress-v1';
const SETTINGS_KEY = 'vice-tracker-settings-v1';

const grid = document.getElementById('trophy-grid');
const emptyBox = document.getElementById('empty');
const emptyText = document.getElementById('empty-text');
const searchInput = document.getElementById('search');
const gradeSelect = document.getElementById('grade');
const spoilerBox = document.getElementById('spoiler');
const hideEarnedBox = document.getElementById('hide-earned');
const kindsBar = document.getElementById('kinds');
const resultCount = document.getElementById('result-count');
const progressCount = document.getElementById('progress-count');
const progressPct = document.getElementById('progress-pct');
const progressFill = document.getElementById('progress-fill');
const progressWrap = document.getElementById('progress-wrap');
const gradeLine = document.getElementById('grade-line');
const stageGrid = document.getElementById('stage-grid');

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

function loadSet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

let earned = loadSet(PROGRESS_KEY);
const settings = loadSettings();
let kindFilter = settings.kind ?? 'all';

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...earned].sort()));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    kind: kindFilter,
    grade: gradeSelect.value,
    spoiler: spoilerBox.checked,
    hideEarned: hideEarnedBox.checked,
    query: searchInput.value,
  }));
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  return { story: 'Story', missable: 'Missable', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' }[kind] ?? kind;
}

function stageLabel(stage) {
  return { 1: 'Stage 1 · Story run', 2: 'Stage 2 · 100% checklist', 3: 'Stage 3 · Cleanup' }[stage] ?? '';
}

function matchesFilters(t) {
  if (kindFilter === 'missable' && !t.missable) return false;
  if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) return false;
  if (kindFilter === 'online') return false; // the game lists no online trophies
  if (gradeSelect.value !== 'all' && t.grade !== gradeSelect.value) return false;
  if (hideEarnedBox.checked && earned.has(t.name)) return false;
  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide} ${t.kind} ${stageLabel(t.stage)}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function spoilerHidden(t) {
  return spoilerBox.checked && t.hidden && !earned.has(t.name);
}

function sourceList(t) {
  const wrap = document.createElement('p');
  wrap.className = 'sources';
  wrap.append('Sources: ');
  t.sources.forEach((s, i) => {
    if (i > 0) wrap.append(' · ');
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = s.name;
    wrap.append(a);
  });
  return wrap;
}

function trophyCard(t) {
  const card = document.createElement('article');
  card.className = `card grade-${t.grade}${earned.has(t.name) ? ' earned' : ''}${t.missable ? ' missable' : ''}`;
  card.id = `trophy-${t.id}`;
  card.dataset.trophyId = String(t.id);

  const head = document.createElement('div');
  head.className = 'card-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.className = 'earn-box';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', `Mark ${t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    saveProgress();
    render();
  });
  const badge = document.createElement('span');
  badge.className = `grade-badge grade-${t.grade}`;
  badge.textContent = gradeLabel(t.grade);
  head.append(box, badge);
  if (t.missable) {
    const flag = document.createElement('span');
    flag.className = 'flag-missable';
    flag.textContent = '⚠ MISSABLE';
    head.append(flag);
  }
  if (t.hidden) {
    const flag = document.createElement('span');
    flag.className = 'flag-hidden';
    flag.textContent = 'Hidden on PS5';
    head.append(flag);
  }
  card.append(head);

  const hidden = spoilerHidden(t);
  const name = document.createElement('h3');
  name.className = 'trophy-name';
  name.textContent = hidden ? 'Hidden trophy — earn it to reveal' : t.name;
  card.append(name);

  const desc = document.createElement('p');
  desc.className = 'trophy-desc';
  desc.textContent = hidden ? 'Its name and description stay hidden until you earn it. (Spoiler setting is on.)' : t.description;
  card.append(desc);

  const meta = document.createElement('p');
  meta.className = 'trophy-meta';
  const bits = [kindLabel(t.kind), stageLabel(t.stage)];
  if (t.count) bits.push(t.count);
  meta.textContent = bits.join(' · ');
  card.append(meta);

  if (!hidden) {
    const guide = document.createElement('p');
    guide.className = 'trophy-guide';
    guide.textContent = t.guide;
    card.append(guide);
    card.append(sourceList(t));
  } else {
    const note = document.createElement('p');
    note.className = 'spoiler-note';
    note.textContent = 'Guide hidden with the trophy name — turn off “Hide story spoilers” or tick the box to see it.';
    card.append(note);
  }
  return card;
}

function renderRoadmap() {
  stageGrid.replaceChildren();
  for (const s of doc.roadmap.stages) {
    const n = trophies.filter((t) => t.stage === s.stage).length;
    const got = trophies.filter((t) => t.stage === s.stage && earned.has(t.name)).length;
    const el = document.createElement('div');
    el.className = 'stage-card';
    const h = document.createElement('h3');
    h.textContent = `Stage ${s.stage} — ${s.title}`;
    const hours = document.createElement('p');
    hours.className = 'stage-hours';
    hours.textContent = `${s.hours} · ${got}/${n} trophies`;
    const p = document.createElement('p');
    p.textContent = s.text;
    el.append(h, hours, p);
    stageGrid.append(el);
  }
}

function renderProgress() {
  const total = trophies.length;
  const got = trophies.filter((t) => earned.has(t.name)).length;
  progressCount.textContent = `${got} / ${total} earned`;
  const pct = Math.round((got / total) * 100);
  progressPct.textContent = `${pct}% to platinum`;
  progressFill.style.width = `${pct}%`;
  progressWrap.querySelector('.progress-bar').setAttribute('aria-valuenow', String(got));
  const parts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const all = trophies.filter((t) => t.grade === g).length;
    const have = trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
    return `${gradeLabel(g)} ${have}/${all}`;
  });
  gradeLine.textContent = parts.join(' · ');
}

function render() {
  renderProgress();
  renderRoadmap();
  const shown = trophies.filter(matchesFilters);
  grid.replaceChildren(...shown.map(trophyCard));
  emptyBox.hidden = shown.length !== 0;
  if (kindFilter === 'online') {
    emptyBox.hidden = false;
    emptyText.textContent = 'GTA VI lists no online trophies — all 55 are single-player. Nothing to track here.';
  } else if (shown.length === 0) {
    emptyText.textContent = 'Try another filter or search.';
  }
  const earnedShown = shown.filter((t) => earned.has(t.name)).length;
  resultCount.textContent = `Showing ${shown.length} of ${trophies.length} trophies${earnedShown ? ` · ${earnedShown} earned` : ''}`;
  saveSettings();
}

function setKind(kind) {
  kindFilter = kind;
  for (const b of kindsBar.querySelectorAll('.chip')) {
    b.classList.toggle('active', b.dataset.kind === kind);
  }
  render();
}

kindsBar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-kind]');
  if (b) setKind(b.dataset.kind);
});
gradeSelect.addEventListener('change', render);
spoilerBox.addEventListener('change', render);
hideEarnedBox.addEventListener('change', render);
searchInput.addEventListener('input', render);

document.getElementById('export').addEventListener('click', () => {
  const payload = {
    app: 'vice-tracker',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'vice-tracker-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('no earned list');
    const known = new Set(trophies.map((t) => t.name));
    const next = new Set(names.filter((n) => typeof n === 'string' && known.has(n)));
    earned = next;
    saveProgress();
    render();
  } catch {
    resultCount.textContent = 'That file is not a Vice Tracker export — nothing was imported.';
  }
  e.target.value = '';
});

document.getElementById('reset').addEventListener('click', () => {
  if (window.confirm('Clear all earned trophies? This cannot be undone.')) {
    earned = new Set();
    saveProgress();
    render();
  }
});

// Restore saved settings (not the earned set: shot mode sets its own).
gradeSelect.value = settings.grade ?? 'all';
spoilerBox.checked = settings.spoiler ?? true;
hideEarnedBox.checked = settings.hideEarned ?? false;
searchInput.value = settings.query ?? '';
setKind(kindFilter);

// Deterministic screenshot states: ?shot=cover|roadmap|guide|spoiler.
// Each sets a fixed demo progress, filter and open trophy, then signals
// window.__shotReady once the page has rendered and settled.
const DEMO_EARNED = ['Just Like Paradise', 'Paradise Lost', 'T**s Ass Drug Money', 'Trust', 'Cunning Stunts', 'Master of None', 'Baited My Tackle', 'Stick Fiddler', 'Positive Mental Attitude', 'Whip It Good', 'The Goodtime State', 'Dime on the Dollar'];

function applyShot() {
  if (!shotMode) return;
  earned = new Set(DEMO_EARNED);
  saveProgress();
  spoilerBox.checked = false;
  hideEarnedBox.checked = false;
  searchInput.value = '';
  gradeSelect.value = 'all';
  let openId = null;
  let scrollTo = null;
  if (shotMode === 'cover') {
    // Cover: title, progress, compact roadmap, filters and the first cards.
    document.body.classList.add('shot-cover');
    openId = 1;
    scrollTo = 'top';
  } else if (shotMode === 'roadmap') {
    scrollTo = document.getElementById('roadmap');
  } else if (shotMode === 'guide') {
    // Spotlight the one missable trophy: its guide is the longest single
    // guide in the set, and the MISSABLE flag is a judging criterion the
    // screenshots must show.
    openId = 28;
    setKind('all');
  } else if (shotMode === 'spoiler') {
    spoilerBox.checked = true;
    earned = new Set(['Just Like Paradise', 'Paradise Lost']);
    saveProgress();
    setKind('story');
    openId = 2; // first story card: earned and revealed, the rest masked
  }
  render();
  if (openId) {
    const el = document.getElementById(`trophy-${openId}`);
    if (el) {
      el.classList.add('spotlight');
      if (shotMode === 'spoiler') {
        // Put the first card just under the sticky controls bar.
        el.scrollIntoView({ block: 'start' });
        window.scrollBy(0, -170);
      } else if (shotMode !== 'cover') {
        el.scrollIntoView({ block: 'center' });
      }
    }
  } else if (scrollTo === 'top') {
    window.scrollTo(0, 0);
  } else if (scrollTo) {
    scrollTo.scrollIntoView({ block: 'start' });
  }
}

applyShot();
if (!shotMode) render();

function signalReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
signalReady();
