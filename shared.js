// Código usado pela janela principal e pela janela mínima de captura (sugestão de tags)
const SUGESTOES = ['#admin', '#dev', '#financeiro', '#reunião', '#cliente', '#fornecedor', '#pedido', '#compras', '#rh', '#bug', '#urgente', '#ideia', '#dúvida', '#pagamento'];
const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tokenRe = /(^|\s)#([\p{L}\p{N}_\/-]*)$/u;

// Tag que está sendo digitada logo antes do cursor, ou null
function tokenDe(inp) {
  const before = inp.value.slice(0, inp.selectionStart), m = before.match(tokenRe);
  return m ? { q: m[2].toLowerCase(), start: before.length - m[2].length - 1 } : null;
}
// Sugestões prontas primeiro; tags próprias já usadas só entram depois que você digitou algo
function sugerirTags(usadas, q) {
  q = semAcento(q);
  const extra = q ? usadas.filter(t => !SUGESTOES.includes(t)) : [];
  return [...SUGESTOES, ...extra].filter(t => { const s = semAcento(t.slice(1)); return s.startsWith(q) && s !== q; }).slice(0, 8);
}
