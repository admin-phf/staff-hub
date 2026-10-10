/* PHF Staff Hub — POS Supplier New Product Check and Clean Merge · sheets-formula.js v1.0.1
 * sheets-formula.js — small Google Sheets formula evaluator.
 * v1.0.1 (11 Oct 2026): TO_TEXT(cell) returns the cell's displayed text (its number format applied), as Google Sheets
 * does, so FINAL SHELF RRP's GP NGST line uses the 2-decimal last price exactly like the Sheet.
 * Evaluates only the formulas the merge engine writes into OUT_MERGED_DATA
 * data rows (FINAL SHELF RRP / rrp incgst). Anything it does not know returns ''.
 */
(function (root) {
'use strict';
// Minimal Google Sheets formula evaluator for the formulas the merge script
// writes into OUT_MERGED_DATA data rows (AO / BE) and the visible-row helper.

class FErr { constructor(m) { this.m = m; } }

function colToNum(s) { let n = 0; for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64); return n; }

function tokenize(src) {
  const toks = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"') { let j = i + 1, s = ''; while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += src[j++]; } toks.push({ t: 'str', v: s }); i = j + 1; continue; }
    const m2 = src.slice(i, i + 2);
    if (m2 === '<>' || m2 === '<=' || m2 === '>=') { toks.push({ t: 'op', v: m2 }); i += 2; continue; }
    if ('+-*/&=<>(),:%'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
    let m = src.slice(i).match(/^\$?([A-Z]{1,3})\$?(\d+)(?![A-Z0-9_(])/);
    if (m) { toks.push({ t: 'ref', col: colToNum(m[1]), row: Number(m[2]) }); i += m[0].length; continue; }
    m = src.slice(i).match(/^\d+(\.\d+)?/);
    if (m) { toks.push({ t: 'num', v: Number(m[0]) }); i += m[0].length; continue; }
    m = src.slice(i).match(/^[A-Z_][A-Z0-9_.]*/i);
    if (m) { toks.push({ t: 'id', v: m[0].toUpperCase() }); i += m[0].length; continue; }
    throw new Error('tok ' + src.slice(i, i + 20));
  }
  return toks;
}

function parse(src) {
  const toks = tokenize(src); let p = 0;
  const peek = () => toks[p]; const next = () => toks[p++];
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
  function expr() { return cmp(); }
  function cmp() { let l = concat(); while (peek() && peek().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(peek().v)) { const o = next().v; const r = concat(); l = { k: 'bin', o, l, r }; } return l; }
  function concat() { let l = add(); while (isOp('&')) { next(); const r = add(); l = { k: 'bin', o: '&', l, r }; } return l; }
  function add() { let l = mul(); while (isOp('+') || isOp('-')) { const o = next().v; const r = mul(); l = { k: 'bin', o, l, r }; } return l; }
  function mul() { let l = unary(); while (isOp('*') || isOp('/')) { const o = next().v; const r = unary(); l = { k: 'bin', o, l, r }; } return l; }
  function unary() { if (isOp('-')) { next(); return { k: 'neg', e: unary() }; } if (isOp('+')) { next(); return unary(); } return prim(); }
  function prim() {
    const t = next();
    if (!t) throw new Error('eof');
    if (t.t === 'num') return { k: 'lit', v: t.v };
    if (t.t === 'str') return { k: 'lit', v: t.v };
    if (t.t === 'ref') { if (isOp(':')) { next(); const t2 = next(); return { k: 'range', a: t, b: t2 }; } return { k: 'ref', col: t.col, row: t.row }; }
    if (t.t === 'op' && t.v === '(') { const e = expr(); next(); return e; }
    if (t.t === 'id') {
      if (isOp('(')) { next(); const args = []; if (!isOp(')')) { args.push(expr()); while (isOp(',')) { next(); args.push(expr()); } } next(); return { k: 'fn', n: t.v, args }; }
      if (t.v === 'TRUE') return { k: 'lit', v: true }; if (t.v === 'FALSE') return { k: 'lit', v: false };
      throw new Error('id ' + t.v);
    }
    throw new Error('prim ' + JSON.stringify(t));
  }
  const e = expr();
  return e;
}

function toNum(v) { if (v instanceof FErr) throw v; if (v === '' || v == null) return 0; if (typeof v === 'boolean') return v ? 1 : 0; if (typeof v === 'number') return v; const n = Number(String(v).replace(/,/g, '')); if (isNaN(n)) throw new FErr('#VALUE!'); return n; }
function toStr(v) { if (v instanceof FErr) throw v; if (v == null) return ''; if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'; return String(v); }
function textFmt(v, f) {
  const n = toNum(v);
  if (f === '0.00%') return (n * 100).toFixed(2) + '%';
  if (f === '0.00') return n.toFixed(2);
  if (f === '#,##0') return Math.round(n).toLocaleString('en-US');
  return String(n);
}

function evaluate(node, ctx) {
  switch (node.k) {
    case 'lit': return node.v;
    case 'ref': return ctx.cell(node.row, node.col);
    case 'neg': return -toNum(evaluate(node.e, ctx));
    case 'bin': {
      const l = evaluate(node.l, ctx), r = evaluate(node.r, ctx);
      if (l instanceof FErr) throw l; if (r instanceof FErr) throw r;
      switch (node.o) {
        case '+': return toNum(l) + toNum(r); case '-': return toNum(l) - toNum(r);
        case '*': return toNum(l) * toNum(r); case '/': { const d = toNum(r); if (d === 0) throw new FErr('#DIV/0!'); return toNum(l) / d; }
        case '&': return toStr(l) + toStr(r);
        default: {
          let a = l, b = r;
          if (a === '' && typeof b === 'number') a = 0; if (b === '' && typeof a === 'number') b = 0;
          if (typeof a === 'string' && typeof b === 'string') { a = a.toUpperCase(); b = b.toUpperCase(); }
          switch (node.o) { case '=': return a === b; case '<>': return a !== b; case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b; }
        }
      }
      break;
    }
    case 'fn': {
      const A = node.args; const ev = (i) => evaluate(A[i], ctx);
      switch (node.n) {
        case 'IFERROR': try { const v = ev(0); if (v instanceof FErr) throw v; return v; } catch (e) { if (e instanceof FErr) return A.length > 1 ? ev(1) : ''; throw e; }
        case 'IF': { const c = ev(0); if (c instanceof FErr) throw c; const truthy = typeof c === 'boolean' ? c : toNum(c) !== 0; return truthy ? ev(1) : (A.length > 2 ? ev(2) : false); }
        case 'AND': return A.every((_, i) => { const v = ev(i); return typeof v === 'boolean' ? v : toNum(v) !== 0; });
        case 'OR': return A.some((_, i) => { const v = ev(i); return typeof v === 'boolean' ? v : toNum(v) !== 0; });
        case 'MAX': return Math.max(...A.map((_, i) => toNum(ev(i))));
        case 'ROUND': { const n = toNum(ev(0)), d = A.length > 1 ? toNum(ev(1)) : 0; const f = Math.pow(10, d); return Math.round(n * f + (n >= 0 ? 1e-9 : -1e-9)) / f; }
        case 'MROUND': { const n = toNum(ev(0)), m = toNum(ev(1)); if (m === 0) return 0; return Math.round(n / m + 1e-9) * m; }
        case 'VALUE': { const s = toStr(ev(0)).trim(); if (s === '') throw new FErr('#VALUE!'); const n = Number(s); if (isNaN(n)) throw new FErr('#VALUE!'); return n; }
        case 'TO_TEXT': return A[0] && A[0].k === 'ref' && ctx.text ? ctx.text(A[0].row, A[0].col) : toStr(ev(0));   // a cell as the Sheet shows it ($15.02, 38.68%)
        case 'REGEXREPLACE': return toStr(ev(0)).replace(new RegExp(toStr(ev(1)), 'g'), toStr(ev(2)));
        case 'REGEXMATCH': return new RegExp(toStr(ev(1))).test(toStr(ev(0)));
        case 'TEXT': return textFmt(ev(0), toStr(ev(1)));
        case 'CHAR': return String.fromCharCode(toNum(ev(0)));
        case 'SUBTOTAL': return 1;
        case 'UPPER': return toStr(ev(0)).toUpperCase();
        case 'LOWER': return toStr(ev(0)).toLowerCase();
        case 'TRIM': return toStr(ev(0)).replace(/\s+/g, ' ').trim();
        case 'LEN': return toStr(ev(0)).length;
        case 'LEFT': return toStr(ev(0)).slice(0, A.length > 1 ? toNum(ev(1)) : 1);
        case 'RIGHT': { const s = toStr(ev(0)), n = A.length > 1 ? toNum(ev(1)) : 1; return n ? s.slice(-n) : ''; }
        case 'MID': return toStr(ev(0)).substr(toNum(ev(1)) - 1, toNum(ev(2)));
        case 'MIN': return Math.min(...A.map((_, i) => toNum(ev(i))));
        case 'ABS': return Math.abs(toNum(ev(0)));
        case 'N': { const v = ev(0); return typeof v === 'number' ? v : (v === true ? 1 : 0); }
        case 'NOT': { const v = ev(0); return !(typeof v === 'boolean' ? v : toNum(v) !== 0); }
        default: throw new Error('fn ' + node.n);
      }
    }
    case 'range': throw new Error('range');
  }
  throw new Error('node ' + node.k);
}

const cache = new Map();
function evalFormula(formula, ctx) {
  let ast = cache.get(formula);
  if (!ast) { ast = parse(formula.replace(/^=/, '')); cache.set(formula, ast); }
  try { const v = evaluate(ast, ctx); return v instanceof FErr ? '#ERR' : v; }
  catch (e) { if (e instanceof FErr) return '#ERR'; throw e; }
}


root.PHFSheetsFormula = { evalFormula: evalFormula };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PHFSheetsFormula;
})(typeof self !== 'undefined' ? self : this);
