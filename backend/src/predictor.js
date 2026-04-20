import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const domainPath = path.join(__dirname, "..", "data", "domain.json");

function normalizeSymptomName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function loadKnowledge() {
  const raw = fs.readFileSync(domainPath, "utf-8");
  return JSON.parse(raw);
}

function buildPredictionCache(knowledge) {
  const diseaseSymptomMap = {};
  const symptomLookup = new Map();
  const allSymptoms = new Set();

  for (const diseaseDetails of Object.values(knowledge.diseases)) {
    for (const [typeName, typeInfo] of Object.entries(diseaseDetails.types)) {
      const uniqueSymptoms = [];
      const seen = new Set();

      for (const symptom of typeInfo.symptoms) {
        const normalized = normalizeSymptomName(symptom);
        if (!symptomLookup.has(normalized)) {
          symptomLookup.set(normalized, symptom);
        }
        if (!seen.has(normalized)) {
          seen.add(normalized);
          uniqueSymptoms.push(symptomLookup.get(normalized));
          allSymptoms.add(symptomLookup.get(normalized));
        }
      }

      diseaseSymptomMap[typeName] = uniqueSymptoms;
    }
  }

  return {
    diseaseSymptomMap,
    symptomLookup,
    allSymptoms: Array.from(allSymptoms).sort((a, b) => a.localeCompare(b)),
  };
}

function scoreDiseaseMatches(selectedSymptoms, diseaseSymptomMap) {
  const selectedNormalized = new Set(selectedSymptoms.map(normalizeSymptomName));
  const rankings = [];

  for (const [disease, symptoms] of Object.entries(diseaseSymptomMap)) {
    const diseaseNormalized = new Set(symptoms.map(normalizeSymptomName));
    const matchedSymptoms = symptoms.filter((symptom) =>
      selectedNormalized.has(normalizeSymptomName(symptom)),
    );

    if (!matchedSymptoms.length) {
      continue;
    }

    const unionCount = new Set([...selectedNormalized, ...diseaseNormalized]).size;
    const overlapScore = unionCount ? matchedSymptoms.length / unionCount : 0;
    const coverageScore = diseaseNormalized.size ? matchedSymptoms.length / diseaseNormalized.size : 0;
    const precisionScore = selectedNormalized.size ? matchedSymptoms.length / selectedNormalized.size : 0;
    const score = (0.55 * overlapScore) + (0.25 * coverageScore) + (0.2 * precisionScore);

    rankings.push({
      disease,
      score,
      matchedCount: matchedSymptoms.length,
      matchedSymptoms: matchedSymptoms.sort((a, b) => a.localeCompare(b)),
    });
  }

  rankings.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    if (right.matchedCount !== left.matchedCount) {
      return right.matchedCount - left.matchedCount;
    }
    return left.disease.localeCompare(right.disease);
  });

  return rankings.map((item) => ({
    disease: item.disease,
    confidenceRaw: Number((item.score * 100).toFixed(2)),
    confidence: `${(item.score * 100).toFixed(2)}%`,
    matchedCount: item.matchedCount,
    matchedSymptoms: item.matchedSymptoms,
  }));
}

const knowledge = loadKnowledge();
const cache = buildPredictionCache(knowledge);

export function getSymptoms() {
  return cache.allSymptoms;
}

export function getDiseaseSymptoms(disease) {
  return cache.diseaseSymptomMap[disease] || [];
}

export function predictDiseases(symptoms) {
  const selectedSymptoms = symptoms
    .map((symptom) => normalizeSymptomName(symptom))
    .filter(Boolean)
    .map((symptom) => cache.symptomLookup.get(symptom))
    .filter(Boolean);

  if (!selectedSymptoms.length) {
    return [];
  }

  return scoreDiseaseMatches(selectedSymptoms, cache.diseaseSymptomMap);
}
