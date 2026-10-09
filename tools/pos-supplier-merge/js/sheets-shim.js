/* PHF Staff Hub — POS Supplier Merge v1.0.0
 * sheets-shim.js — an in-memory stand-in for the Google Sheets services the
 * POS Supplier Merge Apps Script (v6.3.87) uses, so the unchanged script files
 * can run in the browser.
 *
 * Covered: SpreadsheetApp (spreadsheet / sheet / range / range list / filter /
 * text finder / UI alerts + dialogs), Utilities (formatDate, base64Encode,
 * sleep), PropertiesService, LockService, CacheService, Session, HtmlService,
 * Logger.  Formatting calls (colours, fonts, banding, conditional formats,
 * widths …) are accepted and ignored: they only change how a Google Sheet looks.
 * Values, formulas, notes, number formats (for display values) and sheet
 * structure (rows / columns / filters) are kept.
 */
(function (root) {
  'use strict';

  var Formula = root.PHFSheetsFormula || (typeof require === 'function' ? require('./sheets-formula.js') : null);

  // ---------------------------------------------------------------- helpers
  function makeNoop() {
    var fn = function () { return proxy; };
    var proxy = new Proxy(fn, {
      get: function (t, k) {
        if (k === Symbol.toPrimitive) return function () { return ''; };
        if (k === 'length') return 0;
        if (k === 'then') return undefined;
        if (k === Symbol.iterator) return function* () {};
        return proxy;
      },
      apply: function () { return proxy; }
    });
    return proxy;
  }
  var NOOP = makeNoop();
  var CHAIN_RE = /^(set|clear|apply|insert|hide|show|remove|add|auto|merge|break|protect|activate|sort|trim|copy|uncheck|check|unmerge|expand|collapse|moveTo|randomize|shift|group|ungroup|deleteCells)/;

  // Methods the object does not define: setters and other actions chain back to
  // the object (formatting is ignored); anything else returns a harmless no-op.
  function soft(obj) {
    var p = new Proxy(obj, {
      get: function (t, k) {
        if (k in t) {
          var v = t[k];
          return typeof v === 'function' ? function () { var r = v.apply(t, arguments); return r === t ? p : r; } : v;
        }
        if (typeof k === 'symbol') return undefined;
        if (CHAIN_RE.test(k)) return function () { return p; };
        return NOOP;
      }
    });
    return p;
  }

  function colToNum(s) { var n = 0; s = String(s).toUpperCase(); for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n; }
  function numToCol(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function parseA1(a1) {
    var s = String(a1).replace(/\$/g, '');
    if (s.indexOf('!') >= 0) s = s.split('!').pop();
    function part(t) {
      var m = String(t).match(/^([A-Z]*)(\d*)$/i);
      if (!m) throw new Error('Invalid range ' + a1);
      return { c: m[1] ? colToNum(m[1]) : null, r: m[2] ? Number(m[2]) : null };
    }
    var bits = s.split(':');
    var a = part(bits[0]);
    if (bits.length === 1) return { r: a.r || 1, c: a.c || 1, r2: a.r || 1, c2: a.c || 1 };
    var b = part(bits[1]);
    return { r: a.r || 1, c: a.c || 1, r2: b.r, c2: b.c };
  }
  function isBlank(v) { return v === '' || v === null || v === undefined; }

  // ---------------------------------------------------------- display values
  function trimNum(n, places) {
    var s = n.toFixed(places);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  function roundAway(n, places) {
    var f = Math.pow(10, places || 0);
    return Math.sign(n) * Math.round(Math.abs(n) * f + 1e-9) / f;
  }
  function withThousands(s) {
    var neg = s.charAt(0) === '-'; if (neg) s = s.slice(1);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + parts.join('.');
  }
  function generalNumber(n) {
    if (!isFinite(n)) return String(n);
    if (Number.isInteger(n)) return String(n);
    return String(Number(n.toPrecision(10)));
  }
  function displayOf(v, fmt) {
    if (isBlank(v)) return '';
    if (v === true) return 'TRUE';
    if (v === false) return 'FALSE';
    if (v instanceof Date) return v.toISOString();
    if (typeof v !== 'number') return String(v);
    if (!fmt || fmt === '@' || /^general$/i.test(fmt)) return generalNumber(v);
    var f = String(fmt);
    var m;
    if ((m = f.match(/^(\$?)(#,##)?0(?:\.(0+))?$/))) {
      var dp = m[3] ? m[3].length : 0;
      var s = roundAway(v, dp).toFixed(dp);
      if (m[2]) s = withThousands(s);
      if (m[1]) s = s.charAt(0) === '-' ? '-$' + s.slice(1) : '$' + s;
      return s;
    }
    if ((m = f.match(/^0\.(#+)$/))) return trimNum(roundAway(v, m[1].length), m[1].length);
    if ((m = f.match(/^0(?:\.(0+))?%$/))) { var d2 = m[1] ? m[1].length : 0; return roundAway(v * 100, d2).toFixed(d2) + '%'; }
    return generalNumber(v);
  }

  // ------------------------------------------------------------------ Sheet
  function Sheet(ss, name) {
    this.ss = ss; this.name = String(name); this.cells = []; this.notes = {};
    this.maxRows = 1000; this.maxCols = 26; this.formats = []; this.filter = null;
    this.hidden = false; this.frozenRows = 0; this.hiddenRowsByFilter = {};
    this.rowCount = []; this.colCount = []; this.lastRow = 0; this.lastCol = 0;
    this._proxy = soft(this);
  }
  Sheet.prototype._get = function (r, c) { var row = this.cells[r - 1]; return row ? row[c - 1] : undefined; };
  Sheet.prototype._set = function (r, c, v) {
    if (v === undefined || v === null) v = '';
    if (v instanceof Date) v = v.toISOString();
    var row = this.cells[r - 1];
    if (!row) { if (isBlank(v)) return; while (this.cells.length < r) this.cells.push(null); row = this.cells[r - 1] = []; }
    var old = row[c - 1];
    var wasBlank = isBlank(old), nowBlank = isBlank(v);
    row[c - 1] = v;
    if (r > this.maxRows) this.maxRows = r;
    if (c > this.maxCols) this.maxCols = c;
    if (wasBlank === nowBlank) return;
    var d = nowBlank ? -1 : 1;
    this.rowCount[r] = (this.rowCount[r] || 0) + d;
    this.colCount[c] = (this.colCount[c] || 0) + d;
    if (d > 0) { if (r > this.lastRow) this.lastRow = r; if (c > this.lastCol) this.lastCol = c; }
    else {
      while (this.lastRow > 0 && !this.rowCount[this.lastRow]) this.lastRow--;
      while (this.lastCol > 0 && !this.colCount[this.lastCol]) this.lastCol--;
    }
  };
  Sheet.prototype._recount = function () {
    this.rowCount = []; this.colCount = []; this.lastRow = 0; this.lastCol = 0;
    for (var r = 1; r <= this.cells.length; r++) {
      var row = this.cells[r - 1]; if (!row) continue;
      for (var c = 1; c <= row.length; c++) {
        if (isBlank(row[c - 1])) continue;
        this.rowCount[r] = (this.rowCount[r] || 0) + 1; this.colCount[c] = (this.colCount[c] || 0) + 1;
        if (r > this.lastRow) this.lastRow = r; if (c > this.lastCol) this.lastCol = c;
      }
    }
  };
  Sheet.prototype._evalCell = function (r, c, depth) {
    var v = this._get(r, c);
    if (typeof v === 'string' && v.charAt(0) === '=' && v.length > 1) {
      if ((depth || 0) > 6 || !Formula) return '';
      var self = this;
      try { var out = Formula.evalFormula(v, { cell: function (rr, cc) { return self._evalCell(rr, cc, (depth || 0) + 1); } }); return out === '#ERR' ? '#ERROR!' : out; }
      catch (e) { return ''; }
    }
    return isBlank(v) ? '' : v;
  };
  Sheet.prototype._formatAt = function (r, c) {
    for (var i = this.formats.length - 1; i >= 0; i--) {
      var f = this.formats[i];
      if (r >= f.r1 && r <= f.r2 && c >= f.c1 && c <= f.c2) return f.fmt;
    }
    return '';
  };
  Sheet.prototype._addFormat = function (r1, c1, r2, c2, fmt) {
    for (var i = this.formats.length - 1; i >= 0; i--) {
      var f = this.formats[i];
      if (f.r1 >= r1 && f.r2 <= r2 && f.c1 >= c1 && f.c2 <= c2) this.formats.splice(i, 1);
    }
    this.formats.push({ r1: r1, c1: c1, r2: r2, c2: c2, fmt: String(fmt || '') });
    if (this.formats.length > 4000) this.formats.splice(0, this.formats.length - 4000);
  };
  Sheet.prototype.getName = function () { return this.name; };
  Sheet.prototype.setName = function (n) { this.name = String(n); return this; };
  Sheet.prototype.getParent = function () { return this.ss._proxy; };
  Sheet.prototype.getSheetId = function () { return this.ss.sheets.indexOf(this) + 1; };
  Sheet.prototype.getIndex = function () { return this.ss.sheets.indexOf(this) + 1; };
  Sheet.prototype.getLastRow = function () { return this.lastRow; };
  Sheet.prototype.getLastColumn = function () { return this.lastCol; };
  Sheet.prototype.getMaxRows = function () { return Math.max(this.maxRows, this.cells.length); };
  Sheet.prototype.getMaxColumns = function () { return Math.max(this.maxCols, this.lastCol); };
  Sheet.prototype.insertRowsAfter = function (after, n) { this._insertRows(after + 1, n); return this; };
  Sheet.prototype.insertRowsBefore = function (before, n) { this._insertRows(before, n); return this; };
  Sheet.prototype.insertRowAfter = function (after) { this._insertRows(after + 1, 1); return this; };
  Sheet.prototype.insertRowBefore = function (before) { this._insertRows(before, 1); return this; };
  Sheet.prototype._insertRows = function (at, n) {
    n = Number(n || 0); if (n <= 0) return;
    if (at - 1 < this.cells.length) { var blanks = []; for (var i = 0; i < n; i++) blanks.push(null); Array.prototype.splice.apply(this.cells, [at - 1, 0].concat(blanks)); this._recount(); }
    this.maxRows += n;
  };
  Sheet.prototype.insertColumnsAfter = function (after, n) { this.maxCols += Number(n || 0); return this; };
  Sheet.prototype.insertColumnAfter = function () { this.maxCols += 1; return this; };
  Sheet.prototype.insertColumnsBefore = function (b, n) { this.maxCols += Number(n || 0); return this; };
  Sheet.prototype.deleteRows = function (start, n) {
    n = Number(n || 1);
    if (start - 1 < this.cells.length) this.cells.splice(start - 1, n);
    this.maxRows = Math.max(1, this.getMaxRows() - n);
    var notes = {}, self = this;
    Object.keys(this.notes).forEach(function (k) { var p = k.split(':'), r = Number(p[0]); if (r < start) notes[k] = self.notes[k]; else if (r >= start + n) notes[(r - n) + ':' + p[1]] = self.notes[k]; });
    this.notes = notes; this._recount();
    return this;
  };
  Sheet.prototype.deleteRow = function (r) { return this.deleteRows(r, 1); };
  Sheet.prototype.deleteColumns = function (start, n) {
    n = Number(n || 1);
    for (var i = 0; i < this.cells.length; i++) if (this.cells[i]) this.cells[i].splice(start - 1, n);
    this.maxCols = Math.max(1, this.getMaxColumns() - n); this._recount();
    return this;
  };
  Sheet.prototype.deleteColumn = function (c) { return this.deleteColumns(c, 1); };
  Sheet.prototype.getRange = function (a, b, c, d) {
    if (typeof a === 'string' && b === undefined) {
      var p = parseA1(a);
      var r2 = p.r2 == null ? this.getMaxRows() : p.r2;
      var c2 = p.c2 == null ? this.getMaxColumns() : p.c2;
      return makeRange(this, p.r, p.c, r2 - p.r + 1, c2 - p.c + 1);
    }
    return makeRange(this, Number(a), Number(b), c == null ? 1 : Number(c), d == null ? 1 : Number(d));
  };
  Sheet.prototype.getRangeList = function (list) {
    var self = this;
    return makeRangeList((list || []).map(function (a1) { return self.getRange(a1); }));
  };
  Sheet.prototype.getDataRange = function () { return this.getRange(1, 1, Math.max(1, this.lastRow), Math.max(1, this.lastCol)); };
  Sheet.prototype.getFilter = function () { return this.filter ? this.filter._proxy : null; };
  Sheet.prototype.getBandings = function () { return []; };
  Sheet.prototype.getConditionalFormatRules = function () { return []; };
  Sheet.prototype.setConditionalFormatRules = function () { return this; };
  Sheet.prototype.hideSheet = function () { this.hidden = true; return this; };
  Sheet.prototype.showSheet = function () { this.hidden = false; return this; };
  Sheet.prototype.isSheetHidden = function () { return this.hidden; };
  Sheet.prototype.setFrozenRows = function (n) { this.frozenRows = Number(n || 0); return this; };
  Sheet.prototype.getFrozenRows = function () { return this.frozenRows; };
  Sheet.prototype.getFrozenColumns = function () { return 0; };
  Sheet.prototype.isRowHiddenByFilter = function (r) { return !!this.hiddenRowsByFilter[r]; };
  Sheet.prototype.isRowHiddenByUser = function () { return false; };
  Sheet.prototype.isColumnHiddenByUser = function () { return false; };
  Sheet.prototype.activate = function () { this.ss.active = this; return this; };
  Sheet.prototype.clear = function () { this.cells = []; this.notes = {}; this.formats = []; this._recount(); return this; };
  Sheet.prototype.clearContents = function () { this.cells = []; this._recount(); return this; };
  Sheet.prototype.getSheetValues = function (r, c, nr, nc) { return this.getRange(r, c, nr, nc).getValues(); };
  Sheet.prototype.appendRow = function (vals) { var r = this.lastRow + 1; for (var j = 0; j < vals.length; j++) this._set(r, j + 1, vals[j]); return this; };
  Sheet.prototype.createTextFinder = function (text) { return this.getDataRange().createTextFinder(text); };

  // ------------------------------------------------------------------ Range
  function Range(sh, r, c, nr, nc) {
    if (!(nr > 0) || !(nc > 0) || !(r > 0) || !(c > 0)) throw new Error('The coordinates or dimensions of the range are invalid (' + [sh.name, r, c, nr, nc].join(', ') + ').');
    this.sh = sh; this.r = r; this.c = c; this.nr = nr; this.nc = nc;
  }
  function makeRange(sh, r, c, nr, nc) { var rg = new Range(sh, r, c, nr, nc); rg._proxy = soft(rg); return rg._proxy; }
  Range.prototype._grid = function (fn) {
    var out = new Array(this.nr);
    for (var i = 0; i < this.nr; i++) { var row = new Array(this.nc); for (var j = 0; j < this.nc; j++) row[j] = fn(this.r + i, this.c + j); out[i] = row; }
    return out;
  };
  Range.prototype.getRow = function () { return this.r; };
  Range.prototype.getColumn = function () { return this.c; };
  Range.prototype.getNumRows = function () { return this.nr; };
  Range.prototype.getNumColumns = function () { return this.nc; };
  Range.prototype.getLastRow = function () { return this.r + this.nr - 1; };
  Range.prototype.getLastColumn = function () { return this.c + this.nc - 1; };
  Range.prototype.getHeight = function () { return this.nr; };
  Range.prototype.getWidth = function () { return this.nc; };
  Range.prototype.getSheet = function () { return this.sh._proxy; };
  Range.prototype.getA1Notation = function () {
    var a = numToCol(this.c) + this.r;
    return (this.nr === 1 && this.nc === 1) ? a : a + ':' + numToCol(this.c + this.nc - 1) + (this.r + this.nr - 1);
  };
  Range.prototype.getCell = function (r, c) { return makeRange(this.sh, this.r + r - 1, this.c + c - 1, 1, 1); };
  Range.prototype.offset = function (dr, dc, nr, nc) { return makeRange(this.sh, this.r + dr, this.c + dc, nr || this.nr, nc || this.nc); };
  Range.prototype.getValues = function () { var sh = this.sh; return this._grid(function (r, c) { return sh._evalCell(r, c); }); };
  Range.prototype.getValue = function () { return this.sh._evalCell(this.r, this.c); };
  Range.prototype.getDisplayValues = function () {
    var sh = this.sh, fmts = sh.formats.length;
    return this._grid(function (r, c) { var v = sh._evalCell(r, c); return displayOf(v, fmts ? sh._formatAt(r, c) : ''); });
  };
  Range.prototype.getDisplayValue = function () { return this.getDisplayValues()[0][0]; };
  Range.prototype.getFormulas = function () { var sh = this.sh; return this._grid(function (r, c) { var v = sh._get(r, c); return (typeof v === 'string' && v.charAt(0) === '=') ? v : ''; }); };
  Range.prototype.getFormula = function () { return this.getFormulas()[0][0]; };
  Range.prototype.getNumberFormats = function () { var sh = this.sh; return this._grid(function (r, c) { return sh._formatAt(r, c) || 'General'; }); };
  Range.prototype.getNumberFormat = function () { return this.getNumberFormats()[0][0]; };
  Range.prototype.getBackgrounds = function () { return this._grid(function () { return '#ffffff'; }); };
  Range.prototype.getBackground = function () { return '#ffffff'; };
  Range.prototype.getFontColors = function () { return this._grid(function () { return '#000000'; }); };
  Range.prototype.getFontWeights = function () { return this._grid(function () { return 'normal'; }); };
  Range.prototype.getNotes = function () { var sh = this.sh; return this._grid(function (r, c) { return sh.notes[r + ':' + c] || ''; }); };
  Range.prototype.getNote = function () { return this.sh.notes[this.r + ':' + this.c] || ''; };
  Range.prototype.isBlank = function () { var sh = this.sh; return this._grid(function (r, c) { return isBlank(sh._get(r, c)); }).every(function (row) { return row.every(Boolean); }); };
  Range.prototype.setValues = function (vals) {
    if (!Array.isArray(vals) || vals.length !== this.nr) throw new Error('The number of rows in the data does not match the number of rows in the range. The data has ' + (vals && vals.length) + ' but the range has ' + this.nr + '.');
    for (var i = 0; i < this.nr; i++) {
      var row = vals[i];
      if (!Array.isArray(row) || row.length !== this.nc) throw new Error('The number of columns in the data does not match the number of columns in the range. The data has ' + (row && row.length) + ' but the range has ' + this.nc + '.');
      for (var j = 0; j < this.nc; j++) this.sh._set(this.r + i, this.c + j, row[j]);
    }
    return this;
  };
  Range.prototype.setValue = function (v) { for (var i = 0; i < this.nr; i++) for (var j = 0; j < this.nc; j++) this.sh._set(this.r + i, this.c + j, v); return this; };
  Range.prototype.setFormulas = function (f) { return this.setValues(f); };
  Range.prototype.setFormula = function (f) { return this.setValue(f); };
  Range.prototype.setFormulaR1C1 = function () { return this; };
  Range.prototype.setNumberFormat = function (fmt) { this.sh._addFormat(this.r, this.c, this.r + this.nr - 1, this.c + this.nc - 1, fmt); return this; };
  Range.prototype.setNumberFormats = function (m) {
    for (var i = 0; i < this.nr; i++) for (var j = 0; j < this.nc; j++) if (m && m[i] && m[i][j] != null) this.sh._addFormat(this.r + i, this.c + j, this.r + i, this.c + j, m[i][j]);
    return this;
  };
  Range.prototype.clearContent = function () {
    var last = Math.min(this.r + this.nr - 1, this.sh.cells.length);
    for (var i = this.r; i <= last; i++) { var row = this.sh.cells[i - 1]; if (!row) continue; for (var j = 0; j < this.nc; j++) if (!isBlank(row[this.c + j - 1])) this.sh._set(i, this.c + j, ''); }
    return this;
  };
  Range.prototype.clear = function (opt) {
    if (!opt || opt.contentsOnly || (!opt.formatOnly && !opt.commentsOnly && !opt.validationsOnly)) this.clearContent();
    if (!opt || opt.formatOnly) this.sh._addFormat(this.r, this.c, this.r + this.nr - 1, this.c + this.nc - 1, '');
    return this;
  };
  Range.prototype.clearFormat = function () { this.sh._addFormat(this.r, this.c, this.r + this.nr - 1, this.c + this.nc - 1, ''); return this; };
  Range.prototype.setNotes = function (n) { for (var i = 0; i < this.nr; i++) for (var j = 0; j < this.nc; j++) { var v = n && n[i] ? n[i][j] : ''; if (v) this.sh.notes[(this.r + i) + ':' + (this.c + j)] = String(v); else delete this.sh.notes[(this.r + i) + ':' + (this.c + j)]; } return this; };
  Range.prototype.setNote = function (n) { for (var i = 0; i < this.nr; i++) for (var j = 0; j < this.nc; j++) { if (n) this.sh.notes[(this.r + i) + ':' + (this.c + j)] = String(n); else delete this.sh.notes[(this.r + i) + ':' + (this.c + j)]; } return this; };
  Range.prototype.clearNote = function () { return this.setNote(''); };
  Range.prototype.getFilter = function () { return this.sh.getFilter(); };
  Range.prototype.createFilter = function () {
    if (this.sh.filter) throw new Error('You can\'t create a filter in a sheet that already has a filter.');
    var sh = this.sh, rg = { r: this.r, c: this.c, nr: this.nr, nc: this.nc };
    var f = {
      criteria: {},
      getRange: function () { return makeRange(sh, rg.r, rg.c, rg.nr, rg.nc); },
      remove: function () { sh.filter = null; sh.hiddenRowsByFilter = {}; },
      getColumnFilterCriteria: function (col) { return f.criteria[col] || null; },
      setColumnFilterCriteria: function (col, crit) { if (crit) f.criteria[col] = crit; else delete f.criteria[col]; return f._proxy; },
      removeColumnFilterCriteria: function (col) { delete f.criteria[col]; return f._proxy; }
    };
    f._proxy = soft(f); sh.filter = f;
    return f._proxy;
  };
  Range.prototype.applyRowBanding = function () { return soft({ getRange: function () { return NOOP; }, remove: function () {} }); };
  Range.prototype.createTextFinder = function (text) {
    var rg = this, opt = { matchCase: false, entire: false, regex: false };
    var tf = {
      matchCase: function (b) { opt.matchCase = !!b; return tf._proxy; },
      matchEntireCell: function (b) { opt.entire = !!b; return tf._proxy; },
      useRegularExpression: function (b) { opt.regex = !!b; return tf._proxy; },
      ignoreDiacritics: function () { return tf._proxy; },
      matchFormulaText: function () { return tf._proxy; },
      findAll: function () {
        var out = [], disp = rg.getDisplayValues(), needle = String(text);
        var re = opt.regex ? new RegExp(opt.entire ? '^(?:' + needle + ')$' : needle, opt.matchCase ? '' : 'i') : null;
        var n2 = opt.matchCase ? needle : needle.toUpperCase();
        for (var i = 0; i < disp.length; i++) for (var j = 0; j < disp[i].length; j++) {
          var s = String(disp[i][j]); if (s === '') continue;
          var hit = re ? re.test(s) : (opt.entire ? (opt.matchCase ? s : s.toUpperCase()) === n2 : (opt.matchCase ? s : s.toUpperCase()).indexOf(n2) >= 0);
          if (hit) out.push(makeRange(rg.sh, rg.r + i, rg.c + j, 1, 1));
        }
        return out;
      },
      findNext: function () { var a = tf.findAll(); return a.length ? a[0] : null; }
    };
    tf._proxy = soft(tf);
    return tf._proxy;
  };

  function makeRangeList(ranges) {
    var rl = {
      getRanges: function () { return ranges.slice(); },
      setNumberFormat: function (fmt) { ranges.forEach(function (r) { r.setNumberFormat(fmt); }); return rl._proxy; },
      clearContent: function () { ranges.forEach(function (r) { r.clearContent(); }); return rl._proxy; },
      setValue: function (v) { ranges.forEach(function (r) { r.setValue(v); }); return rl._proxy; }
    };
    rl._proxy = soft(rl);
    return rl._proxy;
  }

  // ------------------------------------------------------------ Spreadsheet
  function Spreadsheet(events) { this.sheets = []; this.active = null; this.events = events || {}; }
  Spreadsheet.prototype._find = function (n) { n = String(n); for (var i = 0; i < this.sheets.length; i++) if (this.sheets[i].name === n) return this.sheets[i]; return null; };
  Spreadsheet.prototype.getSheetByName = function (n) { var s = this._find(n); return s ? s._proxy : null; };
  Spreadsheet.prototype.insertSheet = function (name, index) {
    if (typeof name === 'number') { index = name; name = 'Sheet' + (this.sheets.length + 1); }
    if (name && typeof name === 'object') name = 'Sheet' + (this.sheets.length + 1);
    name = name || ('Sheet' + (this.sheets.length + 1));
    if (this._find(name)) throw new Error('A sheet with the name "' + name + '" already exists.');
    var s = new Sheet(this, name);
    if (typeof index === 'number' && index >= 0 && index <= this.sheets.length) this.sheets.splice(index, 0, s); else this.sheets.push(s);
    return s._proxy;
  };
  Spreadsheet.prototype.deleteSheet = function (sh) { var n = sh && sh.getName ? sh.getName() : String(sh); this.sheets = this.sheets.filter(function (s) { return s.name !== n; }); return this; };
  Spreadsheet.prototype.getSheets = function () { return this.sheets.map(function (s) { return s._proxy; }); };
  Spreadsheet.prototype.getNumSheets = function () { return this.sheets.length; };
  Spreadsheet.prototype.toast = function (msg, title, secs) { if (this.events.toast) this.events.toast(String(title || ''), String(msg || '')); };
  Spreadsheet.prototype.setActiveSheet = function (s) { this.active = s && s.getName ? this._find(s.getName()) : null; return s; };
  Spreadsheet.prototype.getActiveSheet = function () { var a = this.active || this.sheets[0]; return a ? a._proxy : null; };
  Spreadsheet.prototype.getActiveRange = function () { return null; };
  Spreadsheet.prototype.getId = function () { return 'staff-hub-pos-supplier-merge'; };
  Spreadsheet.prototype.getName = function () { return 'POS Supplier Merge (Staff Hub)'; };
  Spreadsheet.prototype.getUrl = function () { return ''; };
  Spreadsheet.prototype.getSpreadsheetTimeZone = function () { return 'Australia/Melbourne'; };
  Spreadsheet.prototype.getRangeByName = function () { return null; };
  Spreadsheet.prototype.setActiveSelection = function () { return null; };

  // --------------------------------------------------------------- Services
  var DATE_PART_OPTS = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', hourCycle: 'h23' };
  function formatDate(d, tz, pattern) {
    d = d instanceof Date ? d : new Date(d);
    var parts = {};
    try {
      new Intl.DateTimeFormat('en-AU', Object.assign({ timeZone: tz || 'Australia/Melbourne' }, DATE_PART_OPTS)).formatToParts(d).forEach(function (p) { parts[p.type] = p.value; });
    } catch (e) {
      new Intl.DateTimeFormat('en-AU', DATE_PART_OPTS).formatToParts(d).forEach(function (p) { parts[p.type] = p.value; });
    }
    var monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var y = parts.year, M = Number(parts.month), dd = Number(parts.day), H = Number(parts.hour) % 24, mi = parts.minute, s = parts.second;
    var map = {
      yyyy: y, yy: String(y).slice(-2), MMMM: monthsShort[M - 1], MMM: monthsShort[M - 1], MM: ('0' + M).slice(-2), M: String(M),
      dd: ('0' + dd).slice(-2), d: String(dd), HH: ('0' + H).slice(-2), H: String(H), hh: ('0' + ((H % 12) || 12)).slice(-2), h: String((H % 12) || 12),
      mm: mi, ss: s, a: H < 12 ? 'AM' : 'PM', EEE: parts.weekday || '', EEEE: parts.weekday || ''
    };
    return String(pattern || 'yyyy-MM-dd').replace(/yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|hh|h|mm|ss|a|EEEE|EEE|'[^']*'/g, function (t) { return t.charAt(0) === "'" ? t.slice(1, -1) : (map[t] != null ? map[t] : t); });
  }
  function base64Utf8(str) {
    if (typeof Buffer !== 'undefined' && typeof window === 'undefined' && typeof importScripts === 'undefined') return Buffer.from(String(str), 'utf8').toString('base64');
    var bytes = new TextEncoder().encode(String(str)), bin = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }

  function create(opts) {
    opts = opts || {};
    var events = { toast: opts.onToast, alert: opts.onAlert, dialog: opts.onDialog, log: opts.onLog };
    var ss = new Spreadsheet(events);
    ss._proxy = soft(ss);
    var props = {};
    var Button = { OK: 'OK', CANCEL: 'CANCEL', YES: 'YES', NO: 'NO', CLOSE: 'CLOSE' };
    var ui = soft({
      ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL', YES_NO: 'YES_NO', YES_NO_CANCEL: 'YES_NO_CANCEL' },
      Button: Button,
      alert: function (a, b) { var title = b === undefined ? '' : String(a), msg = b === undefined ? String(a) : String(b); if (events.alert) events.alert(title, msg); return Button.OK; },
      prompt: function () { return soft({ getResponseText: function () { return ''; }, getSelectedButton: function () { return Button.CANCEL; } }); },
      showModalDialog: function (html, title) { if (events.dialog) events.dialog(String(title || ''), html && html.getContent ? html.getContent() : ''); },
      showModelessDialog: function (html, title) { if (events.dialog) events.dialog(String(title || ''), html && html.getContent ? html.getContent() : ''); },
      showSidebar: function () {},
      createMenu: function () { return NOOP; }
    });
    function ruleBuilder() { var b = soft({ build: function () { return soft({ getRanges: function () { return []; }, getBooleanCondition: function () { return null; } }); } }); return b; }
    var SpreadsheetApp = soft({
      getActiveSpreadsheet: function () { return ss._proxy; },
      getActive: function () { return ss._proxy; },
      openById: function () { return ss._proxy; },
      getUi: function () { return ui; },
      flush: function () {},
      newConditionalFormatRule: ruleBuilder,
      newDataValidation: ruleBuilder,
      newRichTextValue: function () { return NOOP; },
      newTextStyle: function () { return NOOP; },
      WrapStrategy: { CLIP: 'CLIP', WRAP: 'WRAP', OVERFLOW: 'OVERFLOW' },
      BandingTheme: new Proxy({}, { get: function (t, k) { return String(k); } }),
      BorderStyle: new Proxy({}, { get: function (t, k) { return String(k); } }),
      Dimension: { ROWS: 'ROWS', COLUMNS: 'COLUMNS' },
      Direction: { UP: 'UP', DOWN: 'DOWN', PREVIOUS: 'PREVIOUS', NEXT: 'NEXT' },
      ProtectionType: { RANGE: 'RANGE', SHEET: 'SHEET' }
    });
    var docProps = {
      getProperty: function (k) { return Object.prototype.hasOwnProperty.call(props, k) ? props[k] : null; },
      setProperty: function (k, v) { props[k] = String(v); return docProps; },
      deleteProperty: function (k) { delete props[k]; return docProps; },
      getProperties: function () { return Object.assign({}, props); },
      setProperties: function (o) { Object.keys(o || {}).forEach(function (k) { props[k] = String(o[k]); }); return docProps; },
      deleteAllProperties: function () { props = {}; return docProps; },
      getKeys: function () { return Object.keys(props); }
    };
    var lock = { tryLock: function () { return true; }, waitLock: function () {}, releaseLock: function () {}, hasLock: function () { return true; } };
    var cache = { get: function () { return null; }, put: function () {}, remove: function () {}, getAll: function () { return {}; }, putAll: function () {}, removeAll: function () {} };
    var services = {
      SpreadsheetApp: SpreadsheetApp,
      PropertiesService: { getDocumentProperties: function () { return docProps; }, getScriptProperties: function () { return docProps; }, getUserProperties: function () { return docProps; } },
      LockService: { getDocumentLock: function () { return lock; }, getScriptLock: function () { return lock; }, getUserLock: function () { return lock; } },
      CacheService: { getDocumentCache: function () { return cache; }, getScriptCache: function () { return cache; }, getUserCache: function () { return cache; } },
      Utilities: {
        formatDate: formatDate,
        base64Encode: function (s) { return base64Utf8(s); },
        base64EncodeWebSafe: function (s) { return base64Utf8(s).replace(/\+/g, '-').replace(/\//g, '_'); },
        Charset: { UTF_8: 'UTF_8', US_ASCII: 'US_ASCII' },
        sleep: function () {},
        getUuid: function () { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (ch) { var r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16); }); },
        DigestAlgorithm: { MD5: 'MD5', SHA_256: 'SHA_256' },
        computeDigest: function (alg, s) { var h = 0, str = String(s); for (var i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; } return [h & 255, (h >> 8) & 255, (h >> 16) & 255, (h >> 24) & 255]; }
      },
      Session: { getScriptTimeZone: function () { return 'Australia/Melbourne'; }, getActiveUser: function () { return { getEmail: function () { return ''; } }; }, getEffectiveUser: function () { return { getEmail: function () { return ''; } }; }, getTemporaryActiveUserKey: function () { return 'staff-hub'; } },
      HtmlService: {
        createHtmlOutput: function (h) {
          var html = String(h == null ? '' : h);
          var o = { getContent: function () { return html; }, append: function (s) { html += String(s); return o._p; }, setContent: function (s) { html = String(s); return o._p; } };
          o._p = soft(o); return o._p;
        },
        SandboxMode: { IFRAME: 'IFRAME', NATIVE: 'NATIVE' },
        XFrameOptionsMode: { ALLOWALL: 'ALLOWALL', DEFAULT: 'DEFAULT' }
      },
      Logger: { log: function (m) { if (events.log) events.log(String(m)); }, clear: function () {}, getLog: function () { return ''; } }
    };
    return {
      services: services,
      ss: ss,
      install: function (target) { Object.keys(services).forEach(function (k) { target[k] = services[k]; }); return target; },
      // Adds a sheet built from a 2-D array (row 1 first). Blank cells are skipped.
      addSheet: function (name, rows) {
        var existing = ss._find(name); if (existing) ss.sheets.splice(ss.sheets.indexOf(existing), 1);
        var s = new Sheet(ss, name);
        for (var i = 0; i < rows.length; i++) { var row = rows[i] || []; for (var j = 0; j < row.length; j++) if (!isBlank(row[j])) s._set(i + 1, j + 1, row[j]); }
        s.maxRows = Math.max(s.maxRows, rows.length + 5); s.maxCols = Math.max(s.maxCols, s.lastCol);
        ss.sheets.push(s);
        return s;
      },
      // Display values for rows 1..lastRow of a sheet (or null when it does not exist).
      sheetDisplay: function (name, maxCols) {
        var s = ss._find(name); if (!s) return null;
        var lr = s.getLastRow(), lc = Math.max(s.getLastColumn(), maxCols || 0);
        if (!lr || !lc) return [];
        return new Range(s, 1, 1, lr, lc).getDisplayValues();
      },
      sheetNotes: function (name) { var s = ss._find(name); return s ? Object.assign({}, s.notes) : {}; },
      properties: function () { return Object.assign({}, props); }
    };
  }

  root.PHFSheetsShim = { create: create, displayOf: displayOf, parseA1: parseA1 };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PHFSheetsShim;
})(typeof self !== 'undefined' ? self : this);
