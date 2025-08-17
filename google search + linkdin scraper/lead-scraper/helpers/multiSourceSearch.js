import { config } from '../config.js';
import { searchGoogle } from './googleSearch.js';
import { isValidPhone } from './extractPhones.js';
import { fetchPage } from './fetchPage.js';
import { ContentValidator } from './contentValidator.js';
import chalk from 'chalk';

// Anti-ban configuration
const ANTI_BAN_CONFIG = {
  minDelay: 3000,
  maxDelay: 7000,
  randomDelay: true,
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ]
};

/**
 * Get random user agent
 */
function getRandomUserAgent() {
  const index = Math.floor(Math.random() * ANTI_BAN_CONFIG.userAgents.length);
  return ANTI_BAN_CONFIG.userAgents[index];
}

/**
 * Get random delay between requests
 */
function getRandomDelay() {
  const min = ANTI_BAN_CONFIG.minDelay;
  const max = ANTI_BAN_CONFIG.maxDelay;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Safe delay function with logging
 */
async function safeDelay(ms, reason = 'Rate limiting') {
  console.log(`⏳ ${reason}: Waiting ${ms}ms...`);
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search LinkedIn profiles using Google Custom Search
 * @param {string} query - Search query
 * @param {string} niche - Target niche for validation
 * @returns {Promise<Array>} Array of LinkedIn profile objects
 */
export async function searchLinkedIn(query, niche, onProfileAdded = null) {
  try {
    console.log(`🔒 Starting safe LinkedIn search for: "${query}"`);
    // Enhanced query to find LinkedIn profiles
    const enhancedQuery = `${query} site:linkedin.com/company/ OR site:linkedin.com/in/`;
    console.log(`🔒 Starting safe Google search for: "${enhancedQuery}" (linkedin)`);
    // Add delay to avoid rate limiting
    const delay = Math.floor(Math.random() * 4000) + 3000;
    console.log(`⏳ Pre-search delay: Waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    let searchResults = [];
    // Always fetch 2 pages (20 results) for both global and user-based flows
    for (let start = 1; start <= 2; start++) {
      const pageResults = await searchGoogle(enhancedQuery, 10, (start - 1) * 10 + 1);
      if (Array.isArray(pageResults)) searchResults.push(...pageResults);
    }

    if (searchResults.length === 0) {
      console.log(`⚠️  No search results found for: "${enhancedQuery}"`);
      return [];
    }

    console.log(`✅ Found ${searchResults.length} search results for: "${enhancedQuery}"`);

    const linkedInProfiles = [];
    // Process each search result
    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      console.log(`🔍 Processing result ${i + 1}: ${result.url || result.link}`);
      // Add delay between profile processing
      if (i > 0) {
        const profileDelay = Math.floor(Math.random() * 4000) + 3000;
        console.log(`⏳ Between LinkedIn profile processing: Waiting ${profileDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, profileDelay));
      }
      try {
        // Extract LinkedIn profile info
        const profileInfo = await extractLinkedInProfileInfo(result.url || result.link, result.title, result.snippet, niche);
        if (profileInfo) {
          // Attach original query for AI context
          profileInfo.query = query;
          linkedInProfiles.push(profileInfo);
          console.log(`✅ Added profile: ${profileInfo.name}`);
          // Notify parent about new profile for interruption handling
          if (onProfileAdded) {
            onProfileAdded(profileInfo);
          }
        } else {
          console.log(`❌ Skipped result: Not a valid LinkedIn profile`);
        }
      } catch (error) {
        console.log(`⚠️  Error processing LinkedIn profile: ${error.message}`);
        continue;
      }
    }
    console.log(`✅ LinkedIn search completed: ${linkedInProfiles.length} profiles found`);
    return linkedInProfiles;
  } catch (error) {
    console.error(`❌ LinkedIn search error: ${error.message}`);
    return [];
  }
}

/**
 * Enhanced search with multiple data sources
 * @param {string} query - Search query
 * @param {string} dataSource - Data source type
 * @returns {Array} Array of search results
 */
