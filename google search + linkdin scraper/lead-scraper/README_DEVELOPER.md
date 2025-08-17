# 🔧 Morocco Web Scraper - Developer Documentation

## 📋 Architecture Overview

The Morocco Web Scraper is a Node.js CLI application built with a modular architecture that supports multiple data sources, AI-powered query generation, and intelligent content validation.

### Core Components

```
bot-scraper/
├── scraper.js              # Main entry point
├── config.js               # Configuration management
├── env.config              # Environment variables
├── helpers/                # Core functionality modules
│   ├── geminiAI.js        # AI query generation
│   ├── googleSearch.js    # Google Custom Search API
│   ├── multiSourceSearch.js # Multi-source search orchestration
│   ├── contentValidator.js # Content validation and filtering
│   ├── exportToCsv.js     # Data export functionality
│   ├── extractEmails.js   # Email extraction utilities
│   ├── extractPhones.js   # Phone number extraction
│   └── fetchPage.js       # HTTP request handling
├── manage_api_keys.js      # API key management tool
└── package.json           # Dependencies and scripts
```

## 🔄 Data Flow Architecture

```
User Input → Query Generation → Search Execution → Content Extraction → Validation → Export
     ↓              ↓              ↓              ↓              ↓           ↓
  Niche Input → Gemini AI → Google/LinkedIn → HTML Parsing → Filtering → CSV/Excel/TXT
```

## 🧠 AI-Powered Query Generation

### Gemini AI Integration (`helpers/geminiAI.js`)

The system uses Google's Gemini AI to generate intelligent, SEO-optimized search queries based on the target niche.

#### Key Functions:

```javascript
// Main query generation function
export async function generateQueriesWithGemini(niche, source = 'google_search')

// Language detection for Moroccan niches
function detectNicheLanguage(niche)

// Source-specific prompt generation
async function generateGoogleSearchPrompt(niche, language, frenchCount, arabicCount, otherCount)
async function generateLinkedInPrompt(niche, language, frenchCount, arabicCount, otherCount)
```

#### Query Generation Logic:

1. **Language Detection**: Automatically detects if niche targets Moroccan businesses
2. **Source-Specific Counts**: 
   - Google Search: 25 queries (20 French + 5 Arabic for Moroccan)
   - LinkedIn: 12 queries (8 French + 2 Arabic + 2 Other for Moroccan)
3. **Contact-Focused Prompts**: Google Search queries target contact pages specifically
4. **SEO Optimization**: Queries are optimized for search engine ranking

#### API Configuration:
```javascript
const response = await axios.post(
  `${config.gemini.baseUrl}?key=${config.gemini.apiKey}`,
  {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  },
  {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  }
);
```

## 🔍 Google Custom Search Integration

### API Implementation (`helpers/googleSearch.js`)

The Google Custom Search API is used to find relevant business websites and extract contact information.

#### Key Functions:

```javascript
// Main search function with pagination support
export async function searchGoogle(query, maxResults = 10)

// API key rotation and fallback
function getNextApiKey()

// URL filtering and validation
function isValidUrl(url)
```

#### HTTP Request Details:

```javascript
const searchUrl = `${config.googleSearch.baseUrl}?key=${apiKey}&cx=${config.googleSearch.searchEngineId}&q=${encodeURIComponent(query)}&start=${startIndex}&num=${resultsPerPage}`;

const response = await axios.get(searchUrl, {
  headers: {
    'User-Agent': config.http.userAgent,
    'Accept-Language': config.http.acceptLanguage
  },
  timeout: config.http.timeout
});
```

#### Request Parameters:
- **API Key**: Rotated automatically when quota exceeded
- **Search Engine ID**: Custom search engine configured for business websites
- **Query**: AI-generated search terms
- **Start Index**: Pagination support (10 results per page)
- **User Agent**: Rotated to avoid detection
- **Timeout**: 20 seconds per request

#### Rate Limiting:
- **Delay Between Requests**: 2 seconds (configurable)
- **API Key Rotation**: Automatic when quota exceeded
- **Retry Logic**: 3 attempts per query with exponential backoff

## 👥 LinkedIn Profile Extraction

### Implementation (`helpers/multiSourceSearch.js`)

