/* XlsxLite v1.0.0 — small streaming .xlsx writer for large styled sheets.
   Runs entirely in the browser: rows are turned into worksheet XML in batches and compressed with the
   browser's built-in CompressionStream, so 38k-row x 150-column masters are written in seconds without
   holding millions of cell objects in memory. Output opens in Excel, LibreOffice, Google Sheets,
   openpyxl and SheetJS. No data leaves the browser. */
(function (global) {
  'use strict';

  const encoder = new TextEncoder();
  const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const BUILTIN_NUMFMT = { 'General': 0, '0': 1, '0.00': 2, '#,##0': 3, '#,##0.00': 4, '0%': 9, '0.00%': 10, '@': 49 };

  // ---------- CRC32 ----------
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crcUpdate(crc, bytes) {
    let c = crc;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return c >>> 0;
  }

  // ---------- XML helpers ----------
  const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
  function esc(value) {
    return String(value).replace(INVALID_XML, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function colLetter(n) {
    let s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  function parseRef(ref) {
    const m = /^([A-Z]+)(\d+)$/.exec(ref);
    if (!m) return { col: 1, row: 1 };
    let col = 0;
    for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
    return { col, row: Number(m[2]) };
  }

  // ---------- Compression (deflate-raw → deflate → store) ----------
  let deflateMode = null;
  function detectDeflate() {
    if (deflateMode) return deflateMode;
    deflateMode = 'store';
    if (typeof CompressionStream === 'function') {
      try { new CompressionStream('deflate-raw'); deflateMode = 'raw'; }
      catch (e) { try { new CompressionStream('deflate'); deflateMode = 'zlib'; } catch (e2) { deflateMode = 'store'; } }
    }
    return deflateMode;
  }

  async function compressEntry(produce) {
    const mode = detectDeflate();
    let crc = 0xFFFFFFFF, size = 0;
    if (mode === 'store') {
      const parts = [];
      await produce(chunk => { crc = crcUpdate(crc, chunk); size += chunk.length; parts.push(chunk); });
      return { parts, csize: size, size, crc: (crc ^ 0xFFFFFFFF) >>> 0, method: 0 };
    }
    const cs = new CompressionStream(mode === 'raw' ? 'deflate-raw' : 'deflate');
    const writer = cs.writable.getWriter();
    const out = [];
    let outLen = 0;
    const reading = (async () => {
      const reader = cs.readable.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        out.push(value); outLen += value.length;
      }
    })();
    await produce(async chunk => { crc = crcUpdate(crc, chunk); size += chunk.length; await writer.write(chunk); });
    await writer.close();
    await reading;
    let parts = out, csize = outLen;
    if (mode === 'zlib') {
      // Strip the 2-byte zlib header and 4-byte Adler-32 trailer to leave a raw deflate stream.
      const all = new Uint8Array(outLen);
      let o = 0;
      for (const p of out) { all.set(p, o); o += p.length; }
      const raw = all.subarray(2, all.length - 4);
      parts = [raw]; csize = raw.length;
    }
    return { parts, csize, size, crc: (crc ^ 0xFFFFFFFF) >>> 0, method: 8 };
  }

  // ---------- ZIP container ----------
  function dosDateTime(d) {
    const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((Math.floor(d.getSeconds() / 2)) & 31);
    const date = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
    return { time, date };
  }
  class ZipBuilder {
    constructor() { this.parts = []; this.central = []; this.offset = 0; this.stamp = dosDateTime(new Date()); }
    async add(name, produce) {
      const nameBytes = encoder.encode(name);
      const e = await compressEntry(produce);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
      h.setUint16(8, e.method, true); h.setUint16(10, this.stamp.time, true); h.setUint16(12, this.stamp.date, true);
      h.setUint32(14, e.crc, true); h.setUint32(18, e.csize, true); h.setUint32(22, e.size, true);
      h.setUint16(26, nameBytes.length, true); h.setUint16(28, 0, true);
      this.parts.push(new Uint8Array(h.buffer), nameBytes, ...e.parts);
      this.central.push({ nameBytes, e, offset: this.offset });
      this.offset += 30 + nameBytes.length + e.csize;
    }
    async addText(name, text) { await this.add(name, async push => { await push(encoder.encode(text)); }); }
    finish(mime) {
      let cdSize = 0;
      const cdParts = [];
      for (const c of this.central) {
        const h = new DataView(new ArrayBuffer(46));
        h.setUint32(0, 0x02014b50, true); h.setUint16(4, 20, true); h.setUint16(6, 20, true); h.setUint16(8, 0x0800, true);
        h.setUint16(10, c.e.method, true); h.setUint16(12, this.stamp.time, true); h.setUint16(14, this.stamp.date, true);
        h.setUint32(16, c.e.crc, true); h.setUint32(20, c.e.csize, true); h.setUint32(24, c.e.size, true);
        h.setUint16(28, c.nameBytes.length, true); h.setUint16(30, 0, true); h.setUint16(32, 0, true);
        h.setUint16(34, 0, true); h.setUint16(36, 0, true); h.setUint32(38, 0, true); h.setUint32(42, c.offset, true);
        cdParts.push(new Uint8Array(h.buffer), c.nameBytes);
        cdSize += 46 + c.nameBytes.length;
      }
      const end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true); end.setUint16(4, 0, true); end.setUint16(6, 0, true);
      end.setUint16(8, this.central.length, true); end.setUint16(10, this.central.length, true);
      end.setUint32(12, cdSize, true); end.setUint32(16, this.offset, true); end.setUint16(20, 0, true);
      return new Blob([...this.parts, ...cdParts, new Uint8Array(end.buffer)], { type: mime });
    }
  }

  // ---------- Styles ----------
  class StyleSheet {
    constructor() {
      this.fonts = ['<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/></font>'];
      this.fontKeys = new Map([['default', 0]]);
      this.fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
      this.fillKeys = new Map();
      this.borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
      this.borderKeys = new Map([['none', 0]]);
      this.numFmts = [];
      this.numFmtKeys = new Map();
      this.xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
      this.xfKeys = new Map([['0|0|0|0|', 0]]);
      this.dxfs = [];
    }
    font(f) {
      if (!f) return 0;
      const key = JSON.stringify(f);
      if (this.fontKeys.has(key)) return this.fontKeys.get(key);
      let x = '<font>';
      if (f.bold) x += '<b/>';
      if (f.italic) x += '<i/>';
      x += `<sz val="${f.size || 11}"/>`;
      x += `<color rgb="FF${f.color || '000000'}"/>`;
      x += '<name val="Calibri"/><family val="2"/></font>';
      this.fonts.push(x);
      this.fontKeys.set(key, this.fonts.length - 1);
      return this.fonts.length - 1;
    }
    fill(rgb) {
      if (!rgb) return 0;
      if (this.fillKeys.has(rgb)) return this.fillKeys.get(rgb);
      this.fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor rgb="FF${rgb}"/></patternFill></fill>`);
      this.fillKeys.set(rgb, this.fills.length - 1);
      return this.fills.length - 1;
    }
    border(b) {
      if (!b) return 0;
      const key = JSON.stringify(b);
      if (this.borderKeys.has(key)) return this.borderKeys.get(key);
      const side = (name, s) => s ? `<${name} style="${s.style}"><color rgb="FF${s.color || '000000'}"/></${name}>` : `<${name}/>`;
      this.borders.push(`<border>${side('left', b.left)}${side('right', b.right)}${side('top', b.top)}${side('bottom', b.bottom)}<diagonal/></border>`);
      this.borderKeys.set(key, this.borders.length - 1);
      return this.borders.length - 1;
    }
    numFmt(code) {
      if (!code || code === 'General') return 0;
      if (Object.prototype.hasOwnProperty.call(BUILTIN_NUMFMT, code)) return BUILTIN_NUMFMT[code];
      if (this.numFmtKeys.has(code)) return this.numFmtKeys.get(code);
      const id = 164 + this.numFmts.length;
      this.numFmts.push(`<numFmt numFmtId="${id}" formatCode="${esc(code)}"/>`);
      this.numFmtKeys.set(code, id);
      return id;
    }
    // spec: {font:{bold,size,color}, fill:'RRGGBB', numFmt:'0.00', align:{h,v,wrap,indent,shrink}, border:{top:{style,color}}}
    style(spec) {
      spec = spec || {};
      const fontId = this.font(spec.font), fillId = this.fill(spec.fill), borderId = this.border(spec.border), numFmtId = this.numFmt(spec.numFmt);
      const a = spec.align || null;
      const alignKey = a ? JSON.stringify(a) : '';
      const key = `${numFmtId}|${fontId}|${fillId}|${borderId}|${alignKey}`;
      if (this.xfKeys.has(key)) return this.xfKeys.get(key);
      let x = `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"`;
      if (numFmtId) x += ' applyNumberFormat="1"';
      if (fontId) x += ' applyFont="1"';
      if (fillId) x += ' applyFill="1"';
      if (borderId) x += ' applyBorder="1"';
      if (a) {
        let al = '<alignment';
        if (a.h) al += ` horizontal="${a.h}"`;
        if (a.v) al += ` vertical="${a.v}"`;
        if (a.wrap !== undefined) al += ` wrapText="${a.wrap ? 1 : 0}"`;
        if (a.shrink !== undefined) al += ` shrinkToFit="${a.shrink ? 1 : 0}"`;
        if (a.indent) al += ` indent="${a.indent}"`;
        al += '/>';
        x += ` applyAlignment="1">${al}</xf>`;
      } else {
        x += '/>';
      }
      this.xfs.push(x);
      this.xfKeys.set(key, this.xfs.length - 1);
      return this.xfs.length - 1;
    }
    dxf(spec) {
      let x = '<dxf>';
      if (spec.font) x += `<font>${spec.font.bold ? '<b/>' : ''}${spec.font.color ? `<color rgb="FF${spec.font.color}"/>` : ''}</font>`;
      if (spec.fill) x += `<fill><patternFill patternType="solid"><fgColor rgb="FF${spec.fill}"/><bgColor rgb="FF${spec.fill}"/></patternFill></fill>`;
      x += '</dxf>';
      this.dxfs.push(x);
      return this.dxfs.length - 1;
    }
    xml() {
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        `<styleSheet xmlns="${MAIN_NS}">` +
        (this.numFmts.length ? `<numFmts count="${this.numFmts.length}">${this.numFmts.join('')}</numFmts>` : '') +
        `<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts>` +
        `<fills count="${this.fills.length}">${this.fills.join('')}</fills>` +
        `<borders count="${this.borders.length}">${this.borders.join('')}</borders>` +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>` +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        `<dxfs count="${this.dxfs.length}">${this.dxfs.join('')}</dxfs>` +
        '<tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>' +
        '</styleSheet>';
    }
  }

  // ---------- Cells ----------
  function cellXml(ref, value, s) {
    const sAttr = s ? ` s="${s}"` : '';
    if (value === null || value === undefined || value === '') return s ? `<c r="${ref}"${sAttr}/>` : '';
    const t = typeof value;
    if (t === 'number') {
      if (!Number.isFinite(value)) return s ? `<c r="${ref}"${sAttr}/>` : '';
      // 16 significant digits, the same as openpyxl ("%.16g"), so 11.000000000000002 is stored as 11.
      const num = Number.isInteger(value) ? value : Number(value.toPrecision(16));
      return `<c r="${ref}"${sAttr}><v>${num}</v></c>`;
    }
    if (t === 'boolean') return `<c r="${ref}"${sAttr} t="b"><v>${value ? 1 : 0}</v></c>`;
    if (t === 'object' && value.formula) return `<c r="${ref}"${sAttr}><f>${esc(value.formula)}</f></c>`;
    if (value instanceof Date) return `<c r="${ref}"${sAttr} t="inlineStr"><is><t>${esc(value.toISOString())}</t></is></c>`;
    let text = String(value);
    if (text.length > 32767) text = text.slice(0, 32767); // Excel's cell text limit
    const space = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
    return `<c r="${ref}"${sAttr} t="inlineStr"><is><t${space}>${esc(text)}</t></is></c>`;
  }

  // ---------- Workbook ----------
  /* sheet = {
       name, columnCount, widths:[...], freeze:'I2', autoFilter:'A1:Z100', defaultRowHeight,
       rows: function* () { yield {cells:[value...], styles:[styleId...]|styleId, height} },
       conditional: [{ref:'A2:X2', formula:'...', dxf:id}]
     } */
  async function writeWorkbook(sheets, styles, opts) {
    opts = opts || {};
    const zip = new ZipBuilder();
    const yieldEvery = opts.yieldEvery || 1500;
    const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '</Types>';
    await zip.addText('[Content_Types].xml', contentTypes);
    await zip.addText('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      `<Relationships xmlns="${PKG_REL_NS}">` +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      '</Relationships>');
    const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    await zip.addText('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      `<dc:creator>Prahran Health Foods Staff Hub</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>` +
      '</cp:coreProperties>');
    await zip.addText('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>');
    const definedNames = [];
    await zip.addText('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      `<Relationships xmlns="${PKG_REL_NS}">` +
      sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>');

    for (let si = 0; si < sheets.length; si++) {
      const sh = sheets[si];
      const cols = sh.columnCount;
      const letters = [''];
      for (let c = 1; c <= cols; c++) letters.push(colLetter(c));
      let rowCount = 0;
      await zip.add(`xl/worksheets/sheet${si + 1}.xml`, async push => {
        let head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
          `<worksheet xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">`;
        if (sh.dimension) head += `<dimension ref="${sh.dimension}"/>`;
        head += '<sheetViews><sheetView workbookViewId="0"' + (si === 0 ? ' tabSelected="1"' : '') + '>';
        if (sh.freeze) {
          const p = parseRef(sh.freeze), xs = p.col - 1, ys = p.row - 1;
          if (xs > 0 || ys > 0) {
            const pane = xs > 0 && ys > 0 ? 'bottomRight' : (xs > 0 ? 'topRight' : 'bottomLeft');
            head += `<pane${xs > 0 ? ` xSplit="${xs}"` : ''}${ys > 0 ? ` ySplit="${ys}"` : ''} topLeftCell="${sh.freeze}" activePane="${pane}" state="frozen"/>`;
            if (xs > 0 && ys > 0) head += '<selection pane="topRight"/><selection pane="bottomLeft"/>';
            head += `<selection pane="${pane}" activeCell="${sh.freeze}" sqref="${sh.freeze}"/>`;
          }
        }
        head += '</sheetView></sheetViews>';
        head += `<sheetFormatPr defaultRowHeight="${sh.defaultRowHeight || 15}"/>`;
        if (sh.widths && sh.widths.length) {
          head += '<cols>' + sh.widths.map((w, i) => w ? `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>` : '').join('') + '</cols>';
        }
        head += '<sheetData>';
        await push(encoder.encode(head));
        let buf = [];
        let r = 0;
        for (const row of sh.rows()) {
          r++;
          const cells = row.cells, st = row.styles;
          const fixedStyle = typeof st === 'number' ? st : null;
          let x = `<row r="${r}"` + (row.height ? ` ht="${row.height}" customHeight="1"` : '') + '>';
          for (let c = 0; c < cols; c++) {
            const s = fixedStyle !== null ? fixedStyle : (st ? st[c] || 0 : 0);
            x += cellXml(letters[c + 1] + r, cells[c], s);
          }
          x += '</row>';
          buf.push(x);
          if (buf.length >= 400) {
            await push(encoder.encode(buf.join('')));
            buf = [];
          }
          if (r % yieldEvery === 0) {
            if (onProgress) onProgress(sh.name, r);
            await new Promise(res => setTimeout(res, 0));
          }
        }
        rowCount = r;
        let tail = buf.join('') + '</sheetData>';
        if (sh.autoFilter) tail += `<autoFilter ref="${sh.autoFilter}"/>`;
        if (sh.conditional && sh.conditional.length) {
          let prio = 1;
          for (const cf of sh.conditional) {
            tail += `<conditionalFormatting sqref="${cf.ref}"><cfRule type="expression" dxfId="${cf.dxf}" priority="${prio++}"><formula>${esc(cf.formula)}</formula></cfRule></conditionalFormatting>`;
          }
        }
        tail += '<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/></worksheet>';
        await push(encoder.encode(tail));
      });
      if (sh.autoFilter) {
        const [a, b] = sh.autoFilter.split(':');
        const pa = parseRef(a), pb = parseRef(b || a);
        definedNames.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${si}" hidden="1">'${esc(sh.name.replace(/'/g, "''"))}'!$${colLetter(pa.col)}$${pa.row}:$${colLetter(pb.col)}$${pb.row}</definedName>`);
      }
      sh.writtenRows = rowCount;
    }

    await zip.addText('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      `<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">` +
      '<workbookPr/><bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
      sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
      '</sheets>' + (definedNames.length ? `<definedNames>${definedNames.join('')}</definedNames>` : '') +
      '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
    await zip.addText('xl/styles.xml', styles.xml());
    return zip.finish('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  const api = { StyleSheet, writeWorkbook, colLetter, compressionMode: detectDeflate, _crcUpdate: crcUpdate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.XlsxLite = api;
})(typeof window !== 'undefined' ? window : globalThis);
