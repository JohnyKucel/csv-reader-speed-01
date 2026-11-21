// Fast drop-in for csv-reader 1.0.0: same answers, single pass, no per-char
// string building. Unquoted fields are found with one native regex scan for
// the next delimiter; quoted fields with indexOf for the closing quote and a
// slice for the common no-newline case. Slow paths (stray CR, multiline
// quoted, junk, unterminated) run only when the input actually has them.
const DELIM = /[,\n\r]/g;

const COMMA = 0;
const BREAK = 1;
const END = 2;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const len = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;

  // Parses an unquoted field starting at p with initial value val. Slow path:
  // only used for stray-CR fields, quote junk and unterminated-quote re-reads.
  // Returns {value, ended, added} where added counts kept characters.
  const readUnquotedFrom = (p, val) => {
    let added = 0;
    pos = p;
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 44) {
        pos += 1;
        return { value: val, ended: COMMA, added };
      }
      if (c === 10) {
        pos += 1;
        line += 1;
        return { value: val, ended: BREAK, added };
      }
      if (c === 13) {
        if (text.charCodeAt(pos + 1) === 10) {
          pos += 2;
          line += 1;
          return { value: val, ended: BREAK, added };
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        pos += 1;
        continue;
      }
      DELIM.lastIndex = pos;
      const m = DELIM.exec(text);
      const end = m === null ? len : m.index;
      val += text.slice(pos, end);
      added += end - pos;
      pos = end;
    }
    return { value: val, ended: END, added };
  };

  // Builds a quoted field's value from [s, e): doubled quotes collapse, every
  // CRLF / lone CR becomes LF and counts a line. Only called when the
  // interior actually holds a newline, CR or doubled quote with a newline.
  const quotedSlow = (s, e) => {
    const parts = [];
    let seg = s;
    let i = s;
    while (i < e) {
      const c = text.charCodeAt(i);
      if (c === 34) {
        parts.push(text.slice(seg, i));
        parts.push('"');
        i += 2;
        seg = i;
      } else if (c === 13) {
        parts.push(text.slice(seg, i));
        parts.push('\n');
        line += 1;
        i += text.charCodeAt(i + 1) === 10 ? 2 : 1;
        seg = i;
      } else if (c === 10) {
        parts.push(text.slice(seg, i));
        parts.push('\n');
        line += 1;
        i += 1;
        seg = i;
      } else {
        i += 1;
      }
    }
    parts.push(text.slice(seg, e));
    return parts.join('');
  };

  let recordLine = 1;
  let recordRow = null;
  let nl = -1;
  let nlValid = false;

  while (true) {
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    nl = text.indexOf('\n', pos);
    nlValid = true;
    const fields = [];
    let lastQuoted = false;
    let ended = END;
    let value = '';

    do {
      if (text.charCodeAt(pos) === 34) {
        lastQuoted = true;
        const open = pos;
        const openLine = line;
        let q = text.indexOf('"', pos + 1);
        let doubled = false;
        while (q !== -1 && text.charCodeAt(q + 1) === 34) {
          doubled = true;
          q = text.indexOf('"', q + 2);
        }
        if (q === -1) {
          errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
          line = openLine;
          const r = readUnquotedFrom(open + 1, '"');
          value = r.value;
          ended = r.ended;
        } else {
          let val;
          const inner = text.slice(open + 1, q);
          if (inner.indexOf('\n') === -1 && inner.indexOf('\r') === -1) {
            val = doubled ? inner.replaceAll('""', '"') : inner;
          } else {
            val = quotedSlow(open + 1, q);
          }
          pos = q + 1;
          if (pos >= len) {
            value = val;
            ended = END;
          } else {
            const c = text.charCodeAt(pos);
            if (c === 44) {
              pos += 1;
              value = val;
              ended = COMMA;
            } else if (c === 10) {
              pos += 1;
              line += 1;
              value = val;
              ended = BREAK;
            } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
              pos += 2;
              line += 1;
              value = val;
              ended = BREAK;
            } else {
              const r = readUnquotedFrom(pos, val);
              if (r.added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
              value = r.value;
              ended = r.ended;
            }
          }
        }
        nlValid = false;
      } else {
        lastQuoted = false;
        if (!nlValid) {
          nl = text.indexOf('\n', pos);
          nlValid = true;
        }
        const ci = text.indexOf(',', pos);
        if (ci !== -1 && (nl === -1 || ci < nl)) {
          value = text.slice(pos, ci);
          if (value.indexOf('\r') !== -1) {
            const r = readUnquotedFrom(pos, '');
            value = r.value;
            ended = r.ended;
          } else {
            pos = ci + 1;
            ended = COMMA;
          }
        } else if (nl === -1) {
          value = text.slice(pos);
          if (value.indexOf('\r') !== -1) {
            const r = readUnquotedFrom(pos, '');
            value = r.value;
            ended = r.ended;
          } else {
            pos = len;
            ended = END;
          }
        } else if (text.charCodeAt(nl - 1) === 13) {
          value = text.slice(pos, nl - 1);
          if (value.indexOf('\r') !== -1) {
            const r = readUnquotedFrom(pos, '');
            value = r.value;
            ended = r.ended;
          } else {
            pos = nl + 1;
            line += 1;
            ended = BREAK;
          }
        } else {
          value = text.slice(pos, nl);
          if (value.indexOf('\r') !== -1) {
            const r = readUnquotedFrom(pos, '');
            value = r.value;
            ended = r.ended;
          } else {
            pos = nl + 1;
            line += 1;
            ended = BREAK;
          }
        }
      }
      fields.push(value);
    } while (ended === COMMA);

    if (fields.length === 1 && fields[0] === '' && !lastQuoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
