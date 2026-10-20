// Load the researched revision, retaining the original Obsidian parser for archival builds.
export function parseCSV(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value); value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index++;
      row.push(value);
      if (row.some(cell => cell.length)) rows.push(row);
      row = []; value = '';
    } else value += character;
  }
  if (quoted) throw new Error('A source CSV contains an unclosed quoted field.');
  if (value.length || row.length) { row.push(value); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.map(cells => Object.fromEntries(headers.map((name, index) => [name, cells[index] ?? ''])));
}

export async function loadHandbook() {
  const catalogResponse = await fetch('./data/catalog.json');
  if (catalogResponse.ok) {
    const catalog = await catalogResponse.json();
    const response = await fetch('./data/references.json');
    if (!response.ok) throw new Error('Could not read the reference collection.');
    const references = await response.json();
    const expected = references.target || 8;
    const groups = catalog.groups;
    const styles = catalog.styles.map(style => {
      const current = references.styles[style.id];
      const examples = current?.examples || [];
      return { ...style, groupName: groups.find(g => g.id === style.group)?.name || style.group,
        expected, found: examples.length, examples, palette: current?.palette,
        status: examples.length >= expected ? 'complete' : examples.length ? 'partial' : 'deferred' };
    });
    if (styles.length !== 300) throw new Error('The revised catalog is incomplete.');
    return { styles, groups, stats: {
      styles: styles.length, groups: groups.length, examples: styles.reduce((n,s) => n + s.found, 0),
      complete: styles.filter(s => s.status === 'complete').length,
      partial: styles.filter(s => s.status === 'partial').length,
      deferred: styles.filter(s => s.status === 'deferred').length,
    }};
  }
  const filenames = ['artstyles-300.md', 'pinterest-coverage.csv', 'pinterest-examples.csv'];
  const [markdown, coverageCSV, examplesCSV] = await Promise.all(filenames.map(async filename => {
    const response = await fetch(`./${filename}`);
    if (!response.ok) throw new Error(`Could not read ${filename}.`);
    return response.text();
  }));
  const curatedResponse = await fetch('./data/references.json');
  if (!curatedResponse.ok) throw new Error('Could not read the current reference collection.');
  const curated = await curatedResponse.json();
  const coverage = new Map(parseCSV(coverageCSV).map(row => [Number(row.style_id), row]));
  const exampleRows = parseCSV(examplesCSV);
  const examples = new Map();
  for (const row of exampleRows) {
    const id = Number(row.style_id);
    if (!examples.has(id)) examples.set(id, []);
    examples.get(id).push({
      number: Number(row.example_no), title: row.title,
      url: row.pinterest_result_url, image: row.image_url,
      kind: row.source_kind, note: row.source_note, query: row.search_query,
    });
  }
  const styles = [], groups = [];
  let heading = '';
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('## ')) heading = line.slice(3).trim();
    const match = line.match(/^(\d+)\. \*\*(.+?)\*\* — (.+)$/);
    if (!match) continue;
    const id = Number(match[1]);
    if (!groups.some(group => group.name === heading)) {
      groups.push({ id: String(groups.length + 1), name: heading, count: 0 });
    }
    const group = groups.find(item => item.name === heading);
    group.count++;
    const record = coverage.get(id);
    if (!record || !['complete', 'partial', 'deferred'].includes(record.status)) {
      throw new Error(`Missing or unknown coverage for style ${id}.`);
    }
    const sourceItems = (examples.get(id) || []).sort((a, b) => a.number - b.number);
    if (sourceItems.length !== Number(record.examples_found)) {
      throw new Error(`The example data and coverage disagree for style ${id}.`);
    }
    const current = curated.styles[id];
    if (!current || current.examples.length > 8) throw new Error(`Invalid current references for style ${id}.`);
    const items = current.examples;
    styles.push({
      id, name: match[2], description: match[3], group: group.id,
      groupName: heading, status: items.length === 8 ? 'complete' : items.length ? 'partial' : 'deferred',
      expected: 8, found: items.length, palette: current.palette,
      directPins: items.filter(item => item.kind === 'pin').length, examples: items,
    });
  }
  if (styles.length !== 300 || new Set(styles.map(style => style.id)).size !== 300) {
    throw new Error('The source must contain all 300 distinct numbered styles.');
  }
  return {
    styles, groups,
    stats: {
      styles: styles.length, groups: groups.length, examples: styles.reduce((total, style) => total + style.found, 0),
      complete: styles.filter(style => style.status === 'complete').length,
      partial: styles.filter(style => style.status === 'partial').length,
      deferred: styles.filter(style => style.status === 'deferred').length,
    },
  };
}
