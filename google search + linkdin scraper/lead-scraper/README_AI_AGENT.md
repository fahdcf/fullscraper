# 🤖 Morocco Web Scraper - AI Agent Complete Technical Guide

## 📋 Project Overview

The **Morocco Web Scraper** is a sophisticated Node.js CLI application that extracts contact information (emails and phone numbers) from business websites and LinkedIn profiles across Morocco using AI-powered query generation and intelligent content validation.

### Core Architecture
```
User Input → AI Query Generation → Multi-Source Search → Content Extraction → Validation → Export
     ↓              ↓                    ↓                ↓              ↓           ↓
  Niche Input → Gemini AI → Google/LinkedIn → HTML Parsing → Filtering → CSV/Excel/TXT
```

## 🏗️ Technical Architecture

### File Structure
```
bot-scraper/
├── scraper.js                    # Main CLI orchestrator
├── config.js                     # Configuration & API key management
├── env.config                    # Environment variables
├── manage_api_keys.js            # Interactive API key management
├── helpers/
│   ├── geminiAI.js              # AI query generation (Gemini API)
│   ├── googleSearch.js          # Google Custom Search API
│   ├── multiSourceSearch.js     # Multi-source orchestration
│   ├── contentValidator.js      # Intelligent content filtering
│   ├── exportToCsv.js          # Data export (CSV/Excel/TXT)
│   ├── extractEmails.js        # Email extraction
│   ├── extractPhones.js        # Phone extraction
│   └── fetchPage.js            # HTTP requests
```

### Key Dependencies
- `axios`: HTTP requests
- `xlsx`: Excel file generation
- `chalk`: Console coloring
- `ora`: Loading spinners

## 🧠 AI Integration (Gemini)

### Query Generation Logic
```javascript
// Source-specific query counts
Google Search: 25 queries (20 French + 5 Arabic for Moroccan)
LinkedIn: 12 queries (8 French + 2 Arabic + 2 Other for Moroccan)

// Contact-focused prompts for Google Search
"Generate queries that will find CONTACT PAGES and CONTACT INFORMATION. 
Include terms like 'contact', 'coordonnées', 'téléphone', 'email', 'adresse'"
```

### API Configuration
```javascript
gemini: {
  apiKey: null, // From env.config
  baseUrl: "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
  model: "gemini-2.5-flash"
}
```

## 🔍 Search Engine Integration

### Google Custom Search API
```javascript
// Automatic key rotation
function getNextApiKey() {
  const key = config.googleSearch.apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % config.googleSearch.apiKeys.length;
  return key;
}

// Pagination support
const results = await searchGoogle(query, maxResults = 10);
// Fetches multiple pages: 10 results per page
```

### LinkedIn Search Strategy
```javascript
// Search both company and individual profiles
const linkedInQuery = `${query} site:linkedin.com/company/ OR site:linkedin.com/in/`;
const results = await searchGoogle(linkedInQuery, 20); // 2 pages × 10 results
```

## 🔍 Content Validation System

### Scoring Algorithm
```javascript
// Positive Scoring
- Target niche keywords: +2 per match
- Business indicators: +3 (cabinet, clinique, bureau, etc.)
- Business type match: +5 (healthcare, professional, technology)
- Location relevance: +2 (Moroccan cities)

// Negative Scoring
- Platform/support patterns: -2 (social media, support pages)
- Educational content: -2 (universities, courses)
- Recruitment content: -2 (job boards)

// Threshold: Very permissive
const isRelevant = score >= -20;
```

### Validation Components
```javascript
export class ContentValidator {
  constructor(targetNiche) {
    this.targetNiche = targetNiche.toLowerCase();
    this.nicheKeywords = this.extractNicheKeywords();
    this.businessType = this.detectBusinessType();
    this.platformPatterns = this.getPlatformPatterns();
  }
}
```

## 📧 Contact Information Extraction

### Email Extraction
```javascript
const emailPatterns = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/g
];

// Filter out platform emails
const platformDomains = [
  'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
  'youtube.com', 'google.com', 'microsoft.com', 'apple.com'
];
```

### Phone Number Extraction
```javascript
const moroccanPatterns = [
  /^\+212[67]\d{8}$/,     // +2126XXXXXXXX or +2127XXXXXXXX
  /^0[67]\d{8}$/,         // 06XXXXXXXX or 07XXXXXXXX
  /^212[67]\d{8}$/        // 2126XXXXXXXX or 2127XXXXXXXX
];

const internationalPatterns = [
  /\+[1-9]\d{1,14}/g,     // International format
  /\(\d{3}\)\s*\d{3}-\d{4}/g, // US format
  /\d{3}-\d{3}-\d{4}/g    // US format
];
```

