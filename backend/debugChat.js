// debugChat.js
// standalone script to mimic handleChatQuery logic
import './src/models/Tenant.js';
import './src/models/Document.js';
import './src/models/Embedding.js';
import mongoose from 'mongoose';
import { generateEmbeddings } from './src/services/embeddingService.mock.js';
import { findSimilarDocuments } from './src/services/similarityService.js';
import { generateChatResponse } from './src/services/chatService.pdf.js';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/support-widget');
  const Tenant = mongoose.model('Tenant');
  const tenant = await Tenant.findOne();

  const message = 'What is the difference between SSD and HDD?';
  const queryEmbedding = await generateEmbeddings(message);
  const similarDocs = await findSimilarDocuments(tenant._id, queryEmbedding, {
    limit: 10,
    minSimilarity: 0.02,
  });
  console.log('found similarDocs', similarDocs.map(d => ({ sim: d.similarity, text: d.embedding.text.slice(0, 100) })));

  const qualityMatches = similarDocs.filter((doc) => doc.similarity >= 0.005);
  console.log('qualityMatches', qualityMatches.map(d => d.similarity));

  if (qualityMatches.length > 0) {
    const topMatches = qualityMatches.slice(0, 3);
    const context = topMatches.map((d) => d.embedding.text).join('\n\n');
    console.log('context', context);
    const response = await generateChatResponse(message, context);
    console.log('response', response);
  } else if (similarDocs.length > 0) {
    console.log('no quality but have similarDocs', similarDocs.length);
    const context = similarDocs.map((d) => d.embedding.text).join('\n\n');
    const response = await generateChatResponse(message, context);
    console.log('response under else', response);
  } else {
    const response = await generateChatResponse(message, '');
    console.log('response empty', response);
  }

  process.exit(0);
})();