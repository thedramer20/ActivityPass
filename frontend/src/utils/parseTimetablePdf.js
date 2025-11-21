/// <reference path="./parseTimetablePdf.d.ts" />
// PDF timetable parser for ZJNU format (client-side, reusable)
// This module extracts course data from a timetable PDF (EN/CN) using pdf.js and returns a normalized array of course objects.
// It is designed for use in both admin and student upload flows.

// Dependencies: pdfjs-dist (npm install pdfjs-dist)
// Usage: import { parseTimetablePdf } from './parseTimetablePdf';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Use Vite's asset import to get a resolvable worker URL
// pdfjs-dist ships ESM worker files with .mjs extension; import the .mjs worker URL for Vite
// In Node, use the local path
let PDF_CMAP_URL = '/cmaps/';
let PDF_CMAP_PACKED = true;

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  PDF_CMAP_URL = '/cmaps/';
  PDF_CMAP_PACKED = true;
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.cMapUrl = PDF_CMAP_URL;
    pdfjsLib.GlobalWorkerOptions.cMapPacked = PDF_CMAP_PACKED;
  }
}

/**
 * Extracts course data from a ZJNU timetable PDF (English or Chinese).
 * @param {File|ArrayBuffer} pdfFile - The PDF file or ArrayBuffer.
 * @returns {Promise<{ courses: any[], student: { id?: string, name?: string }, term?: string, isChinese: boolean }>} Parsed data.
 */