## 🔑 API Key Management

### Unlimited Key Support
```javascript
function getApiKeys(envVars) {
  const keys = [];
  
  // Check for numbered keys (unlimited)
  let i = 1;
  while (true) {
    const key = envVars[`GOOGLE_API_KEY_${i}`];
    if (!key) break;
    if (isValidKey(key)) keys.push(key);
    i++;
  }
  
  // Check for named keys
  const alternativePatterns = [
    'GOOGLE_API_KEY_A', 'GOOGLE_API_KEY_B', 'GOOGLE_API_KEY_C',
    'GOOGLE_API_KEY_PRIMARY', 'GOOGLE_API_KEY_SECONDARY', 'GOOGLE_API_KEY_BACKUP'
  ];
  
  for (const pattern of alternativePatterns) {
    const key = envVars[pattern];
    if (key && isValidKey(key)) keys.push(key);
  }
  
  return keys;
}
```

### Key Rotation Strategy
```javascript
let currentKeyIndex = 0;

function getNextApiKey() {
  const key = config.googleSearch.apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % config.googleSearch.apiKeys.length;
  return key;
}

// Automatic rotation on quota exceeded
if (response.status === 429) {
  console.log(`⚠️  API quota exceeded for key ${currentKeyIndex}, rotating...`);
  currentKeyIndex = (currentKeyIndex + 1) % config.googleSearch.apiKeys.length;
  return await searchGoogle(query, maxResults); // Retry
}
```

## 🔄 Interruption Handling

### Global State Management
```javascript
let isProcessing = false;
let currentResults = [];
let currentNiche = '';
let currentDataType = '';

function handleGlobalInterruption() {
  console.log('\n⚠️  Scraper interrupted by user');
  
  if (isProcessing && currentResults.length > 0) {
    console.log('💾 Saving partial results...');
    
    if (currentDataType === 'linkedin') {
      saveLinkedInPartialResults(currentResults, currentNiche);
    } else {
      saveGoogleSearchPartialResults(currentResults, currentNiche, currentDataType);
    }
  }
  
  process.exit(0);
}

process.on('SIGINT', handleGlobalInterruption);
process.on('SIGTERM', handleGlobalInterruption);
```

### Real-time Result Updates
```javascript
export async function searchLinkedIn(query, niche, onProfileAdded = null) {
  const linkedInProfiles = [];
  
  for (const result of searchResults) {
    const profileInfo = await extractLinkedInProfileInfo(result.link, result.title, result.snippet, niche);
    
    if (profileInfo) {
      linkedInProfiles.push(profileInfo);
      
      // Real-time callback for interruption handling
      if (onProfileAdded) {
        onProfileAdded(profileInfo);
      }
    }
  }
  
  return linkedInProfiles;
}
```

## 📊 Data Export System

### Text File Export (Google Search)
```javascript
async function exportToText(results, filename, niche = '') {
  const emails = results.filter(r => r.type === 'email').map(r => r.value);
  const phones = results.filter(r => r.type === 'phone').map(r => r.value);
  
  const uniqueEmails = [...new Set(emails)];
  const uniquePhones = [...new Set(phones)];
  
  let content = `Email and Phone Numbers Data for: ${niche}\n`;
  content += `Total Emails: ${uniqueEmails.length} | Total Phone Numbers: ${uniquePhones.length}\n`;
  content += `Generated on: ${new Date().toLocaleString()}\n`;
  content += `${'─'.repeat(50)}\n\n`;
  
  if (uniqueEmails.length > 0) {
    content += 'Emails:\n';
    content += uniqueEmails.join('\n') + '\n\n';
  }
  
  if (uniquePhones.length > 0) {
    content += 'Phone Numbers:\n';
    content += uniquePhones.join('\n') + '\n';
  }
  
  await fs.writeFile(filename, content, 'utf8');
}
```

### Excel Export (LinkedIn)
```javascript
async function exportLinkedInToExcel(results, filename) {
  const workbook = xlsx.utils.book_new();
  
  const data = results.map(profile => ({
    Name: profile.name || '',
    'Profile Link': profile.profileUrl || '',
    Bio: profile.bio || '',
    Company: profile.company || ''
  }));
  
  const worksheet = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'LinkedIn Profiles');
  
  xlsx.writeFile(workbook, filename);
}
```

## 🌐 HTTP Request Management

### Anti-Detection Measures
```javascript
function safeDelay() {
  const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
  return new Promise(resolve => setTimeout(resolve, delay));
}

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}
```

