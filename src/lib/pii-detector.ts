import type { FieldType, ColumnProfile } from "./types";

const PII_PATTERNS: { type: string; regex: RegExp }[] = [
  { type: "Email", regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  { type: "Phone", regex: /^(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/ },
  { type: "SSN", regex: /^\d{3}-?\d{2}-?\d{4}$/ },
  { type: "Credit Card", regex: /^(?:\d{4}[\s-]?){3}\d{4}$/ },
  { type: "IP Address", regex: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/ },
  { type: "Zip Code", regex: /^\d{5}(-\d{4})?$/ },
];

const PII_NAME_HINTS = [
  "email", "phone", "ssn", "social", "credit", "card", "address", "zip",
  "name", "first_name", "last_name", "dob", "birth", "gender", "ip",
  "user", "account", "password", "token", "api_key", "session",
];

export function inferType(values: string[]): FieldType {
  const nonEmpty = values.filter((v) => v !== "" && v !== null && v !== undefined);
  if (nonEmpty.length === 0) return "string";

  let isInt = true;
  let isFloat = true;
  let isBool = true;
  let isDateTime = true;
  let isDate = true;

  for (const v of nonEmpty) {
    if (isInt && !/^-?\d+$/.test(v)) isInt = false;
    if (isFloat && !/^-?\d+(\.\d+)?$/.test(v)) isFloat = false;
    if (isBool && !/^(true|false|0|1|yes|no)$/i.test(v)) isBool = false;
    if (isDate && !/^\d{4}-\d{2}-\d{2}$/.test(v) && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) isDate = false;
    if (isDateTime && !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v)) isDateTime = false;
  }

  if (isDateTime) return "datetime";
  if (isDate) return "date";
  if (isInt) return "integer";
  if (isFloat) return "float";
  if (isBool) return "boolean";
  return "string";
}

export function detectPII(name: string, values: string[]): { isLikelyPII: boolean; piiType: string | null } {
  const lowerName = name.toLowerCase();
  for (const hint of PII_NAME_HINTS) {
    if (lowerName.includes(hint)) {
      const pattern = PII_PATTERNS.find((p) => p.type.toLowerCase().includes(hint) || hint.includes(p.type.toLowerCase()));
      return { isLikelyPII: true, piiType: pattern?.type || "Personal Data" };
    }
  }

  const nonEmpty = values.filter((v) => v !== "");
  if (nonEmpty.length === 0) return { isLikelyPII: false, piiType: null };

  const sample = nonEmpty.slice(0, 100);
  let matchCount = 0;
  let matchedType: string | null = null;

  for (const { type, regex } of PII_PATTERNS) {
    const count = sample.filter((v) => regex.test(v)).length;
    if (count > sample.length * 0.6) {
      matchCount = count;
      matchedType = type;
      break;
    }
  }

  return { isLikelyPII: matchCount > 0, piiType: matchedType };
}

export function profileColumn(name: string, values: string[], totalCount: number): ColumnProfile {
  const nonEmpty = values.filter((v) => v !== "" && v != null);
  const nullCount = totalCount - nonEmpty.length;
  const uniqueSet = new Set(nonEmpty);
  const inferredType = inferType(values);
  const { isLikelyPII, piiType } = detectPII(name, values);

  let minValue = "";
  let maxValue = "";

  if (inferredType === "integer" || inferredType === "float") {
    const nums = nonEmpty.map(Number).filter((n) => !isNaN(n));
    if (nums.length > 0) {
      minValue = String(Math.min(...nums));
      maxValue = String(Math.max(...nums));
    }
  } else {
    const sorted = [...uniqueSet].sort();
    minValue = sorted[0] || "";
    maxValue = sorted[sorted.length - 1] || "";
  }

  return {
    name,
    inferredType,
    nullPercentage: totalCount > 0 ? Math.round((nullCount / totalCount) * 100) : 0,
    uniqueCount: uniqueSet.size,
    totalCount,
    minValue,
    maxValue,
    sampleValues: nonEmpty.slice(0, 5),
    isLikelyPII,
    piiType,
  };
}
