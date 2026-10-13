export function csvParse(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((l) => parseCsvLine(l));
  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

export function jsonParse(text: string): { headers: string[]; rows: string[][] } {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return { headers: [], rows: [] };

  const headerSet = new Set<string>();
  arr.forEach((obj) => {
    if (obj && typeof obj === "object") {
      Object.keys(obj).forEach((k) => headerSet.add(k));
    }
  });

  const headers = Array.from(headerSet);
  const rows = arr.map((obj) => headers.map((h) => (obj?.[h] != null ? String(obj[h]) : "")));
  return { headers, rows };
}