### Request Configuration
```javascript
http: {
  timeout: 20000,                    // 20 seconds
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  acceptLanguage: "en-US,en;q=0.9",
  delayBetweenRequests: 2000         // 2 seconds
}
```

## 🎯 Performance Optimization

### Parallel Processing with Concurrency Control
```javascript
async function processQueriesInBatches(queries, batchSize = 3) {
  const results = [];
  
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(query => processSingleQuery(query))
    );
    
    results.push(...batchResults);
    
    // Delay between batches
    if (i + batchSize < queries.length) {
      await safeDelay();
    }
  }
  
  return results;
}
```

### Memory Management
```javascript
async function processResultsStream(results, processor) {
  for (const result of results) {
    await processor(result);
    
    // Periodic garbage collection
    if (global.gc) {
      global.gc();
    }
  }
}
```

## 🔧 Configuration Management

### Environment Loading
```javascript
async function loadEnvConfig() {
  try {
    const envContent = await fs.readFile('env.config', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        envVars[key.trim()] = value.trim();
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('❌ Error loading env.config:', error.message);
    return {};
  }
}
```

### Configuration Structure
```javascript
export const config = {
  googleSearch: {
    apiKeys: [],                    // Populated from env.config
    searchEngineId: "4385aef0f424b4b5b",
    baseUrl: "https://www.googleapis.com/customsearch/v1",
    maxResultsPerQuery: 10,
    currentKeyIndex: 0
  },
  
  gemini: {
    apiKey: null,                   // Populated from env.config
    baseUrl: "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
    model: "gemini-2.5-flash"
  },
  
  http: {
    timeout: 20000,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    acceptLanguage: "en-US,en;q=0.9",
    delayBetweenRequests: 2000
  }
};
```

## 🧪 Testing and Debugging

### API Key Management Tool
```javascript
async function showMenu() {
  console.log('\n🔑 API Key Management Tool');
  console.log('─'.repeat(40));
  console.log('1. List all API keys');
  console.log('2. Add new API key');
  console.log('3. Replace existing API key');
  console.log('4. Remove API key');
  console.log('5. Exit');
  
  const choice = await new Promise(resolve => {
    rl.question('\nSelect an option (1-5): ', resolve);
  });
  
  switch (choice) {
    case '1': await listApiKeys(); break;
    case '2': await addApiKey(); break;
    case '3': await replaceApiKey(); break;
    case '4': await removeApiKey(); break;
    case '5': console.log('👋 Goodbye!'); rl.close(); return;
    default: console.log('❌ Invalid option');
  }
  
  await showMenu();
}
```

### Debug Functions
```javascript
// Debug API key loading
function debugApiKeys() {
  const envVars = await loadEnvConfig();
  const keys = getApiKeys(envVars);
  console.log(`Loaded ${keys.length} API keys:`, keys.map(k => k.substring(0, 20) + '...'));
}

// Debug query generation
async function debugQueryGeneration(niche) {
  const queries = await generateQueriesWithGemini(niche, 'google_search');
  console.log('Generated queries:', queries);
}

// Debug content validation
function debugContentValidation(html, url, niche) {
  const validator = new ContentValidator(niche);
  const result = validator.validateContent(html, url);
  console.log('Validation result:', result);
}
```

## 🔒 Security and Ethics

### Rate Limiting Implementation
```javascript
// Built-in delays to respect server resources
await safeDelay(); // 2-5 second random delay

// API quota management
if (response.status === 429) { // Rate limit exceeded
  console.log('⚠️  API quota/rate limit exceeded for key', currentKeyIndex);
  rotateApiKey();
  retryRequest();
}
```

### Content Validation Ethics
```javascript
// Only scrape publicly available information
function validateScrapingEthics(url) {
  // Check robots.txt compliance
  // Respect rate limits
  // Only scrape business contact information
  // Avoid personal/sensitive data
}
```

## 📊 Monitoring and Logging

### Comprehensive Logging
```javascript
// Progress tracking
console.log(`🔍 Query ${current}/${total}: "${query}"`);

// API usage monitoring
console.log(`⚠️  API quota/rate limit exceeded for key ${keyIndex}, rotating...`);

// Results summary
console.log(`✅ Found ${results.length} results for: "${query}"`);

// Performance metrics
const startTime = Date.now();
// ... processing ...
const duration = Date.now() - startTime;
console.log(`⏱️  Query completed in ${duration}ms`);
```

## 🚀 Deployment Considerations

