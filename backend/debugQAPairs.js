// debugQAPairs.js
import './src/models/Tenant.js';
import './src/models/Document.js';
import './src/models/Embedding.js';
import mongoose from 'mongoose';
import { generateEmbeddings } from './src/services/embeddingService.mock.js';
import { findSimilarDocuments } from './src/services/similarityService.js';
// helper function copied from chatService.pdf.js (not exported)
const findRelevantQAPairs = (userMessage, context, userMessageLower) => {
  const pairs = [];
  const lines = context.split('\n');
  let currentPair = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const isNewQAPair =
      /^[\d]+[\.\)]\s+/.test(trimmedLine) ||
      /^Q[\d]+[\:\.\s]/i.test(trimmedLine) ||
      /^Question/i.test(trimmedLine) ||
      /^A[\d]+[\:\.\s]/i.test(trimmedLine);

    if (isNewQAPair && currentPair.trim() && i > 0) {
      pairs.push(currentPair.trim());
      currentPair = line;
    } else {
      currentPair += (currentPair ? '\n' : '') + line;
    }
  }
  if (currentPair.trim()) {
    pairs.push(currentPair.trim());
  }

  console.log(`[PDF-CHAT] Detected ${pairs.length} Q&A pairs`);

  const scoredPairs = pairs.map((pair) => {
    let question = '';
    const lines = pair.split('\n');
    for (let line of lines) {
      const trimmed = line.trim();
      if (/^[\d]+[\.\)]\s+(.+)|^Q[\d]+[\:\.\s]+(.+)|^Question[\:\s]+(.+)/i.test(trimmed)) {
        const match = trimmed.match(/^[\d]+[\.\)]\s+(.+)|^Q[\d]+[\:\.\s]+(.+)|^Question[\:\s]+(.+)/i);
        question = match && (match[1] || match[2] || match[3]) ? (match[1] || match[2] || match[3]) : trimmed;
        break;
      }
    }

    let score = 0;
    const questionLower = question.toLowerCase();
    const userKeywords = userMessageLower
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["the", "and", "was", "for", "is", "are", "does"].includes(w));

    console.log(`[PDF-CHAT] Scoring Q&A pair. Question: "${question.substring(0, 50)}..." Keywords: [${userKeywords.join(', ')}]`);
    userKeywords.forEach((keyword) => {
      if (questionLower.includes(keyword)) {
        score += 5;
      }
      if (pair.toLowerCase().includes(keyword)) {
        score += 2;
      }
    });

    return { pair: pair.trim(), score, question };
  });

  console.log(`[PDF-CHAT] Scored pairs:`, scoredPairs.map(p => ({ question: p.question.substring(0, 40), score: p.score })));
  const topMatch = scoredPairs.sort((a,b)=>b.score - a.score).slice(0,1);
  console.log(`[PDF-CHAT] Top match score: ${topMatch.length>0 ? topMatch[0].score : 'none'}`);
  return topMatch.length>0 ? [topMatch[0].pair] : [];
};

(async () => {
  await mongoose.connect('mongodb://localhost:27017/support-widget');
  const Tenant = mongoose.model('Tenant');
  const tenant = await Tenant.findOne();
  const query = 'What is the difference between SSD and HDD?';
  const emb = await generateEmbeddings(query);
  const similarDocs = await findSimilarDocuments(tenant._id, emb, { limit: 10, minSimilarity: 0.02 });
  const context = similarDocs.map((d) => d.embedding.text).join('\n\n');
  console.log('raw context:', context);
  const pairs = findRelevantQAPairs(query, context, query.toLowerCase());
  console.log('pairs result', pairs);
  // attempt to extract answer from top pair or specific target
  const target = pairs.find((p) => p.includes('difference between SSD'));
  console.log('target pair', target);
  const extractAnswer = (content) => {
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    console.log('extractAnswer lines array', lines);

    // simple: everything after first line
    let answer = '';
    if (lines.length > 1) {
      answer = lines.slice(1).join(' ').trim();
    }
    if (answer) {
      console.log('naive extracted answer', answer);
      return answer;
    }

    // fallback to detailed logic
    let foundQuestion = false;
    const answerLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isQuestionLine =
        /^\d+[\.\)]\s+/.test(line) ||
        /^Q\d+[\:\.\s]/i.test(line) ||
        /^Question[\:\s]/i.test(line) ||
        (line.endsWith('?') && (i === 0 || !foundQuestion));
      if (isQuestionLine) {
        foundQuestion = true;
        continue;
      }
      if (foundQuestion && /^\d+[\.\)]\s+|^Q\d+[\:\.\s]/i.test(line)) break;
      if (foundQuestion && line.length > 0) {
        if (!/^A\d+[\:\.\s]|^Answer[\:\s]|^[A-Z\s]{3,}$|^Computer|^FAQ|^Frequently/i.test(line)) {
          answerLines.push(line);
        }
      }
    }
    console.log('answerLines captured', answerLines);
    return answerLines.join(' ');
  };
  console.log('extracted answer', extractAnswer(target));
  process.exit(0);
})();