export async function searchMultiSource(query, dataSource) {
  switch (dataSource) {
    case 'linkedin':
      return await searchLinkedIn(query);
    case 'google_search':
    default:
      return await searchGoogle(query);
  }
}

/**
 * Get anti-ban configuration for external use
 */
export function getAntiBanConfig() {
  return ANTI_BAN_CONFIG;
}

/**
 * Enhanced Google search with anti-ban measures
 * @param {string} query - Search query
 * @param {string} source - Data source type
 * @returns {Array} Array of search results
 */
async function searchGoogleWithAntiBan(query, source) {
  try {
    console.log(`🔒 Starting safe Google search for: "${query}" (${source})`);
    
    // Add random delay before search
    await safeDelay(getRandomDelay(), 'Pre-search delay');
    
    // Use Google Search API with enhanced safety
    const searchResults = await searchGoogle(query);
    
    if (!searchResults || searchResults.length === 0) {
      console.log(`⚠️  No search results found for: "${query}"`);
      return [];
    }
    
    console.log(`✅ Found ${searchResults.length} search results for: "${query}"`);
    return searchResults;
    
  } catch (error) {
    console.error(`❌ Error in safe Google search: ${error.message}`);
    return [];
  }
}

/**
 * Enhanced Google search with custom headers
 * @param {string} query - Search query
 * @param {string} userAgent - Custom user agent
 * @returns {Array} Array of search results
 */
async function searchGoogleWithHeaders(query, userAgent) {
  try {
    console.log(`🔒 Starting enhanced Google search with custom headers`);
    
    // Add random delay before search
    await safeDelay(getRandomDelay(), 'Pre-search delay with headers');
    
    // Use Google Search API with custom headers
    const searchResults = await searchGoogle(query);
    
    if (!searchResults || searchResults.length === 0) {
      console.log(`⚠️  No search results found with headers for: "${query}"`);
      return [];
    }
    
    console.log(`✅ Found ${searchResults.length} search results with headers for: "${query}"`);
    return searchResults;
    
  } catch (error) {
    console.error(`❌ Error in enhanced Google search: ${error.message}`);
    return [];
  }
}

/**
 * Extract LinkedIn profile information from search result
 * @param {string} url - LinkedIn URL
 * @param {string} title - Search result title
 * @param {string} snippet - Search result snippet
 * @param {string} niche - Target niche for validation
 * @returns {Object|null} LinkedIn profile object or null
 */
async function extractLinkedInProfileInfo(url, title, snippet, niche) {
  try {
    // Check if URL is valid
    if (!url || typeof url !== 'string') {
      return null;
    }
    
    // Check if this is a LinkedIn profile or company page
    if (!url.includes('linkedin.com/in/') && !url.includes('linkedin.com/company/')) {
      return null;
    }
    
    // Extract name from title
    let name = title || '';
    
    // Clean up the name
    if (name.includes('|')) {
      name = name.split('|')[0].trim();
    }
    if (name.includes(' - ')) {
      name = name.split(' - ')[0].trim();
    }
    if (name.includes('LinkedIn')) {
      name = name.replace('LinkedIn', '').trim();
    }
    
    // Extract bio from snippet
    let bio = snippet || '';
    
    // Clean up bio
    if (bio.includes('...')) {
      bio = bio.replace(/\.\.\./g, ' ');
    }
    
    // Determine if this is a company page or individual profile
    const isCompanyPage = url.includes('linkedin.com/company/');
    
    // Extract profile URL
    const profileUrl = url;
    
    // Create profile object - removed strict niche validation
    const profile = {
      name: name,
      profileUrl: profileUrl,
      bio: bio,
      source: 'linkedin',
      query: '', // Will be filled by calling function
      isCompanyPage: isCompanyPage
    };
    
    return profile;
    
  } catch (error) {
    console.error(`❌ Error extracting LinkedIn profile info: ${error.message}`);
    return null;
  }
} 