### Environment Setup
1. **API Keys**: Configure Google Custom Search and Gemini AI keys
2. **Dependencies**: Install Node.js and npm packages
3. **File Permissions**: Ensure write access for output files
4. **Network Access**: Verify internet connectivity for API calls

### Production Optimizations
```javascript
// Memory optimization for large datasets
const results = [];
for (const item of largeDataset) {
  results.push(processItem(item));
  
  // Periodic garbage collection
  if (results.length % 1000 === 0) {
    global.gc && global.gc();
  }
}
```

### Error Handling
```javascript
// Comprehensive error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  
  // Graceful degradation
  if (error.code === 'QUOTA_EXCEEDED') {
    return await fallbackOperation();
  }
  
  throw error;
}
```

## 🎯 Key Technical Decisions

### 1. **AI-Powered Query Generation**
- **Why**: Manual queries are limited and don't adapt to different niches
- **How**: Gemini AI generates context-aware, SEO-optimized queries
- **Benefits**: Better search results, language adaptation, contact-focused queries

### 2. **Multi-Source Data Extraction**
- **Why**: Different sources provide different types of contact information
- **How**: Google Search for business websites, LinkedIn for professional profiles
- **Benefits**: Comprehensive coverage, diverse data types

### 3. **Intelligent Content Validation**
- **Why**: Raw scraping produces irrelevant results
- **How**: Scoring algorithm with business indicators and platform filtering
- **Benefits**: High-quality results, reduced false positives

### 4. **Unlimited API Key Support**
- **Why**: API quotas limit scraping capacity
- **How**: Automatic detection and rotation of unlimited keys
- **Benefits**: Higher throughput, better reliability

### 5. **Interruption Handling**
- **Why**: Long-running processes can be interrupted
- **How**: Global state management with signal handlers
- **Benefits**: No data loss, user-friendly experience

### 6. **Contact-Focused Queries**
- **Why**: General queries find home pages, not contact pages
- **How**: AI prompts specifically target contact information
- **Benefits**: Higher success rate for contact extraction

## 🔧 Common Issues and Solutions

### 1. **API Quota Exceeded**
```javascript
// Solution: Automatic key rotation
if (response.status === 429) {
  currentKeyIndex = (currentKeyIndex + 1) % config.googleSearch.apiKeys.length;
  return await searchGoogle(query, maxResults); // Retry
}
```

### 2. **No Results Found**
```javascript
// Solution: More permissive content validation
const isRelevant = score >= -20; // Very permissive threshold
```

### 3. **Low Quality Results**
```javascript
// Solution: Contact-focused query generation
const prompt = `Generate queries that will find CONTACT PAGES and CONTACT INFORMATION. Include terms like "contact", "coordonnées", "téléphone", "email", "adresse"`;
```

### 4. **Memory Issues**
```javascript
// Solution: Stream processing
for (const result of results) {
  await processResult(result);
  if (global.gc) global.gc(); // Periodic cleanup
}
```

### 5. **Rate Limiting**
```javascript
// Solution: Built-in delays
await safeDelay(); // 2-5 second random delay between requests
```

## 📈 Performance Metrics

### Expected Performance
- **Google Search**: 25 queries × 10 results = 250 potential pages
- **LinkedIn**: 12 queries × 20 results = 240 potential profiles
- **Processing Time**: ~2-5 seconds per page + delays
- **Success Rate**: 60-80% for relevant content
- **Memory Usage**: ~50-100MB for typical runs

### Optimization Strategies
1. **Parallel Processing**: Process multiple queries simultaneously
2. **Key Rotation**: Use multiple API keys for higher throughput
3. **Smart Filtering**: Early rejection of irrelevant content
4. **Memory Management**: Stream processing for large datasets
5. **Caching**: Avoid re-processing identical content

## 🎯 Success Patterns

### Best Practices for AI Agents
1. **Understand the Niche**: Use specific business types and locations
2. **Language Adaptation**: Use French terms for Moroccan businesses
3. **Contact Focus**: Emphasize contact page targeting
4. **Quality over Quantity**: Focus on relevant results
5. **Error Handling**: Implement graceful degradation
6. **User Experience**: Provide clear progress feedback

### Technical Excellence
1. **Modular Architecture**: Easy to maintain and extend
2. **Comprehensive Logging**: Full visibility into operations
3. **Robust Error Handling**: Graceful failure recovery
4. **Performance Optimization**: Efficient resource usage
5. **Security Considerations**: Respect rate limits and terms of service

---

This comprehensive guide provides AI agents with complete technical understanding of the Morocco Web Scraper project, enabling them to provide accurate assistance, debugging, and enhancement suggestions. 