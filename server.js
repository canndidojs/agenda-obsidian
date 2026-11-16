const http = require('http'), fs = require('fs'), path = require('path');
// Vault: variável de ambiente VAULT, ou o vault aberto no Obsidian (lido da config do próprio Obsidian).
function findVault() {
  if (process.env.VAULT) return process.env.VAULT;
  try {
    const cfg = path.join(process.env.APPDATA || '', 'obsidian', 'obsidian.json');
    const vaults = Object.values(JSON.parse(fs.readFileSync(cfg, 'utf8')).vaults || {});
    const v = vaults.find(x => x.open) || vaults[0];
    if (v && v.path) return v.path;
  } catch (e) { /* sem config do Obsidian */ }
  throw new Error('Vault não encontrado. Defina a variável de ambiente VAULT com o caminho do vault.');
}
const VAULT = findVault();
const ROOT = path.join(VAULT, 'Agenda');
const PORT = 3377;
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const pad = n => String(n).padStart(2, '0');

function parse(dateStr) { const [y, m, d] = dateStr.split('-').map(Number); return new Date(y, m - 1, d); }
function isoWeek(dt) {
  const t = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn);
  const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { week: Math.ceil(((t - ys) / 864e5 + 1) / 7), year: t.getUTCFullYear() };
}
function paths(dateStr) {
  const dt = parse(dateStr), y = dt.getFullYear(), m = dt.getMonth();
  const { week } = isoWeek(dt);
  const monthDir = path.join(ROOT, String(y), `${pad(m + 1)} - ${MESES[m]}`);
  const weekName = `Semana ${pad(week)}`;
  const weekDir = path.join(monthDir, weekName);
  return { dt, y, m, week, monthDir, weekDir, weekName,
    day: path.join(weekDir, `${dateStr}.md`),
    weekNote: path.join(weekDir, `${weekName}.md`),
    monthNote: path.join(monthDir, `${MESES[m]} ${y}.md`) };
}
const isDayFile = f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f);
const AVISO = '> Gerado automaticamente pelo app Agenda. Edite as notas dos dias; este arquivo é refeito a cada mudança.\n';
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