export async function parseTimetablePdf(pdfFile) {
  // Load PDF
  let pdfData;
  if (typeof Buffer !== 'undefined' && pdfFile instanceof Buffer) {
    pdfData = pdfFile;
  } else if (pdfFile instanceof File) {
    pdfData = await pdfFile.arrayBuffer();
  } else {
    pdfData = pdfFile;
  }
  const pdf = await pdfjsLib.getDocument({ data: pdfData, cMapUrl: PDF_CMAP_URL, cMapPacked: PDF_CMAP_PACKED }).promise;

  // Extract text and text-items from all pages
  const pages = [];
  const pagesItems = [];
  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1);
    const content = await page.getTextContent();
    // Normalize items to provide x/y coordinates (pdf.js may expose transform)
    const items = (content.items || []).map(it => {
      const x = (it.transform && it.transform.length >= 5) ? it.transform[4] : (it.x || 0);
      const y = (it.transform && it.transform.length >= 6) ? it.transform[5] : (it.y || 0);
      return Object.assign({}, it, { x, y });
    });
    pagesItems.push(items);
    const text = items.map(item => item.str).join('\n');
    pages.push(text);
  }
  const fullText = pages.join('\n');

  // Debug: log PDF extraction summary to help diagnose empty results
  try {
    // eslint-disable-next-line no-console
    console.debug('[parseTimetablePdf] extracted', { numPages: pdf.numPages, textLength: fullText.length, sampleText: fullText.slice(0, 500) });
  } catch (e) {}

  // Detect language (Chinese or English)
  const isChinese = /课程表|学号|教师|周一|周二|周三|周四|周五|周六|周日/.test(fullText);

  // Extract student info (ID, name)
  let student = { id: undefined, name: undefined };
  if (isChinese) {
    const idMatch = fullText.match(/学号[:：]?\s*([A-Za-z0-9]+)/);
    const nameMatch = fullText.match(/姓名[:：]?\s*([\u4e00-\u9fa5A-Za-z]+)/);
    if (idMatch) student.id = idMatch[1];
    if (nameMatch) student.name = nameMatch[1];
  } else {
    const idMatch = fullText.match(/Student ID[:：]?\s*([A-Za-z0-9]+)/);
    const nameMatch = fullText.match(/Name[:：]?\s*([A-Za-z0-9 ]+)/);
    if (idMatch) student.id = idMatch[1];
    if (nameMatch) student.name = nameMatch[1];
  }

  // Extract term (from filename or content)
  let term = undefined;
  const termMatch = fullText.match(/(\d{4}-\d{4}-\d)/);
  if (termMatch) term = termMatch[1];

  // Helper: parse weeks like "1,2,3-5,7" and Chinese commas
  function parseWeeks(weeksText) {
    if (!weeksText) return [];
    weeksText = String(weeksText).replace(/，/g, ',');
    const weeks = new Set();
    for (const part of weeksText.split(',')) {
      const p = part.trim();
      if (!p) continue;
      const m = p.match(/^(\d+)-(\d+)$/);
      if (m) {
        const a = parseInt(m[1], 10);
        const b = parseInt(m[2], 10);
        for (let x = a; x <= b; x++) weeks.add(x);
      } else if (/^\d+$/.test(p)) {
        weeks.add(parseInt(p, 10));
      }
    }
    return Array.from(weeks).sort((a, b) => a - b);
  }

  // Helper: decode common HTML entities (used when pdf text contains &amp; etc.)
  function decodeHtmlEntities(str) {
    if (!str) return str;
    try {
      // Prefer DOM decode in browser
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const txt = document.createElement('textarea');
        txt.innerHTML = String(str);
        return txt.value;
      }
    } catch (e) {}
    // Fallback simple replacements
    return String(str)
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // Helper: split text into blocks that start with a type marker (△★▲☆)
  function splitBlocksByMarker(text) {
    const t = String(text || '');
    const markers = [...t.matchAll(/[△★▲☆]/g)].map(m => m.index).filter(i => typeof i === 'number');
    if (!markers.length) return [];
    const blocks = [];
    let last = 0;
    for (const pos of markers) {
      const seg = t.slice(last, pos + 1).trim();
      if (seg) blocks.push(seg);
      last = pos + 1;
    }
    const remaining = t.slice(last).trim();
    if (remaining) blocks.push(remaining);
    return blocks;
  }

  // Helper: parse a single block of text (one course entry)
  function parseBlockText(blockText) {
    const txt = String(blockText || '').trim();
    if (!txt) return null;
    const compact = txt.replace(/\s*\n\s*/g, ' ');
    // Find marker position in original text
    const markerMatch = txt.match(/[△★▲☆]/);
    if (!markerMatch) return null;
    // Split into lines and find marker line index
    const lines = txt.split(/\r?\n/).map(l => (l || '').trim());
    let markerLineIdx = lines.findIndex(ln => /[△★▲☆]/.test(ln));
    if (markerLineIdx < 0) markerLineIdx = 0;

    function isMetaLine(ln) {
      if (!ln) return false;
      if (/\(\d+(?:-\d+)?\s*Section\)|Week\b|(Campus|Area)[:：]|Teacher[s]?:/i.test(ln)) return true;
      if (/\(\d+(?:-\d+)?\s*节\)|第\s*[0-9,\-\s]+\s*周/.test(ln)) return true;
      if (/(校区|教学区|地点|上课地点|场地|任课教师|教师|老师)[:：]/.test(ln)) return true;
      if (/^(The class|The makeup of the class|Class selection remarks|Course\s*hours|Week\s*period|Credit)[:：]/i.test(ln)) return true;
      if (/^(?:Week\s*)?period\s*[:：]/i.test(ln)) return true;
      if (/^hours\s*[:：]/i.test(ln)) return true;
      if (/^\d+(\s*\d+)*$/.test(ln)) return true;
      return false;
    }

    // Collect name from non-meta lines before meta starts
    let nameParts = [];
    let metaStarted = false;
    let typeChar = '';
    for (let k = 0; k < lines.length; k++) {
      const ln = lines[k];
      if (isMetaLine(ln)) {
        metaStarted = true;
        continue;
      }
      if (metaStarted) continue;
      if (/[△★▲☆]/.test(ln)) {
        if (!typeChar) {
          const m = ln.match(/[△★▲☆]/);
          typeChar = m ? m[0] : '';
        }
        nameParts.push(ln.replace(/[△★▲☆]/g, '').trim());
      } else {
        nameParts.push(ln);
      }
    }
    let nameRaw = nameParts.filter(p => p.trim()).join(' ').trim();
    nameRaw = nameRaw.replace(/^Morning\s+/, '').replace(/^Afternoon\s+/, '').replace(/^Evening\s+/, '');

    // Periods
    let periods = [];
    let secm = compact.match(/\((\d+)(?:-(\d+))?\s*Section\)/i) || compact.match(/\((\d+)(?:-(\d+))?\s*节\)/) || compact.match(/sections?\s*[=:]\s*(\d+)(?:-(\d+))?/i);
    if (secm) {
      const a = parseInt(secm[1], 10);
      const b = secm[2] ? parseInt(secm[2], 10) : a;
      for (let k = a; k <= b; k++) periods.push(k);
    }

    // Weeks
    let weeks = [];
    const w1 = compact.match(/Week\s*[=:]\s*([0-9,\-\s]+)/i);
    const w2 = compact.match(/第\s*([0-9,，\-\s]+)\s*周/);
    if (w1) weeks = parseWeeks(w1[1].replace(/\s+/g, ''));
    else if (w2) weeks = parseWeeks(w2[1].replace(/\s+/g, ''));
    else {
      const w3 = compact.match(/([0-9]{1,2}(?:[,-][0-9]{1,2})?(?:,[0-9]{1,2})*)/);
      if (w3) weeks = parseWeeks(w3[1]);
    }

    // Location
    let location = '';
    const qq = compact.match(/课程QQ群号[:：]?\s*(\d+)/);
    if (qq) location = `Online ${qq[1]}`;
    else {
      const atMatch = compact.match(/@([^\n]+?)(?:\||$)/);
      if (atMatch) location = atMatch[1].trim();
      else {
        const areaMatch = compact.match(/Area:([^\n]+)/i);
        if (areaMatch) location = areaMatch[1].trim();
        else {
          const campusMatch = compact.match(/Campus:([^\n]+)/i);
          if (campusMatch) location = campusMatch[1].trim();
        }
      }
    }
    if (!location) {
      const campus = compact.match(/(校区|教学区)[:：]?\s*([^/;]+)/);
      const place = compact.match(/(场地|地点|上课地点)[:：]?\s*([^/;]+)/);
      if (campus && place) location = (place[2] || '').trim();
      else if (place) location = (place[2] || '').trim();
      else if (campus) location = (campus[2] || '').trim();
    }
    if (location && (/未排|未定/.test(location))) location = '未定';
    if (location) {
      location = location.replace(/\s*-\s*/g, '-').replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2');
    }
    // If Campus/Area and Teachers markers exist, capture multi-line between them
    if (/Teachers?:/i.test(txt) && /Campus\/Area:/i.test(txt)) {
      const mfull = txt.match(/Campus\/Area:\s*([\s\S]*?)\/?Teachers?:/i);
      if (mfull && mfull[1]) location = mfull[1].replace(/\s*\n\s*/g, ' ').trim();
    }

    // Teacher extraction with continuation
    let teacher = '';
    function isProbableNameLineCN(ln) {
      if (!ln) return false;
      if (!/[\u4e00-\u9fff]/.test(ln)) return false;
      if (/(周|节|校区|地点|场地|上课地点|实验|理论|技术|实践)/.test(ln)) return false;
      return /^[\u4e00-\u9fff.\s]{2,16}$/.test(ln);
    }
    function isProbableNameLineEN(ln) {
      if (!ln || /[0-9:/-]/.test(ln)) return false;
      if (!/^[A-Za-z.'\s]{2,40}$/.test(ln)) return false;
      const tokens = ln.split(/\s+/);
      if (tokens.length > 4) return false;
      if (/\b(Project|Security|Design|Software|Training|College|Physical|China|Communication|National|Analysis|Specification|Quality|Assurance|Testing)\b/i.test(ln)) return false;
      return true;
    }
    // Search for explicit teacher label lines first
    for (let idx = 0; idx < lines.length; idx++) {
      const ln = lines[idx];
      const m = ln.match(/(Teacher[s]?|任课教师|教师|老师)\s*[:：]\s*(.+)$/);
      if (m) {
        teacher = (m[2] || '').trim();
        // continuation lines
        const cont = [];
        let k = idx + 1;
        while (k < lines.length && cont.length < 2) {
          const nxt = (lines[k] || '').trim();
          if (!nxt) break;
          if (/^(The class|The makeup of the class|Class selection remarks|Course\s*hours|Week\s*period|Credit)[:：]/i.test(nxt)) break;
          const cleaned = nxt.split(/[|/;]|\b(The class|The makeup of the class|Class selection remarks|Course\s*hours|Week\s*period|Credit)\b/i)[0].trim();
          if ((isProbableNameLineCN(cleaned) || isProbableNameLineEN(cleaned)) && !/[△★▲☆]/.test(cleaned)) { cont.push(cleaned); k++; continue; }
          break;
        }
        if (cont.length) teacher = (teacher + ' ' + cont.join(' ')).trim();
        break;
      }
    }
    // Fallback: infer teacher from trailing plausible name line
    if (!teacher) {
      const pipeMatch = compact.match(/\|([^\n]+)/);
      if (pipeMatch) teacher = pipeMatch[1].trim();
      else {
        for (let ii = lines.length - 1; ii >= 0; ii--) {
          const lns = (lines[ii] || '').trim();
          if (!lns) continue;
          if (/[△★▲☆]|周|节|校区|地点|场地|上课地点|实验|理论|技术|实践|Campus|Area|Teacher|Week|Credit/i.test(lns)) continue;
          if (isProbableNameLineCN(lns) || isProbableNameLineEN(lns)) { teacher = lns; break; }
        }
      }
    }
    if (teacher) {
      teacher = teacher.replace(/\s*[|/;].*$/, '').trim();
      teacher = teacher.replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2');
      if (!/[\u4e00-\u9fff]/.test(teacher) && !/\s/.test(teacher)) {
        const parts = teacher.match(/[A-Z][a-z]*|[A-Z]+(?![a-z])|[a-z]+/g);
        if (parts && parts.length >= 2) teacher = parts.join(' ');
      }
      // remove teacher leak from name
      if (nameRaw.endsWith(teacher)) nameRaw = nameRaw.slice(0, -teacher.length).trim();
      else if (nameRaw.includes(teacher)) nameRaw = nameRaw.replace(teacher, '').trim();
    }

    let courseName = nameRaw || '';
    if (!courseName) courseName = compact.split(/[△★▲☆]/)[0].trim();
    return {
      name: courseName || undefined,
      periods,
      weeks,
      location: location || undefined,
      teacher: teacher || undefined,
      type: (typeChar && { '△': 'Theory', '★': 'Technical', '▲': 'Practice', '☆': 'Experiment' }[typeChar]) || undefined,
      type_char: typeChar || undefined,
      raw: txt,
    };
  }

  // Ported: extract outside-table courses from pre-table metadata
  function extractOutsideCoursesFromText(text) {
    const out = [];
    const lines = String(text || '').split(/\r?\n/).map(l => (l || '').trim()).filter(Boolean);
    for (const line of lines) {
      const t = line.replace(/：/g, ':').replace(/（/g, '(').replace(/）/g, ')').replace(/；/g, ';');
      const m = t.match(/^(.*?)([△★▲☆])/);
      if (!m) continue;
      let base = (m[1] || '').trim();
      base = base.replace(/^(Practice course|Practical course|Other courses|实践课程|其它课程|其他课程)[:：]\s*/i, '');
      base = base.replace(/\(total\s*\d+\s*week\)\s*/i, '').replace(/\(共\s*\d+\s*周\)\s*/, '');
      const typeChar = m[2];
      // teacher after marker
      let teacher = '';
      const mteach = t.match(/[△★▲☆]\s*([A-Za-z\u4e00-\u9fff][A-Za-z\u4e00-\u9fff\s]{0,30}?)(?=\(|\/|Week|周|;|$)/);
      if (mteach) teacher = (mteach[1] || '').trim();
      // weeks
      let weeks = [];
      const w1 = t.match(/Week[:\s]*([0-9,\-\s]+)/i);
      if (w1) weeks = parseWeeks(w1[1].replace(/\s+/g, ''));
      else {
        const wcn = t.match(/第\s*([0-9,\-\s]+)\s*周/);
        if (wcn) weeks = parseWeeks(wcn[1].replace(/\s+/g, ''));
        else {
          const parts = Array.from(t.matchAll(/(\d+(?:-\d+)?)\s*周/g)).map(x => x[1]);
          if (parts.length) {
            const expanded = [];
            for (const p of parts) {
              if (p.includes('-')) {
                const [a,b] = p.split('-',1);
                const ai = parseInt(a,10); const bi = parseInt(b,10);
                if (!isNaN(ai) && !isNaN(bi) && ai <= bi) for (let z=ai; z<=bi; z++) expanded.push(z);
              } else {
                const v = parseInt(p,10); if (!isNaN(v)) expanded.push(v);
              }
            }
            if (expanded.length) weeks = Array.from(new Set(expanded)).sort((a,b)=>a-b);
          }
        }
      }
      // location
      let loc = '';
      const locm = t.match(/Not Yet:?\s*([^;]+)/i);
      if (locm) {
        const qq = (locm[1] || '').replace(/[^0-9]/g,'');
        loc = qq ? `Online ${qq}` : 'Online';
      } else if (/未定|未排/.test(t)) {
        const qqm = t.match(/课程QQ群号[:]\s*(\d+)/);
        loc = qqm ? `Online ${qqm[1]}` : 'Online';
      }
      out.push({ name: base, teacher: teacher, weeks: weeks || [], location: loc || '', outside: true, type: (typeChar && { '△': 'Theory', '★': 'Technical', '▲': 'Practice', '☆': 'Experiment' }[typeChar]) || '', type_char: typeChar });
    }
    return out;
  }

  // Ported: extract student info from pages (metadata-like)
  function extractStudentInfoFromPages(pagesArr) {
    const info = { id: undefined, name: undefined };
    const firstPages = (pagesArr || []).slice(0,2).map(p => String(p || '')).join('\n');
    const lines = firstPages.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    for (const s of lines) {
      if (!info.id) {
        const m = s.match(/\b(Student\s*ID|ID|学号)\s*[:：]\s*([A-Za-z0-9_-]{4,})/i);
        if (m) info.id = m[2];
      }
      if (!info.name) {
        const m2 = s.match(/\b(Name|姓名)\s*[:：]\s*([A-Za-z\u4e00-\u9fff\s.]{2,})/i);
        if (m2) info.name = (m2[2] || '').replace(/\s+/g,' ').trim();
      }
      if (!info.name && /Curriculum/i.test(s) && s.includes("'s")) {
        const pre = s.split(/'s/i)[0];
        let cand = pre.replace(/\bstudent\s*id\s*:\s*[A-Za-z0-9_-]+/i,'').replace(/\s{2,}/g,' ').trim();
        cand = cand.replace(/[\-_]/g,' ').trim();
        if (cand) info.name = cand;
      }
      if (!info.name) {
        const mtc = s.match(/^\s*([A-Za-z\u4e00-\u9fff][A-Za-z\u4e00-\u9fff\s.\-' ]{1,}?)\s*(?:课表|课程表)\s*$/);
        if (mtc) info.name = (mtc[1] || '').replace(/\s+/g,' ').trim();
      }
      if (info.id && info.name) break;
    }
    return info;
  }

  function extractTermFromContentPages(pagesArr) {
    function norm(s) { if (!s) return ''; const dashChars = '\u2010\u2011\u2012\u2013\u2014\u2212\ufe63\uff0d'; let out = s; for (const ch of dashChars) out = out.replace(new RegExp(ch,'g'), '-'); return out; }
    const lines = (pagesArr || []).slice(0,2).map(p=>String(p||'')).join('\n').split(/\r?\n/).map(l=>norm(l)).filter(Boolean);
    for (const raw of lines) {
      const mDirect = raw.match(/(\d{4})-(\d{4})-(\d)/);
      if (mDirect) return `${mDirect[1]}-${mDirect[2]}-${mDirect[3]}`;
      const mEn = raw.match(/(\d{4})-(\d{4}).{0,8}academic\s*year\s*([1-2])\s*term/i);
      if (mEn) return `${mEn[1]}-${mEn[2]}-${mEn[3]}`;
      const mCn = raw.match(/(\d{4})-(\d{4})\s*学年\s*第\s*([一二三123])\s*学期/);
      if (mCn) { const map = {'一':'1','二':'2','三':'3'}; const sem = map[mCn[3]]||mCn[3]; if (sem==='1'||sem==='2') return `${mCn[1]}-${mCn[2]}-${sem}`; }
    }
    return undefined;
  }

  // Helper functions for table parsing
function buildLinesFromItems(items) {
  const map = new Map();
  for (const it of items) {
    const yk = Math.floor((it.y || 0) / 2); // More precise grouping
    if (!map.has(yk)) map.set(yk, []);
    map.get(yk).push(it);
  }
  const ys = Array.from(map.keys()).sort((a, b) => b - a);
  return ys.map(y => {
    const row = map.get(y) || [];
    row.sort((a, b) => a.x - b.x);
    // Preserve original item line breaks to keep markers and punctuation on their own lines
    return { y, text: row.map(x => x.str.trim()).filter(Boolean).join('\n'), items: row };
  });
}function findPositionalHeader(pagesItemsArr) {
  for (let p = 0; p < pagesItemsArr.length; p++) {
    const lines = buildLinesFromItems(pagesItemsArr[p]);
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (!ln || !ln.text) continue;
      if (ln.text.includes('Period of time')) return { page: p, lineIndex: i, line: ln };
      const matches = (ln.text.match(/周[一二三四五六日]|星期[一二三四五六日]|\bMon\b|\bTue\b|\bWed\b|\bThu\b|\bFri\b|\bSat\b|\bSun\b/g) || []);
      console.log(`Page ${p}, line ${i}: ${matches.length} matches, text: ${ln.text.slice(0,200)}`);
      if (matches.length >= 2) return { page: p, lineIndex: i, line: ln };
    }
  }
  return null;
}  // Ported helpers from Python reference: merge continuation rows and extract courses from table
  function mergeContinuationRows(headersIn, rowsIn) {
    if (!rowsIn || !rowsIn.length) return rowsIn;
    const colPeriod = 0;
    const colSection = 1;
    const dayCols = [];
    for (let i = 2; i < headersIn.length; i++) dayCols.push(i);
    const out = rowsIn.map(r => r.slice());
    const lastNonEmpty = {};
    for (let i = 0; i < out.length; i++) {
      const r = out[i];
      const p = (r[colPeriod] || '').trim();
      const s = (r[colSection] || '').trim();
      if (p === '' && s === '') {
        let changed = false;
        for (const j of dayCols) {
          const frag = (r[j] || '').trim();
          if (!frag) continue;
          let prevIdx = lastNonEmpty[j];
          if (prevIdx == null) {
            for (let k = i - 1; k >= Math.max(0, i - 20); k--) {
              if ((out[k] && (out[k][j] || '').trim())) {
                prevIdx = k; break;
              }
            }
          }
          if (prevIdx != null && out[prevIdx]) {
            const base = (out[prevIdx][j] || '').replace(/\s+$/,'');
            const joiner = base.endsWith('\n') ? '' : '\n';
            out[prevIdx][j] = base + joiner + frag;
            out[i][j] = '';
            changed = true;
          }
        }
        if (changed) {
          const allEmpty = dayCols.every(j => !(out[i][j] || '').trim());
          if (allEmpty && (p === '' && s === '')) {
            out[i] = null;
          }
        }
        continue;
      }
      for (const j of dayCols) {
        if ((r[j] || '').trim()) lastNonEmpty[j] = i;
      }
    }
    return out.filter(x => x != null);
  }

  function splitBlocksSmart(cellText) {
    const linesArr = (cellText || '').split('\n').map(l => (l || '').trim()).filter(Boolean);
    if (!linesArr.length) return [];
    const markerIdxs = linesArr.map((ln, idx) => ({ln, idx})).filter(x => /[△★▲☆]/.test(x.ln)).map(x => x.idx);
    if (!markerIdxs.length) return [];
    function isMetaLine(ln) {
      if (!ln) return false;
      if (/\(\d+(?:-\d+)?\s*Section\)|\bWeek\b|(Campus|Area)[:：]|Teacher[s]?:/i.test(ln)) return true;
      if (/\(\d+(?:-\d+)?\s*节\)|第\s*[0-9,\-\s]+\s*周/.test(ln)) return true;
      if (/(校区|教学区|地点|上课地点|场地|任课教师|教师|老师)[:：]/.test(ln)) return true;
      if (/^(The class|The makeup of the class|Class selection remarks|Course\s*hours|Week\s*period|Credit)[:：]/i.test(ln)) return true;
      if (/^(?:Week\s*)?period\s*[:：]/i.test(ln)) return true;
      if (/^hours\s*[:：]/i.test(ln)) return true;
      return false;
    }
    const blocks = [];
    let prevMarker = -1;
    for (let idx_i = 0; idx_i < markerIdxs.length; idx_i++) {
      let mi = markerIdxs[idx_i];
      // backtrack to include name prelude
      let start = mi;
      let j = mi - 1;
      while (j > prevMarker && j >= 0 && !isMetaLine(linesArr[j]) && !/[△★▲☆]/.test(linesArr[j])) {
        start = j; j--; }
      const end = (idx_i + 1 < markerIdxs.length) ? markerIdxs[idx_i + 1] : linesArr.length;
      const block = linesArr.slice(start, end);
      blocks.push(block);
      prevMarker = mi;
    }
    return blocks;
  }

  function parseBlockTextWithFallback(text, fallbackPeriod) {
    const parsed = parseBlockText(text) || null;
    if (!parsed) return null;
    if ((!parsed.periods || parsed.periods.length === 0) && fallbackPeriod) parsed.periods = [fallbackPeriod];
    return parsed;
  }

  function _backfillTeachers(coursesList) {
    const groups = {};
    for (let i = 0; i < (coursesList || []).length; i++) {
      const c = coursesList[i];
      const name = (c.name || '').trim();
      const day = (c.day || '').trim();
      const key = `${name}||${day}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(i);
    }
    for (const key of Object.keys(groups)) {
      const idxs = groups[key];
      const teachers = idxs.map(i => (coursesList[i].teacher || '').trim()).filter(Boolean);
      if (!teachers.length) continue;
      const t = teachers[0];
      for (const i of idxs) if (!(coursesList[i].teacher || '').trim()) coursesList[i].teacher = t;
    }
  }

  function extractCoursesFromTable(headersIn, rowsIn, preserveNewlines) {
    const cnDayMap = {
      "周一": "Mon", "星期一": "Mon",
      "周二": "Tue", "星期二": "Tue",
      "周三": "Wed", "星期三": "Wed",
      "周四": "Thu", "星期四": "Thu",
      "周五": "Fri", "星期五": "Fri",
      "周六": "Sat", "星期六": "Sat",
      "周日": "Sun", "星期日": "Sun",
    };
    const days = [];
    for (let idx = 0; idx < headersIn.length; idx++) {
      const hhRaw = (headersIn[idx] || '').trim();
      const hh = hhRaw.toLowerCase();
      if (["mon","tue","wed","thu","fri","sat","sun"].includes(hh)) {
        days.push([idx, hhRaw]);
      } else {
        for (const key in cnDayMap) if (hhRaw.includes(key)) { days.push([idx, cnDayMap[key]]); break; }
      }
    }
    const dayByCol = Object.fromEntries(days.map(d => [d[0], d[1]]));
    const out = [];
    for (const row of rowsIn) {
      if (!row || row.length < 3) continue;
      const secText = (row[1] || '').trim();
      let secNum = null;
      let mSec = secText.match(/^(\d+)$/);
      if (!mSec) mSec = secText.match(/^(\d+)\s*节/);
      if (mSec) { try { secNum = parseInt(mSec[1],10); } catch (e) { secNum = null; } }
      for (let cIdx = 2; cIdx < row.length; cIdx++) {
        const day = dayByCol[cIdx];
        if (!day) continue;
        const cell = row[cIdx] || '';
        if (!cell.trim()) continue;
        let blocksArr = [];
        if (preserveNewlines) {
          const smart = splitBlocksSmart(cell);
          if (smart && smart.length) {
            const btList = [];
            for (const bl of smart) {
              const textBl = bl.join('\n');
              const subs = splitBlocksByMarker(textBl);
              if (subs && subs.length > 1) btList.push(...subs);
              else btList.push(textBl);
            }
            blocksArr = btList;
          }
        }
        if (!blocksArr.length) blocksArr = splitBlocksByMarker(cell);
        for (const bt of blocksArr) {
          const parsed = parseBlockTextWithFallback(bt, secNum);
          if (parsed && parsed.periods && parsed.periods.length && parsed.weeks && parsed.weeks.length) {
            parsed.day = day;
            out.push(parsed);
          }
        }
      }
    }
    _backfillTeachers(out);
    return out;
  }

  // Extract course blocks using marker-based parsing (more robust for messy PDFs)
  let courses = [];

  // First try header-based table parsing
  const headerFound = findPositionalHeader(pagesItems);
  console.log('headerFound:', headerFound);
  if (headerFound) {
    try { console.debug('[parseTimetablePdf] positional header detected', headerFound); } catch (e) {}
    const pIdx = headerFound.page;
    const headerLine = headerFound.line;
    const headerItems = headerLine.items.filter(it => it.str && it.str.trim());
    const headers = headerItems.map(h => h.str.trim());
    const centers = headerItems.map(h => h.x || 0);
    const boundaries = [];
    for (let i = 0; i < centers.length - 1; i++) boundaries.push((centers[i] + centers[i + 1]) / 2);
    function xToCol(x) {
      for (let i = 0; i < boundaries.length; i++) if (x <= boundaries[i]) return i;
      return centers.length - 1;
    }
    const rows = [];
    for (let p = pIdx; p < pagesItems.length; p++) {
      const lines = buildLinesFromItems(pagesItems[p]);
      const start = p === pIdx ? headerFound.lineIndex + 1 : 0;
      for (let li = start; li < lines.length; li++) {
        const ln = lines[li];
        if (!ln) continue;
        // if the line has no text AND no items, skip it instead of breaking (PDF extra whitespace)
        if ((!ln.text || !ln.text.trim()) && (!ln.items || !ln.items.length)) continue;
        const lnTextForTest = ln.text || (ln.items && ln.items.map(it => it.str).join(' ')) || '';
        if (/^(备注|Notes|说明|--)/i.test(lnTextForTest)) break;
        const cellArr = Array.from({ length: headers.length }, () => '');
        for (const it of ln.items) {
          const col = xToCol(it.x || 0);
          if (cellArr[col]) cellArr[col] += ' ';
          cellArr[col] += it.str;
        }
        for (let ci = 0; ci < cellArr.length; ci++) cellArr[ci] = (cellArr[ci] || '').trim();
        rows.push(cellArr);
      }
    }
    // merged/extraction will be handled below with existing helpers
    var positional_headers = headers;
    var positional_rows = rows;
    console.log('positional_rows length:', positional_rows.length);
    const merged = mergeContinuationRows(positional_headers, positional_rows);
    console.log('merged length:', merged.length);
    const tableCourses = extractCoursesFromTable(positional_headers, merged, true);
    console.log('tableCourses length:', tableCourses.length);
    courses.push(...tableCourses);
  }

  // If no table courses, fallback to marker-based parsing
  if (!courses.length) {
    const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let currentDay = null;
    let sectionLines = [];
    for (const line of lines) {
      const dayMatch = line.match(/^(Sun|Sat|Fri|Thu|Wed|Tue|Mon|周日|星期日|周六|星期六|周五|星期五|周四|星期四|周三|星期三|周二|星期二|周一|星期一)$/i);
      if (dayMatch) {
        if (sectionLines.length) {
          const sectionText = sectionLines.join('\n');
          const blocks = splitBlocksByMarker(sectionText);
          for (const b of blocks) {
            const parsed = parseBlockText(b);
            if (parsed) {
              parsed.day = currentDay;
              courses.push(parsed);
            }
          }
        }
        let day = dayMatch[1];
        if (cnDayMap[day]) day = cnDayMap[day];
        currentDay = day;
        sectionLines = [];
      } else {
        sectionLines.push(line);
      }
    }
    if (sectionLines.length) {
      const sectionText = sectionLines.join('\n');
      const blocks = splitBlocksByMarker(sectionText);
      for (const b of blocks) {
        const parsed = parseBlockText(b);
        if (parsed) {
          parsed.day = currentDay;
          courses.push(parsed);
        }
      }
    }
    console.log('marker courses length:', courses.length);
  }

  // Append outside-table courses (from metadata) and backfill missing student/term info
  let finalCourses = Array.isArray(courses) ? courses.slice() : [];
  try {
    const outside = extractOutsideCoursesFromText(fullText || '');
    console.log('outside length:', outside.length);
    if (outside && outside.length) finalCourses.push(...outside);
  } catch (e) {}

  // Backfill teachers across identical (name, day, periods) groups
  try {
    const groups = {};
    for (let i = 0; i < finalCourses.length; i++) {
      const c = finalCourses[i] || {};
      const key = `${(c.name||'').trim()}||${(c.day||'').trim()}||${JSON.stringify(c.periods||[])}`;
      groups[key] = groups[key] || [];
      groups[key].push(i);
    }
    for (const key of Object.keys(groups)) {
      const idxs = groups[key];
      const teachers = idxs.map(i => (finalCourses[i].teacher || '').trim()).filter(Boolean);
      if (!teachers.length) continue;
      const t = teachers[0];
      for (const i of idxs) if (!(finalCourses[i].teacher || '').trim()) finalCourses[i].teacher = t;
    }
  } catch (e) {}

  // Prefer richer student/term extraction from page content when available
  try {
    const sInfo = extractStudentInfoFromPages(pages || []);
    if (sInfo) {
      if (!student.name && sInfo.name) student.name = sInfo.name;
      if (!student.id && sInfo.id) student.id = sInfo.id;
    }
  } catch (e) {}
  try {
    if (!term) term = extractTermFromContentPages(pages || []);
  } catch (e) {}
  // Post-process: filter header-like noise, merge fragments, add timeOfDay and isToday
  try {
    // Decode HTML entities in extracted fields and conservatively merge outside-course fragments
    for (let i = 0; i < finalCourses.length; i++) {
      const c = finalCourses[i];
      if (!c) continue;
      if (c.name) c.name = decodeHtmlEntities(c.name);
      if (c.teacher) c.teacher = decodeHtmlEntities(c.teacher);
      if (c.location) c.location = decodeHtmlEntities(c.location);
      if (c.raw) c.raw = decodeHtmlEntities(c.raw);
    }

    // Conservative merge for consecutive outside-course fragments (fixes splits like "&amp; Design" )
    console.log('outside before merge:', finalCourses.filter(c => c.outside).map(c => c.name));
    const mergedOutsideArr = [];
    for (let i = 0; i < finalCourses.length; ) {
      const cur = Object.assign({}, finalCourses[i]);
      if (cur.outside) {
        let j = i + 1;
        while (j < finalCourses.length && finalCourses[j] && finalCourses[j].outside) {
          const nxt = finalCourses[j];
          const nxtName = (nxt.name || '').trim();
          const curName = (cur.name || '').trim();
          // join if next fragment looks like a continuation: starts with &, and, hyphen, or is very short
          const joinCond = /^([&\-–—]|and\b)/i.test(nxtName)
            || nxtName.length <= 8
            || (/^[a-z]/.test(nxtName));
          if (joinCond) {
            cur.name = (curName + ' ' + nxtName).replace(/\s+/g, ' ').trim();
            // merge meta
            cur.teacher = cur.teacher || nxt.teacher;
            cur.location = cur.location || nxt.location;
            cur.type = cur.type || nxt.type;
            cur.weeks = Array.from(new Set([].concat(cur.weeks || [], nxt.weeks || []))).sort((a, b) => a - b);
            cur.raw = [cur.raw || '', nxt.raw || ''].filter(Boolean).join('\n---\n');
            j += 1;
            continue;
          }
          break;
        }
        mergedOutsideArr.push(cur);
        i = j;
      } else {
        mergedOutsideArr.push(cur);
        i += 1;
      }
    }
    // replace finalCourses contents with mergedOutsideArr
    finalCourses.length = 0;
    finalCourses.push(...mergedOutsideArr);

    // filter out obvious header rows or stray single tokens
    console.log('before filter:', finalCourses.length, finalCourses.map(c => ({name: c.name, teacher: c.teacher, location: c.location, type: c.type})));
    const dropNameRe = /^(Morning|Afternoon|Evening|Period|Sectio|Sectio ns|Notes?|说明)$/i;
    let filtered = finalCourses.filter(c => {
      const name = (c.name || '').trim();
      if (!name) return false;
      if (dropNameRe.test(name)) return false;
      if (name.startsWith(':')) return false; // filter legend
      // drop entries that are extremely short and have no teacher/location/type
      if (name.length <= 2 && !(c.teacher || c.location || c.type)) return false;
      return true;
    });

    // normalize names and locations spacing
    filtered = filtered.map(c => {
      if (c.name) c.name = String(c.name).replace(/\s+/g, ' ').trim();
      if (c.location) c.location = String(c.location).replace(/\s+/g, ' ').trim();
      if (c.teacher) c.teacher = String(c.teacher).replace(/\s+/g, ' ').trim();
      return c;
    });

    finalCourses = filtered;
    console.log('finalCourses names:', finalCourses.map(c => c.name));
    try { console.debug('[parseTimetablePdf] postprocessed courses', { count: finalCourses.length, sample: finalCourses.slice(0,6) }); } catch (e) {}
  } catch (e) {
    try { console.debug('[parseTimetablePdf] postprocess failed', e && e.message); } catch (e2) {}
  }

  // Build a simple "table by month" view grouping weeks into 4-week months.
  // Note: this uses an approximate grouping (weeks 1-4 -> Month 1, 5-8 -> Month 2, ...).
  const tableByMonth = {};
  for (const c of finalCourses) {
    const weeks = Array.isArray(c.weeks) ? c.weeks : [];
    const months = weeks.length ? Array.from(new Set(weeks.map(w => Math.floor((w - 1) / 4) + 1))).sort((a, b) => a - b) : [0];
    for (const m of months) {
      const key = m === 0 ? 'Unscheduled' : `Month ${m}`;
      if (!tableByMonth[key]) tableByMonth[key] = [];
      tableByMonth[key].push({ name: c.name || '', day: c.day || '', weeks: c.weeks || [], location: c.location || '', teacher: c.teacher || '', type: c.type || '' });
    }
  }

  return { courses: finalCourses, student, term, isChinese, tableByMonth };
}