LinkedIn profiles are extracted using Google Custom Search API with LinkedIn-specific search operators.

#### Search Strategy:

```javascript
// LinkedIn search with both company and individual profiles
const linkedInQuery = `${query} site:linkedin.com/company/ OR site:linkedin.com/in/`;

// Multiple pages of results
const results = await searchGoogle(linkedInQuery, 20); // 2 pages × 10 results
```

#### Profile Extraction Logic:

```javascript
export async function extractLinkedInProfileInfo(url, title, snippet, niche) {
  // Extract profile information from LinkedIn URLs
  const profileInfo = {
    name: extractNameFromTitle(title),
    profileUrl: url,
    bio: snippet,
    company: extractCompanyFromSnippet(snippet),
    isCompanyPage: url.includes('/company/')
  };
  
  return profileInfo;
}
```

#### Content Validation:
- **Niche Relevance**: Checks if profile matches target business type
- **Professional Indicators**: Validates job titles and company information
- **Location Matching**: Ensures profiles are from target Moroccan cities

## 🔍 Content Validation System

### Smart Filtering (`helpers/contentValidator.js`)

The content validation system uses intelligent scoring to filter relevant results while avoiding false positives.

#### Validation Components:

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

#### Scoring Algorithm:

1. **Positive Scoring**:
   - Target niche keywords: +2 per match
   - Business indicators: +3 (cabinet, clinique, bureau, etc.)
   - Business type match: +5 (healthcare, professional, technology, etc.)
   - Location relevance: +2 (Moroccan cities)

2. **Negative Scoring**:
   - Platform/support patterns: -2 (social media, support pages)
   - Educational content: -2 (universities, courses)
   - Recruitment content: -2 (job boards)

3. **Threshold**: `score >= -20` (very permissive to avoid false negatives)

#### Validation Functions:

```javascript
// Main content validation
validateContent(html, url)

// LinkedIn profile validation
validateLinkedInProfile(profile, niche)

// Contact data validation
validateContactData(emails, phones, url)

// Email validation
validateEmailSmart(email, url)

// Phone validation
validatePhoneSmart(phone, url)
```

## 📧 Contact Information Extraction

### Email Extraction (`helpers/extractEmails.js`)

```javascript
// Comprehensive email regex patterns
const emailPatterns = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/g
];

// Filter out platform/support emails
const platformDomains = [
  'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
  'youtube.com', 'google.com', 'microsoft.com', 'apple.com'
];
```

### Phone Extraction (`helpers/extractPhones.js`)

```javascript
// Moroccan phone number patterns
const moroccanPatterns = [
  /^\+212[67]\d{8}$/,     // +2126XXXXXXXX or +2127XXXXXXXX
  /^0[67]\d{8}$/,         // 06XXXXXXXX or 07XXXXXXXX
  /^212[67]\d{8}$/        // 2126XXXXXXXX or 2127XXXXXXXX
];

// International patterns
const internationalPatterns = [
  /\+[1-9]\d{1,14}/g,     // International format
  /\(\d{3}\)\s*\d{3}-\d{4}/g, // US format
  /\d{3}-\d{3}-\d{4}/g    // US format
];
```

## 📊 Data Export System

### Export Implementation (`helpers/exportToCsv.js`)

The system supports multiple export formats with intelligent formatting and deduplication.

#### Export Functions:

```javascript
// Main export function
export async function exportResults(results, format = 'csv', filename = null, niche = '')

// Text file export (Google Search)
async function exportToText(results, filename, niche = '')

// Excel export (LinkedIn)
async function exportLinkedInToExcel(results, filename)

// CSV export
async function exportToCsv(results, filename)
```

#### Text File Format (Google Search):
```
Email and Phone Numbers Data for: [niche]
Total Emails: X | Total Phone Numbers: Y
Generated on: [timestamp]
────────────────────────────────────────

Emails:
email1@domain.com
email2@domain.com
...

Phone Numbers:
+212612345678
+212712345678
...
```

#### Excel Format (LinkedIn):
| Column | Description |
|--------|-------------|
| Name | Profile name |
| Profile Link | LinkedIn URL |
| Bio | Profile description |
| Company | Company information |

## 🔑 API Key Management System

### Unlimited Key Support (`config.js`)