// Refaz o resumo da semana (embeds dos dias + pendências) e o índice do mês
function rebuild(dateStr) {
  const p = paths(dateStr);
  const days = fs.readdirSync(p.weekDir).filter(isDayFile).sort();
  const abertas = [];
  let wk = `---\ngerado: true\ntags: [agenda-semana]\n---\n# ${p.weekName} - ${p.y}\n\n${AVISO}\n`;
  let blocos = '';
  for (const f of days) {
    const d = f.slice(0, 10);
    const lines = fs.readFileSync(path.join(p.weekDir, f), 'utf8').split('\n');
    lines.filter(l => /^- \[ \]/.test(l)).forEach(l => abertas.push(`- ⏳ ${l.replace(/^- \[ \] /, '')} — [[${d}]]`));
    blocos += `## [[${d}]] · ${DIAS[parse(d).getDay()]}\n![[${d}#Anotações]]\n\n`;
  }
  wk += `## Pendentes da semana\n${abertas.length ? abertas.join('\n') : 'Nenhuma pendência aberta.'}\n\n${blocos}`;
  fs.writeFileSync(p.weekNote, wk);

  const weeks = fs.readdirSync(p.monthDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^Semana \d+$/.test(e.name)).map(e => e.name).sort();
  let mo = `---\ngerado: true\ntags: [agenda-mes]\n---\n# ${MESES[p.m]} ${p.y}\n\n${AVISO}\n## Semanas\n`;
  for (const w of weeks) {
    let notas = 0, pend = 0;
    for (const f of fs.readdirSync(path.join(p.monthDir, w)).filter(isDayFile)) {
      for (const l of fs.readFileSync(path.join(p.monthDir, w, f), 'utf8').split('\n')) {
        if (/^- /.test(l)) { notas++; if (/^- \[ \]/.test(l)) pend++; }
      }
    }
    const rel = path.relative(VAULT, path.join(p.monthDir, w, `${w}.md`)).replace(/\\/g, '/').replace(/\.md$/, '');
    mo += `- [[${rel}|${w}]] — ${plural(notas, 'anotação', 'anotações')}${pend ? ` · ${plural(pend, 'pendente', 'pendentes')}` : ''}\n`;
  }
  fs.writeFileSync(p.monthNote, mo);
}
function ensureDay(dateStr) {
  const p = paths(dateStr);
  fs.mkdirSync(p.weekDir, { recursive: true });
  if (!fs.existsSync(p.day)) {
    const titulo = `${pad(p.dt.getDate())}/${pad(p.m + 1)}/${p.y} - ${DIAS[p.dt.getDay()]}`;
    fs.writeFileSync(p.day, `---\ndata: ${dateStr}\nsemana: ${p.week}\nmes: ${MESES[p.m]}\ntags: [agenda]\n---\n# ${titulo}\n\n## Anotações\n`);
  }
  return p;
}
function addEntry(dateStr, pendente, texto) {
  const p = ensureDay(dateStr), sec = 'Anotações';
  const hora = new Date().toTimeString().slice(0, 5);
  const linha = pendente ? `- [ ] ${hora} ${texto}` : `- ${hora} ${texto}`;
  const lines = fs.readFileSync(p.day, 'utf8').split('\n');
  let i = lines.findIndex(l => l.trim() === `## ${sec}`);
  if (i < 0) { lines.push('', `## ${sec}`); i = lines.length - 1; }
  let j = i + 1;
  while (j < lines.length && !lines[j].startsWith('## ')) j++;
  while (j > i + 1 && lines[j - 1].trim() === '') j--;
  lines.splice(j, 0, linha);
  fs.writeFileSync(p.day, lines.join('\n'));
  rebuild(dateStr);
}
// Editar, apagar e restaurar conferem a linha antiga para não mexer no lugar errado
// se o arquivo tiver sido alterado no Obsidian nesse meio tempo.
function editEntry(dateStr, idx, old, texto) {
  const p = paths(dateStr), lines = fs.readFileSync(p.day, 'utf8').split('\n');
  if (lines[idx] !== old) return false;
  const prefixo = old.match(/^- (\[[ x]\] )?(\d{2}:\d{2} )?/)[0];
  lines[idx] = prefixo + String(texto).replace(/\s*\n\s*/g, ' ').trim();
  fs.writeFileSync(p.day, lines.join('\n'));
  rebuild(dateStr);
  return true;
}
function deleteEntry(dateStr, idx, old) {
  const p = paths(dateStr), lines = fs.readFileSync(p.day, 'utf8').split('\n');
  if (lines[idx] !== old) return false;
  lines.splice(idx, 1);
  fs.writeFileSync(p.day, lines.join('\n'));
  rebuild(dateStr);
  return true;
}
function restoreEntry(dateStr, idx, line) {
  if (typeof line !== 'string' || !line.startsWith('- ')) return false;
  const p = paths(dateStr), lines = fs.readFileSync(p.day, 'utf8').split('\n');
  lines.splice(Math.min(idx, lines.length), 0, line);
  fs.writeFileSync(p.day, lines.join('\n'));
  rebuild(dateStr);
  return true;
}
function readDay(dateStr) {
  const p = paths(dateStr);
  const rel = path.relative(VAULT, p.day).replace(/\\/g, '/');
  if (!fs.existsSync(p.day)) return { sections: {}, rel: null, vault: path.basename(VAULT) };
  const sections = {}; let cur = null;
  fs.readFileSync(p.day, 'utf8').split('\n').forEach((l, idx) => {
    if (l.startsWith('## ')) { cur = l.slice(3).trim(); sections[cur] = []; }
    else if (cur && l.trim()) sections[cur].push({ idx, text: l });
  });
  return { sections, rel, vault: path.basename(VAULT) };
}
function toggle(dateStr, idx) {
  const p = paths(dateStr), lines = fs.readFileSync(p.day, 'utf8').split('\n');
  if (/^- \[ \]/.test(lines[idx])) lines[idx] = lines[idx].replace('- [ ]', '- [x]');
  else if (/^- \[x\]/.test(lines[idx])) lines[idx] = lines[idx].replace('- [x]', '- [ ]');
  fs.writeFileSync(p.day, lines.join('\n'));
  rebuild(dateStr);
}
// Todos os arquivos de dia (AAAA-MM-DD.md), do mais novo para o mais antigo
function dayFiles() {
  const out = [];
  (function walk(d) {
    let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const e of es) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (/^\d{4}-\d{2}-\d{2}\.md$/.test(e.name)) out.push({ date: e.name.slice(0, 10), file: f });
    }
  })(ROOT);
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function linesOf(f) { return fs.readFileSync(f, 'utf8').split('\n'); }
function search(q) {
  const n = norm(q.trim()), out = [];
  if (!n) return out;
  for (const { date, file } of dayFiles()) {
    linesOf(file).forEach((l, idx) => {
      if (l.startsWith('- ') && norm(l).includes(n)) out.push({ date, idx, text: l });
    });
    if (out.length >= 200) break;
  }
  return out.slice(0, 200);
}
// Tags já usadas nas anotações, mais frequentes primeiro (sem diferenciar maiúsculas)
function tagsList() {
  const c = {};
  for (const { file } of dayFiles()) {
    for (const l of linesOf(file)) {
      if (!l.startsWith('- ')) continue;
      for (const m of l.matchAll(/(?:^|\s)(#[\p{L}\p{N}_\/-]+)/gu)) { const t = m[1].toLowerCase(); c[t] = (c[t] || 0) + 1; }
    }
  }
  return Object.entries(c).map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag));
}
// Tarefas ainda abertas em dias anteriores a `before`, as mais antigas primeiro
function pending(before) {
  const out = [];
  for (const { date, file } of dayFiles().reverse()) {
    if (date >= before) break;
    linesOf(file).forEach((l, idx) => { if (/^- \[ \]/.test(l)) out.push({ date, idx, text: l }); });
  }
  return out;
}
function body(req) { return new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(JSON.parse(b || '{}'))); }); }

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const json = o => { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
  try {
    if (u.pathname === '/api/day') return json(readDay(u.searchParams.get('date')));
    if (u.pathname === '/api/search') return json(search(u.searchParams.get('q') || ''));
    if (u.pathname === '/api/tags') return json(tagsList());
    if (u.pathname === '/api/pending') return json(pending(u.searchParams.get('before')));
    if (u.pathname === '/api/add' && req.method === 'POST') { const b = await body(req); addEntry(b.date, !!b.pendente, b.texto); return json({ ok: 1 }); }
    if (u.pathname === '/api/edit' && req.method === 'POST') { const b = await body(req); return json({ ok: editEntry(b.date, b.idx, b.old, b.texto) }); }
    if (u.pathname === '/api/delete' && req.method === 'POST') { const b = await body(req); return json({ ok: deleteEntry(b.date, b.idx, b.old) }); }
    if (u.pathname === '/api/restore' && req.method === 'POST') { const b = await body(req); return json({ ok: restoreEntry(b.date, b.idx, b.line) }); }
    if (u.pathname === '/api/toggle' && req.method === 'POST') { const b = await body(req); toggle(b.date, b.idx); return json({ ok: 1 }); }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(PORT, '127.0.0.1', () => console.log(`Agenda em http://localhost:${PORT}  ->  ${ROOT}`));
