/**
 * Utility functions for data extraction and processing
 */

/**
 * Extract phone numbers from text using Moroccan phone number pattern
 * @param {string} text - Input text to search
 * @returns {string[]} Array of phone numbers
 */
export function extractPhoneNumbers(text) {
  const regex = /\b(?:\+212[\s\-]?|0)(5|6|7)(?:[\s\-]?\d){8}\b/g; // Morocco phone pattern
  return text.match(regex) || [];
}

/**
 * Extract business names from Google Maps data
 * @param {string} data - Google Maps HTML data
 * @returns {string[]} Array of business names
 */
export function extractBusinessNames(data) {
  const regex = /\b7,\[\[(.*?)\]/gs;
  const allNames = [];
  let blockMatch;

  while ((blockMatch = regex.exec(data)) !== null) {
    const namesRegex = /"(.*?)"/g;
    let nameMatch;
    
    while ((nameMatch = namesRegex.exec(blockMatch[1])) !== null) {
      let name = nameMatch[1].replace(/\\u[\dA-Fa-f]{4}/g, match => 
        String.fromCharCode(parseInt(match.slice(2), 16))
      );
      name = name.replace(/\\+/g, '');
      allNames.push(name);
    }
  }
  return allNames;
}

/**
 * Extract website URLs from Google Maps parts and raw HTML
 * @param {string[]} parts - Array of Google Maps data parts
 * @param {string} rawHtml - Raw HTML content for additional extraction
 * @returns {string[]} Array of website URLs
 */
export function extractWebsites(parts, rawHtml = '') {
  const websites = new Set();

  // Extract from parts
  parts.forEach(part => {
    const patterns = [
      /https?:\/\/[^\\"\s<>)]+/g,
      /url\?q=([^&\s"'<>]+)/g,
      /"url":"([^"]+)"/g
    ];

    patterns.forEach(pattern => {
      const matches = part.match(pattern) || [];
      matches.forEach(match => {
        let website = match;

        // Clean up URL if it's from url?q= format
        if (match.startsWith('url?q=')) {
          website = decodeURIComponent(match.replace('url?q=', ''));
        }

        // Clean up quoted URLs
        website = website.replace(/^"/, '').replace(/"$/, '');

        // Clean and normalize the URL
        website = cleanUrl(website);

        // Filter out non-business websites
        if (website && isBusinessWebsite(website)) {
          // Clean the URL one more time before adding to ensure no trailing characters
          const finalCleanedUrl = cleanUrl(website);
          websites.add(finalCleanedUrl);
        }
      });
    });
  });

  // Also extract directly from HTML for any missed websites
  if (rawHtml) {
    const htmlPattern = /https?:\/\/[^\s"'<>)]+\.(com|ma|org|net|info|biz)[^\s"'<>)]*/gi;
    const htmlMatches = rawHtml.match(htmlPattern) || [];

    htmlMatches.forEach(website => {
      const cleanedWebsite = cleanUrl(website);
      if (cleanedWebsite && isBusinessWebsite(cleanedWebsite)) {
        websites.add(cleanedWebsite);
      }
    });
  }

  return Array.from(websites);
}

/**
 * Clean and normalize a URL
 * @param {string} url - URL to clean
 * @returns {string} Cleaned URL
 */
export function cleanUrl(url) {
  if (!url || typeof url !== 'string') return '';

  // Remove escape characters and decode
  let cleaned = url
    .replace(/\\u003d/g, '=')
    .replace(/\\u0026/g, '&')
    .replace(/\\\\/g, '')  // Remove double backslashes
    .replace(/\\/g, '')    // Remove single backslashes
    .replace(/\s+/g, '')
    .trim();

  // Remove trailing slashes and parameters that look like tracking
  cleaned = cleaned.replace(/\/+$/, '');

  // Ensure proper protocol
  if (cleaned.startsWith('www.')) {
    cleaned = 'https://' + cleaned;
  } else if (cleaned.startsWith('http://www.')) {
    cleaned = cleaned.replace('http://www.', 'https://');
  }

  return cleaned;
}

/**
 * Check if a URL is likely a business website
 * @param {string} url - URL to check
 * @returns {boolean} True if likely a business website
 */
export function isBusinessWebsite(url) {
  if (!url || typeof url !== 'string') return false;

  const cleanedUrl = cleanUrl(url).toLowerCase();

  // Comprehensive list of patterns to exclude
  const excludePatterns = [
    // Google services
    'google.com',
    'google.co',
    'maps.google',
    'schema.org',
    'googleapis.com',
    'gstatic.com',
    'googleusercontent.com',
    'ggpht.com',
    'googlesyndication.com',
    'googleadservices.com',
    'doubleclick.net',
    'google-analytics.com',
    'googletagmanager.com',

    // Social media platforms
    'facebook.com',
    'fb.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'youtube.com',
    'tiktok.com',
    'snapchat.com',

    // Messaging platforms
    'whatsapp.com',
    'wa.me',
    'telegram.org',
    'telegram.me',
    'viber.com',
    'skype.com',

    // Ad networks and tracking
    'tpc.googlesyndication.com',
    'amazon-adsystem.com',
    'adsystem.amazon',
    'doubleclick.net',
    'googletagservices.com',

    // Other non-business domains
    'wikipedia.org',
    'wikimedia.org',
    'github.com',
    'stackoverflow.com',
    'reddit.com'
  ];

  // Check if URL contains any excluded patterns
  if (excludePatterns.some(pattern => cleanedUrl.includes(pattern))) {
    return false;
  }

  // Additional check: if URL contains 'google' anywhere, exclude it
  if (cleanedUrl.includes('google')) {
    return false;
  }

  // Check for valid business domain extensions
  const validExtensions = ['.com', '.ma', '.org', '.net', '.info', '.biz', '.co'];
  const hasValidExtension = validExtensions.some(ext => cleanedUrl.includes(ext));

  if (!hasValidExtension) {
    return false;
  }

  // Check for business-like domain patterns (more specific for dental practices)
  const businessPatterns = [
    'dentiste', 'dental', 'dentaire', 'clinic', 'clinique', 'cabinet',
    'doctor', 'dr', 'centre', 'center', 'orthodont', 'implant',
    'smile', 'teeth', 'tooth', 'oral', 'chirurgien'
  ];
  const hasBusinessPattern = businessPatterns.some(pattern => cleanedUrl.includes(pattern));

  // For dental practices, be more strict - require business pattern or very short domain
  if (hasBusinessPattern) {
    return true;
  } else if (cleanedUrl.length < 50 && !cleanedUrl.includes('?') && !cleanedUrl.includes('&')) {
    // Accept short, clean domains without parameters
    return true;
  } else {
    return false;
  }
}

/**
 * Extract email addresses from website content
 * @param {string} data - Website HTML content
 * @returns {string[]} Array of email addresses
 */
export function extractEmails(data) {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?!jpeg|jpg|png|gif|webp|svg)[a-zA-Z]{2,}/g;
  const emails = data.match(regex) || [];
  
  // Filter out blacklisted and fake emails
  const blacklist = [
    'no-reply', 'sentry', 'moofin',
    'example.com', 'example.org', 'example.net',
    'test@', 'demo@', 'sample@', 'placeholder@',
    'your-email@', 'youremail@', 'email@example',
    'admin@example', 'info@example', 'contact@example',
    'support@example', 'hello@example', 'mail@example',
    'noreply@', 'donotreply@', 'no_reply@'
  ];

  const filtered = Array.from(new Set(emails)).filter(email => {
    const emailLower = email.toLowerCase();
    return !blacklist.some(word => emailLower.includes(word));
  });
  
  return filtered;
}

/**
 * Extract parts from Google Maps HTML using multiple patterns
 * @param {string} html - Google Maps HTML content
 * @returns {string[]} Array of extracted parts
 */
export function extractGoogleMapsParts(html) {
  // Try multiple patterns to extract website/business data
  const patterns = [
    // Original n8n pattern
    /url\?q\\\\[\s\S]*?\],[\s\S]*?,\[[\s\S]*?\],[\s\S]*?,[\s\S]*?,/g,
    // Alternative patterns for different Google Maps formats
    /url\?q=([^&\s"'<>]+)/g,
    /https?:\/\/[^\s"'<>)]+\.[a-z]{2,}/gi,
    /"url":"([^"]+)"/g,
    // Look for business data blocks
    /\[7,\[\[.*?\]\]/g
  ];

  let allParts = [];

  patterns.forEach((pattern, index) => {
    const matches = html.match(pattern) || [];
    if (matches.length > 0) {
      console.log(`Pattern ${index + 1} found ${matches.length} matches`);
      allParts.push(...matches);
    }
  });

  // Remove duplicates
  return [...new Set(allParts)];
}

/**
 * Extract address candidates from HTML using a broad regex and return matches
 * @param {string} html
 * @returns {string[]} array of matched address strings
 */
export function extractAdresse(html) {
  if (!html || typeof html !== 'string') return [];
  const regex = /\"([A-Za-zÀ-ÿ0-9\s'\-\.]+,\s*[A-Za-zÀ-ÿ0-9\s'\-\.]+,\s*[A-Za-zÀ-ÿ0-9\s'\-\.]+,\s*[A-Za-zÀ-ÿ0-9\s'\-\.]+)/g;
  const matches = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (m[1]) {
      const candidate = m[1].replace(/\s+/g, ' ').trim();
      if (candidate.length > 0) matches.push(candidate);
    }
  }
  return matches;
}

/**
 * Filter and rank address candidates to remove obvious non-address strings
 * @param {string[]} candidates
 * @param {string} [city]
 * @returns {string[]} cleaned and ranked candidates
 */
export function filterAddressCandidates(candidates, city = '') {
  if (!Array.isArray(candidates)) return [];

  const blacklistWords = [
    'modifier', "l'adresse", 'horaires', 'etc', 'ajouter', 'signaler', 'avis',
    'site web', 'itinéraire', 'partager', 'enregistrer', 'menu', 'call', 'ouvrir',
    'photos', 'questions', 'suggest', 'update', 'edit'
  ];

  const hasBlacklisted = (s) => {
    const lower = s.toLowerCase();
    return blacklistWords.some(w => lower.includes(w));
  };

  const isNumericCsv = (s) => /^\s*\d+(?:\s*,\s*\d+)+\s*$/.test(s);

  const hasStreetKeyword = (s) => /\b(rue|avenue|av\.?|bd|boulevard|route|quartier|place|lot|imm|res|rés|app)\b/i.test(s);

  const normalizedCity = (city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const containsCity = (s) => normalizedCity && s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalizedCity);

  const cleaned = Array.from(new Set(candidates.map(c => c.replace(/\s+/g, ' ').trim())))
    .filter(c => c.length >= 10 && c.length <= 160)
    .filter(c => c.includes(','))
    .filter(c => /[A-Za-zÀ-ÿ]/.test(c))
    .filter(c => !isNumericCsv(c))
    .filter(c => !hasBlacklisted(c));

  // Rank: city match first, then presence of street keyword, then length descending
  const ranked = cleaned.sort((a, b) => {
    const aCity = containsCity(a) ? 1 : 0;
    const bCity = containsCity(b) ? 1 : 0;
    if (aCity !== bCity) return bCity - aCity;
    const aStreet = hasStreetKeyword(a) ? 1 : 0;
    const bStreet = hasStreetKeyword(b) ? 1 : 0;
    if (aStreet !== bStreet) return bStreet - aStreet;
    return b.length - a.length;
  });

  return ranked;
}

/**
 * Filter parts to exclude social media and messaging platforms
 * @param {string[]} parts - Array of parts to filter
 * @returns {string[]} Filtered array of parts
 */
export function filterSocialMediaParts(parts) {
  const socialMediaFilters = ['instagram', 'wa.me', 'facebook', 'whatsapp', 'twitter', 'linkedin'];
  return parts.filter(part => {
    // Check if any social media filter is included in the part
    const isSocialMedia = socialMediaFilters.some(filter => part.includes(filter));
    return !isSocialMedia && part.endsWith('",');
  });
}

/**
 * Remove duplicate items from array
 * @param {any[]} array - Array to deduplicate
 * @returns {any[]} Array with duplicates removed
 */
export function removeDuplicates(array) {
  return [...new Set(array)];
}

/**
 * Find names that have associated websites
 * @param {string[]} parts - Filtered parts containing website data
 * @param {string[]} names - Array of business names
 * @returns {string[]} Names that have websites
 */
export function findNamesWithWebsites(parts, names) {
  const validNames = [];
  parts.forEach(part => {
    names.forEach(name => {
      try {
        if (part.includes(name)) {
          validNames.push(name);
        }
      } catch (error) {
        // Continue on error
      }
    });
  });
  return removeDuplicates(validNames);
}

/**
 * Normalize phone number by removing spaces and hyphens
 * @param {string} number - Phone number to normalize
 * @returns {string} Normalized phone number
 */
export function normalizePhoneNumber(number) {
  return number.replace(/[\s\-]/g, '');
}

/**
 * Combine names with phone numbers using intelligent matching with deduplication
 * @param {string[]} names - Array of business names
 * @param {string[]} numbers - Array of phone numbers
 * @param {string} originalData - Original Google Maps data for context matching
 * @returns {Object[]} Array of objects with name and number
 */
export function combineNamesAndNumbers(names, numbers, originalData = '') {
  // Step 1: Create unique phone numbers with their best formatted version
  const uniqueNumbers = new Map();

  numbers.forEach(number => {
    const normalized = normalizePhoneNumber(number);
    if (!uniqueNumbers.has(normalized)) {
      // Prefer the formatted version (with hyphens) if available
      uniqueNumbers.set(normalized, number);
    } else {
      // If we already have this number, prefer the one with better formatting
      const existing = uniqueNumbers.get(normalized);
      if (number.includes('-') && !existing.includes('-')) {
        uniqueNumbers.set(normalized, number);
      }
    }
  });

  const uniqueNumbersList = Array.from(uniqueNumbers.values());
  console.log(`Deduplicated ${numbers.length} numbers to ${uniqueNumbersList.length} unique numbers`);

  // Step 2: Match each business name with the best phone number
  const result = [];
  const usedNormalizedNumbers = new Set();

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    let bestMatch = '';
    let bestScore = -1;
    let bestNormalized = '';

    // Look for phone numbers that appear near this business name in the original data
    for (const number of uniqueNumbersList) {
      const normalized = normalizePhoneNumber(number);
      if (usedNormalizedNumbers.has(normalized)) continue;

      // Calculate proximity score by finding how close the name and number appear in the original data
      const nameIndex = originalData.indexOf(name);
      const numberIndex = originalData.indexOf(number);

      if (nameIndex !== -1 && numberIndex !== -1) {
        const distance = Math.abs(nameIndex - numberIndex);
        const score = 1 / (distance + 1); // Closer = higher score

        if (score > bestScore) {
          bestScore = score;
          bestMatch = number;
          bestNormalized = normalized;
        }
      }
    }

    // If we found a good match, use it and mark the normalized version as used
    if (bestMatch && bestScore > 0) {
      usedNormalizedNumbers.add(bestNormalized);
      result.push({
        name: name,
        number: bestMatch
      });
    } else {
      // If no good match found, assign the next available unique number
      let assignedNumber = '';
      for (const number of uniqueNumbersList) {
        const normalized = normalizePhoneNumber(number);
        if (!usedNormalizedNumbers.has(normalized)) {
          assignedNumber = number;
          usedNormalizedNumbers.add(normalized);
          break;
        }
      }
      result.push({
        name: name,
        number: assignedNumber
      });
    }
  }

  return result;
}

/**
 * Combine names with emails
 * @param {string[]} names - Array of business names
 * @param {string[]} emails - Array of email addresses
 * @returns {Object[]} Array of objects with name and email
 */
export function combineNamesAndEmails(names, emails) {
  const minLength = Math.min(names.length, emails.length);
  const result = [];

  for (let i = 0; i < minLength; i++) {
    result.push({
      name: names[i],
      email: emails[i]
    });
  }
  return result;
}

/**
 * Add delay between operations
 * @param {number} seconds - Number of seconds to wait
 * @returns {Promise} Promise that resolves after the delay
 */
export function wait(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}