/**
 * Configuration file for the Maps Scraper
 */

module.exports = {
  // Default search query (use + for spaces)
  defaultSearchQuery: 'cabient+dentaire+atlas',
  
  // Request settings
  requestSettings: {
    timeout: 10000, // 10 seconds
    delayBetweenRequests: 1, // 1 second delay
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  },
  
  // Email filtering blacklist
  emailBlacklist: [
    'no-reply', 'sentry', 'moofin',
    'example.com', 'example.org', 'example.net',
    'test@', 'demo@', 'sample@', 'placeholder@',
    'your-email@', 'youremail@', 'email@example',
    'admin@example', 'info@example', 'contact@example',
    'support@example', 'hello@example', 'mail@example',
    'noreply@', 'donotreply@', 'no_reply@'],
  
  // Social media platforms to filter out
  socialMediaFilters: ['instagram', 'wa.me', 'facebook', 'whatsapp', 'twitter', 'linkedin'],
  
  // Phone number regex for different countries
  phoneRegex: {
    morocco: /\b(?:\+212[\s\-]?|0)(5|6|7)(?:[\s\-]?\d){8}\b/g,
    france: /\b(?:\+33|0)[1-9](?:[\s\-]?\d){8}\b/g,
    international: /\b\+\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,9}\b/g
  },
  
  // Output settings
  output: {
    saveToFile: true,
    filename: 'results', // Will be appended with timestamp
    format: 'json'
  },

  // Gemini API settings
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSyBLq9NEBbVcfRhRn9fTJcE1WtDEv6azKXo', // Replace with your actual key or set GEMINI_API_KEY env var
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  }
};
