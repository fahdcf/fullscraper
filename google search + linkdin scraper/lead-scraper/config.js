import fs from 'fs/promises';
import path from 'path';

// Load environment variables from env.config file
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
    console.warn('⚠️  env.config file not found, using default configuration');
    return {};
  }
}

// Get API keys from environment - now supports unlimited keys
function getApiKeys(envVars) {
  const keys = [];
  
  // Check for numbered keys (GOOGLE_API_KEY_1, GOOGLE_API_KEY_2, etc.)
  let i = 1;
  while (true) {
    const key = envVars[`GOOGLE_API_KEY_${i}`];
    if (!key) break; // Stop when no more keys found
    
    if (key && 
        key !== 'YOUR_SECOND_API_KEY_HERE' && 
        key !== 'YOUR_THIRD_API_KEY_HERE' && 
        key !== 'YOUR_FOURTH_API_KEY_HERE' && 
        key !== 'YOUR_FIFTH_API_KEY_HERE' &&
        key !== 'YOUR_SIXTH_API_KEY_HERE' &&
        key !== 'YOUR_SEVENTH_API_KEY_HERE' &&
        key !== 'YOUR_EIGHTH_API_KEY_HERE' &&
        key !== 'YOUR_NINTH_API_KEY_HERE' &&
        key !== 'YOUR_TENTH_API_KEY_HERE' &&
        key.length > 20) { // Basic validation - API keys are usually long
      keys.push(key);
    }
    i++;
  }
  
  // Also check for alternative naming patterns
  const alternativePatterns = [
    'GOOGLE_API_KEY_A', 'GOOGLE_API_KEY_B', 'GOOGLE_API_KEY_C',
    'GOOGLE_API_KEY_PRIMARY', 'GOOGLE_API_KEY_SECONDARY', 'GOOGLE_API_KEY_BACKUP',
    'GOOGLE_API_KEY_MAIN', 'GOOGLE_API_KEY_ALT1', 'GOOGLE_API_KEY_ALT2'
  ];
  
  for (const pattern of alternativePatterns) {
    const key = envVars[pattern];
    if (key && 
        !key.includes('YOUR_') && 
        !key.includes('PLACEHOLDER') &&
        key.length > 20) {
      keys.push(key);
    }
  }
  
  return keys;
}

