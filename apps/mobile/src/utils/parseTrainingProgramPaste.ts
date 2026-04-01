/**
 * Parse pasted notepad text into missions for the training log.
 *
 * Format:
 * - Lines starting with # or // are comments.
 * - PATH: Name  or  CATEGORY: Name  — sets the path for following exercises (e.g. Strength, Running).
 * - Strength exercises:
 *   - Bench Press 3x10  → 3 sets × 10 reps
 *   - Squat 5x5 @ 225   → optional weight on all sets
 *   - Leg Curl          → single empty set (fill in app)
 * - Non-strength (cardio etc.):
 *   - Morning Run 5km 30min  — optional km / min hints; rest is the exercise name
 */

export interface ParsedTrainingRow {
  category: string;
  exerciseName: string;
  setsData: Array<{
    weight?: string;
    reps?: string;
    km?: string;
    mins?: string;
  }>;
}

const PATH_LINE = /^(?:PATH|CATEGORY)\s*:\s*(.+)$/i;
const COMMENT = /^\s*(?:#|\/\/)/;

function normalizeCategory(raw: string): string {
  const t = raw.trim();
  if (!t) return 'Strength';
  if (/^strength$/i.test(t)) return 'Strength';
  return t.toUpperCase();
}

/** Strength: name + sets×reps [@ weight] */
function parseStrengthLine(line: string): { name: string; setsData: ParsedTrainingRow['setsData'] } | null {
  const m = line.match(/^(.+?)\s+(\d+)\s*[xX×]\s*(\d+)(?:\s*@?\s*([\d.]+))?\s*$/);
  if (!m) return null;
  const name = m[1].trim();
  if (!name) return null;
  const setCount = parseInt(m[2], 10);
  const reps = m[3];
  const weight = m[4] != null && m[4] !== '' ? String(m[4]) : '';
  const setsData = Array.from({ length: setCount }, () => ({
    weight,
    reps: String(reps),
  }));
  return { name, setsData };
}

function parseStrengthNameOnly(line: string): ParsedTrainingRow['setsData'] {
  return [{ weight: '', reps: '' }];
}

function parseCardioLine(line: string): { name: string; setsData: ParsedTrainingRow['setsData'] } {
  let rest = line;
  let km = '';
  let mins = '';
  const kmMatch = rest.match(/(\d+(?:\.\d+)?)\s*km\b/i);
  if (kmMatch) {
    km = kmMatch[1];
    rest = rest.replace(kmMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }
  const minMatch = rest.match(/(\d+)\s*(?:min|mins)\b/i);
  if (minMatch) {
    mins = minMatch[1];
    rest = rest.replace(minMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }
  const name = rest.replace(/\s+/g, ' ').trim() || line.trim();
  return {
    name,
    setsData: [{ km: km || '', mins: mins || '' }],
  };
}

export function parseTrainingProgram(text: string):
  | { ok: true; rows: ParsedTrainingRow[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const rows: ParsedTrainingRow[] = [];
  let currentCategory = 'Strength';

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (COMMENT.test(line)) continue;

    const pathMatch = line.match(PATH_LINE);
    if (pathMatch) {
      currentCategory = normalizeCategory(pathMatch[1]);
      continue;
    }

    const isStrength = currentCategory === 'Strength';

    if (isStrength) {
      const parsed = parseStrengthLine(line);
      if (parsed) {
        rows.push({
          category: currentCategory,
          exerciseName: parsed.name.toUpperCase(),
          setsData: parsed.setsData,
        });
      } else {
        rows.push({
          category: currentCategory,
          exerciseName: line.toUpperCase(),
          setsData: parseStrengthNameOnly(line),
        });
      }
    } else {
      const parsed = parseCardioLine(line);
      rows.push({
        category: currentCategory,
        exerciseName: parsed.name.toUpperCase(),
        setsData: parsed.setsData,
      });
    }
  }

  if (rows.length === 0) {
    errors.push('No exercises found. Add lines like "Bench Press 3x10" or set PATH: Strength first.');
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, rows };
}
