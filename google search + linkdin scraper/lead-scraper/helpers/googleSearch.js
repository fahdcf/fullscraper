import axios from 'axios';
import { config } from '../config.js';
import chalk from 'chalk';

/**
 * Get current API key and rotate to next if needed
 * @returns {string} Current API key
 */
function getCurrentApiKey() {
  const currentKey = config.googleSearch.apiKeys[config.googleSearch.currentKeyIndex];
  return currentKey;
}

/**
 * Rotate to next API key when quota is exceeded
 */
function rotateApiKey() {
  config.googleSearch.currentKeyIndex = (config.googleSearch.currentKeyIndex + 1) % config.googleSearch.apiKeys.length;
  console.log(`🔄 Rotating to API key ${config.googleSearch.currentKeyIndex + 1}/${config.googleSearch.apiKeys.length}`);
}

/**
 * Search Google using Custom Search API with fallback keys
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results to return (default: 10)
 * @returns {Promise<Array>} - Array of search results with URLs
 */
// Add startIndex param for paging
export async function searchGoogle(query, maxResults = 10, startIndexOverride = null) {
  const maxRetries = config.googleSearch.apiKeys.length;
  const resultsPerPage = 10; // Google API max per page
  const totalPages = Math.ceil(maxResults / resultsPerPage);
  let allResults = [];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = getCurrentApiKey();
      // If startIndexOverride is set, only fetch that page
      if (startIndexOverride !== null) {
        const params = new URLSearchParams({
          key: apiKey,
          cx: config.googleSearch.searchEngineId,
          q: query,
          num: resultsPerPage,
          start: startIndexOverride
        });
        const response = await axios.get(`${config.googleSearch.baseUrl}?${params}`, {
          timeout: 10000
        });
        if (response.data && response.data.items) {
          const pageResults = response.data.items.map(item => ({
            url: item.link,
            title: item.title,
            snippet: item.snippet
          }));
          allResults = allResults.concat(pageResults);
        }
        return allResults.slice(0, maxResults);
      }
      // Search multiple pages (default behavior)
      for (let page = 0; page < totalPages; page++) {
        const startIndex = page * resultsPerPage + 1;
        const params = new URLSearchParams({
          key: apiKey,
          cx: config.googleSearch.searchEngineId,
          q: query,
          num: resultsPerPage,
          start: startIndex
        });
        const response = await axios.get(`${config.googleSearch.baseUrl}?${params}`, {
          timeout: 10000
        });
        if (response.data && response.data.items) {
          const pageResults = response.data.items.map(item => ({
            url: item.link,
            title: item.title,
            snippet: item.snippet
          }));
          allResults = allResults.concat(pageResults);
          if (response.data.items.length < resultsPerPage) {
            break;
          }
        } else {
          break;
        }
        if (page < totalPages - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      return allResults.slice(0, maxResults);
    } catch (error) {
      // Check if it's a quota exceeded error (403) or rate limit (429)
      if (error.response && (error.response.status === 403 || error.response.status === 429)) {
        const errorMessage = error.response.data?.error?.message || '';
        const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('Quota') || 
                           errorMessage.includes('rate') || errorMessage.includes('Rate') ||
                           error.response.status === 429;
        
        if (isQuotaError) {
          console.log(`⚠️  API quota/rate limit exceeded for key ${config.googleSearch.currentKeyIndex + 1}, rotating...`);
          
          // If this is the last key, show quota exceeded message
          if (config.googleSearch.apiKeys.length === 1) {
            console.log(chalk.red(`❌ Daily quota exceeded for your Google Search API key.`));
            console.log(chalk.yellow(`💡 Please try again tomorrow or use a different API key.`));
            return allResults.slice(0, maxResults);
          }
          
          rotateApiKey();
          continue; // Try with next key
        }
      }
      
      // For other errors, log and try next key
      console.error(`❌ Google search failed for query "${query}" (attempt ${attempt + 1}):`, error.message);
      
      if (attempt < maxRetries - 1) {
        rotateApiKey();
        continue;
      }
      
      return allResults.slice(0, maxResults);
    }
  }
  
  console.error(`❌ All API keys exhausted for query "${query}"`);
  return allResults.slice(0, maxResults);
}

/**
 * Filter out irrelevant URLs and prioritize Moroccan business domains
 * @param {Array} urls - Array of URL objects
 * @returns {Array} - Filtered and prioritized array of URLs
 */
export function filterUrls(urls) {
  const filteredUrls = urls.filter(item => {
    const url = item.url.toLowerCase();
    
    // Check against excluded domains
    for (const domain of config.excludedDomains) {
      if (url.includes(domain.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });

  // Score and prioritize URLs based on Moroccan business relevance
  const scoredUrls = filteredUrls.map(item => {
    let score = 0;
    const url = item.url.toLowerCase();
    const title = (item.title || '').toLowerCase();
    const snippet = (item.snippet || '').toLowerCase();
    
    // High priority: Moroccan business domains
    for (const domain of config.priorityDomains) {
      if (url.includes(domain.toLowerCase())) {
        score += 10;
        break;
      }
    }
    
    // Medium priority: Business-related keywords in URL
    const businessKeywords = ['contact', 'about', 'services', 'cabinet', 'clinique', 'centre', 'institut', 'societe', 'entreprise', 'company', 'business', 'office', 'bureau'];
    for (const keyword of businessKeywords) {
      if (url.includes(keyword)) {
        score += 5;
      }
    }
    
    // Medium priority: Business-related keywords in title/snippet
    const titleKeywords = ['contact', 'services', 'cabinet', 'centre', 'consultation', 'soins', 'business', 'company', 'office', 'bureau', 'professionnel'];
    for (const keyword of titleKeywords) {
      if (title.includes(keyword) || snippet.includes(keyword)) {
        score += 3;
      }
    }
    
    // Bonus: Contact page or about page
    if (url.includes('/contact') || url.includes('/about') || url.includes('/nous') || url.includes('/equipe') || url.includes('/team')) {
      score += 8;
    }
    
    // Bonus: Moroccan cities in URL
    const moroccanCities = ['casablanca', 'rabat', 'marrakech', 'fes', 'agadir', 'tanger', 'meknes', 'oujda', 'tetouan', 'eljadida', 'safi', 'kenitra', 'temara'];
    for (const city of moroccanCities) {
      if (url.includes(city)) {
        score += 4;
      }
    }
    
    // Penalty: Generic or non-business domains
    const genericPatterns = ['blog', 'news', 'article', 'forum', 'wiki', 'directory', 'listing'];
    for (const pattern of genericPatterns) {
      if (url.includes(pattern)) {
        score -= 3;
      }
    }
    
    return {
      ...item,
      score: score
    };
  });

  // Sort by score (highest first) and return top results
  return scoredUrls
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(scoredUrls.length, 15)); // Limit to top 15 results per query
}

/**
 * Get API key usage statistics
 * @returns {Object} Usage statistics
 */
export function getApiKeyStats() {
  return {
    totalKeys: config.googleSearch.apiKeys.length,
    currentKeyIndex: config.googleSearch.currentKeyIndex,
    currentKey: getCurrentApiKey()
  };
} 