// Configuration file - Easy to modify API keys and settings
export const config = {
  // Google Custom Search API Configuration
  googleSearch: {
    apiKeys: [], // Will be populated from env.config
    searchEngineId: "4385aef0f424b4b5b", // Will be overridden from env.config
    baseUrl: "https://www.googleapis.com/customsearch/v1",
    maxResultsPerQuery: 10,
    currentKeyIndex: 0
  },

  // Gemini AI Configuration
  gemini: {
    apiKey: null, // Will be populated from env.config
    baseUrl: "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
    model: "gemini-1.5-flash"
  },

  // HTTP Request Configuration
  http: {
    timeout: 15000, // Reduced from 20s to 15s for faster processing
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    acceptLanguage: "en-US,en;q=0.9",
    delayBetweenRequests: 1000 // Reduced from 2s to 1s for faster processing
  },

  // Generic Search Query Templates for Any Niche (AI-Powered)
  // These are fallback templates - the main system uses Gemini AI to generate niche-specific queries
  searchQueries: [
    // Generic business templates (used as fallback if AI fails)
    "business+contact+Morocco",
    "company+services+Maroc",
    "professional+services+contact",
    "business+directory+Morocco",
    "company+information+Maroc"
  ],

  // URL Filtering - Domains to exclude
  excludedDomains: [
    // Social media and content platforms
    "google.com", "gstatic.com", "ggpht.com", "schema.org",
    "facebook.com", "youtube.com", "twitter.com", "instagram.com",
    "linkedin.com", "tiktok.com", "snapchat.com", "pinterest.com",
    "reddit.com", "wikipedia.org", "quora.com", "medium.com",
    
    // E-commerce and marketplace
    "amazon.com", "amazon.ma", "ebay.com", "etsy.com",
    "aliexpress.com", "wish.com", "shopify.com",
    
    // News and media
    "bbc.com", "cnn.com", "reuters.com", "bloomberg.com",
    "lemonde.fr", "lefigaro.fr", "maroc.ma", "2m.ma",
    
    // Technology and services
    "microsoft.com", "apple.com", "adobe.com", "salesforce.com",
    "hubspot.com", "mailchimp.com", "zendesk.com", "intercom.com",
    
    // Analytics and tracking
    "google-analytics.com", "googletagmanager.com", "facebook.net",
    "doubleclick.net", "googlesyndication.com", "googleadservices.com",
    
    // CDN and hosting
    "cloudflare.com", "akamai.com", "fastly.com", "aws.amazon.com",
    "heroku.com", "netlify.com", "vercel.com", "github.com",
    
    // Generic and spam domains
    "example.com", "test.com", "localhost", "127.0.0.1",
    "sentry.io", "sentry.wixpress.com", "sentry-next.wixpress.com",
    "ingest.sentry.io", "imli.com",
    
    // Moroccan government and official
    "gov.ma", "maroc.ma", "service-public.ma", "cnss.ma",
    "cnss.gov.ma", "dgss.gov.ma", "adii.gov.ma",
    
    // Job boards and recruitment
    "indeed.com", "monster.com", "glassdoor.com", "reed.co.uk",
    "emploi.ma", "marocannonces.com", "avito.ma",
    
    // Educational institutions
    "edu.ma", "ac.ma", "um5.ac.ma", "ucd.ac.ma", "usmba.ac.ma"
  ],

  // Priority domains for better quality leads (Moroccan business domains)
  priorityDomains: [
    ".ma", ".co.ma", ".com.ma", ".net.ma", ".org.ma",
    "maroc", "morocco", "casablanca", "rabat", "marrakech",
    "fes", "agadir", "tanger", "tanger", "meknes", "oujda",
    "tetouan", "eljadida", "safi", "kenitra", "temara"
  ],

  // Enhanced email filtering - Keywords to exclude in email domains
  excludedEmailPatterns: [
    // Social media and content platforms
    /@.*(google|gstatic|ggpht|schema\.org|facebook|youtube|twitter|instagram|linkedin|tiktok|snapchat|pinterest|reddit|wikipedia|quora|medium)/i,
    
    // E-commerce and marketplace
    /@.*(amazon|ebay|etsy|aliexpress|wish|shopify)/i,
    
    // News and media
    /@.*(bbc|cnn|reuters|bloomberg|lemonde|lefigaro|2m)/i,
    
    // Technology and services
    /@.*(microsoft|apple|adobe|salesforce|hubspot|mailchimp|zendesk|intercom)/i,
    
    // Analytics and tracking
    /@.*(google-analytics|googletagmanager|facebook\.net|doubleclick|googlesyndication|googleadservices)/i,
    
    // CDN and hosting
    /@.*(cloudflare|akamai|fastly|aws|heroku|netlify|vercel|github)/i,
    
    // Generic and spam domains
    /@.*(example|test|localhost|sentry|imli)/i,
    
    // Government and official
    /@.*(gov\.ma|maroc\.ma|service-public\.ma|cnss|dgss|adii)/i,
    
    // Job boards and recruitment
    /@.*(indeed|monster|glassdoor|reed|emploi|marocannonces|avito)/i,
    
    // Educational institutions
    /@.*(edu\.ma|ac\.ma|um5|ucd|usmba)/i,
    
    // Common spam patterns
    /@.*(noreply|no-reply|donotreply|donot-reply|info|contact|support|help|admin|webmaster|postmaster)/i,
    
    // Temporary and disposable emails
    /@.*(temp|disposable|throwaway|10minutemail|guerrillamail|mailinator|tempmail)/i
  ],

  // Output Configuration
  output: {
    csvFile: "morocco-business-results.csv",
    xlsxFile: "morocco-business-results.xlsx",
    defaultFormat: "csv" // "csv" or "xlsx"
  }
};

// Initialize configuration with environment variables
export async function initializeConfig() {
  const envVars = await loadEnvConfig();
  // Only set API keys from env if not already set (e.g. by start.js)
  if (!config.googleSearch.apiKeys || config.googleSearch.apiKeys.length === 0) {
    config.googleSearch.apiKeys = getApiKeys(envVars);
    if (config.googleSearch.apiKeys.length === 0) {
      // Fallback to default key if no env keys
      config.googleSearch.apiKeys = ["AIzaSyDB34zBGAHN4S-RxBKqlAX7UxuyIMWE-iM"];
    }
  }
  
  // Set search engine ID
  if (envVars.GOOGLE_SEARCH_ENGINE_ID) {
    config.googleSearch.searchEngineId = envVars.GOOGLE_SEARCH_ENGINE_ID;
  }
  
  // Set Gemini API key for AI query generation
  if (envVars.GEMINI_API_KEY && envVars.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
    config.gemini.apiKey = envVars.GEMINI_API_KEY;
    console.log(`🤖 Gemini AI API key loaded`);
  } else {
    console.log(`⚠️  Gemini AI API key not configured - AI query generation will use fallback queries`);
  }
  
  // Set request delay
  if (envVars.REQUEST_DELAY) {
    config.http.delayBetweenRequests = parseInt(envVars.REQUEST_DELAY);
  }
  
  // Set timeout
  if (envVars.REQUEST_TIMEOUT) {
    config.http.timeout = parseInt(envVars.REQUEST_TIMEOUT);
  }
  
  console.log(`🔑 Loaded ${config.googleSearch.apiKeys.length} API keys`);
  console.log(`🔍 Configured ${config.searchQueries.length} search queries`);
  
  return config;
} 