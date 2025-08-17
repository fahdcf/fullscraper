import axios from 'axios';
import { config } from '../config.js';
import https from 'https';

/**
 * Fetch HTML content from a URL with proper headers and error handling
 * @param {string} url - The URL to fetch
 * @returns {Promise<string|null>} - HTML content or null if failed
 */
export async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      timeout: config.http.timeout,
      headers: {
        'User-Agent': config.http.userAgent,
        'Accept-Language': config.http.acceptLanguage,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      maxRedirects: 3, // Reduced from 5 to avoid redirect loops
      validateStatus: function (status) {
        return status < 400; // Accept status codes less than 400
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Allow self-signed certificates
        timeout: config.http.timeout
      })
    });

    return response.data;

  } catch (error) {
    // Handle specific error types
    if (error.code === 'ECONNRESET') {
      console.log(`Connection reset for ${url}`);
    } else if (error.code === 'ENOTFOUND') {
      console.log(`Domain not found for ${url}`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`Timeout for ${url}`);
    } else if (error.response) {
      console.log(`HTTP ${error.response.status} for ${url}`);
    } else {
      console.log(`Failed to fetch ${url}: ${error.message}`);
    }
    
    return null;
  }
}

/**
 * Delay function for rate limiting
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after delay
 */
export function delay(ms = config.http.delayBetweenRequests) {
  return new Promise(resolve => setTimeout(resolve, ms));
} 