The system supports unlimited API keys with automatic detection and rotation.

#### Key Detection Logic:

```javascript
function getApiKeys(envVars) {
  const keys = [];
  
  // Check for numbered keys (unlimited)
  let i = 1;
  while (true) {
    const key = envVars[`GOOGLE_API_KEY_${i}`];
    if (!key) break; // Stop when no more keys found
    
    if (isValidKey(key)) {
      keys.push(key);
    }
    i++;
  }
  
  // Check for named keys
  const alternativePatterns = [
    'GOOGLE_API_KEY_A', 'GOOGLE_API_KEY_B', 'GOOGLE_API_KEY_C',
    'GOOGLE_API_KEY_PRIMARY', 'GOOGLE_API_KEY_SECONDARY', 'GOOGLE_API_KEY_BACKUP'
  ];
  
  for (const pattern of alternativePatterns) {
    const key = envVars[pattern];
    if (key && isValidKey(key)) {
      keys.push(key);
    }
  }
  
  return keys;
}
```

#### Key Rotation Strategy:

```javascript
// In googleSearch.js
let currentKeyIndex = 0;

function getNextApiKey() {
  const key = config.googleSearch.apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % config.googleSearch.apiKeys.length;
  return key;
}
```

## 🔄 Interruption Handling

### Global State Management (`scraper.js`)

The system implements robust interruption handling to save partial results.

#### Global Variables:

```javascript
// Global state for interruption handling
let isProcessing = false;
let currentResults = [];
let currentNiche = '';
let currentDataType = '';
```

#### Signal Handlers:

```javascript
function handleGlobalInterruption() {
  console.log('\n⚠️  Scraper interrupted by user');
  
  if (isProcessing && currentResults.length > 0) {
    console.log('💾 Saving partial results...');
    
    if (currentDataType === 'linkedin') {
      saveLinkedInPartialResults(currentResults, currentNiche);
    } else {
      saveGoogleSearchPartialResults(currentResults, currentNiche, currentDataType);
    }
  } else {
    console.log('⚠️  Processing in progress but no results yet...');
  }
  
  console.log('Cleaning up...');
  process.exit(0);
}

// Register signal handlers
process.on('SIGINT', handleGlobalInterruption);
process.on('SIGTERM', handleGlobalInterruption);
```

## 🌐 HTTP Request Management

### Request Configuration (`config.js`)

```javascript
http: {
  timeout: 20000,                    // 20 seconds
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  acceptLanguage: "en-US,en;q=0.9",
  delayBetweenRequests: 2000         // 2 seconds
}
```

### Anti-Detection Measures (`helpers/multiSourceSearch.js`)

```javascript
// Random delay between requests
function safeDelay() {
  const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
  return new Promise(resolve => setTimeout(resolve, delay));
}

// User agent rotation
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
];
```

## 📈 Performance Optimization

### Parallel Processing

```javascript
// Process multiple queries in parallel with controlled concurrency
async function processQueriesInBatches(queries, batchSize = 3) {
  const results = [];
  
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
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
// Stream processing for large datasets
async function processResultsStream(results, processor) {
  for (const result of results) {
    await processor(result);
    
    // Garbage collection hint
    if (global.gc) {
      global.gc();
    }
  }
}
```

## 🔧 Configuration Management

### Environment Loading (`config.js`)

```javascript
async function loadEnvConfig() {
  const envContent = await fs.readFile('env.config', 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  return envVars;
}
```

### Configuration Structure:

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

### Test Scripts

```bash
# Test with sample data
npm run test

# Test specific queries
npm run test-single

# Debug API keys
npm run keys
```

### Debug Functions:

```javascript
// API key debugging
function debugApiKeys() {
  const envVars = await loadEnvConfig();
  const keys = getApiKeys(envVars);
  console.log(`Loaded ${keys.length} API keys`);
}

// Query generation debugging
async function debugQueryGeneration(niche) {
  const queries = await generateQueriesWithGemini(niche, 'google_search');
  console.log('Generated queries:', queries);
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
```

### Performance Metrics

```javascript
// Timing measurements
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

---

This documentation provides a complete technical overview of the Morocco Web Scraper architecture, implementation details, and development guidelines. For user-focused documentation, see `README_USER.md`. 