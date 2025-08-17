import { config } from '../config.js';

/**
 * Extract email addresses from HTML content with enhanced patterns
 * @param {string} html - HTML content to search
 * @returns {string[]} - Array of unique valid email addresses
 */
export function extractEmails(html) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  // Enhanced email regex patterns to catch more variations
  const emailPatterns = [
    // Standard email pattern
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?!png|jpg|gif|jpeg|svg|webp)[a-zA-Z]{2,}/gi,
    
    // Email with spaces (common in contact forms)
    /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*(?!png|jpg|gif|jpeg|svg|webp)[a-zA-Z]{2,}/gi,
    
    // Email with [at] and [dot] obfuscation
    /[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+\s*\[dot\]\s*[a-zA-Z]{2,}/gi,
    
    // Email with (at) and (dot) obfuscation
    /[a-zA-Z0-9._%+-]+\s*\(at\)\s*[a-zA-Z0-9.-]+\s*\(dot\)\s*[a-zA-Z]{2,}/gi,
    
    // Email in mailto: links
    /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    
    // Email in contact forms (data attributes)
    /data-email="([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"/gi,
    
    // Email in JSON-like structures
    /"email"\s*:\s*"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"/gi,
    
    // Email in script tags (common in contact forms)
    /emailAddress\s*[:=]\s*["']([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})["']/gi
  ];
  
  const allEmails = new Set();
  
  // Extract emails using all patterns
  emailPatterns.forEach(pattern => {
    const matches = html.match(pattern) || [];
    matches.forEach(match => {
      // Clean up the email (remove mailto:, data attributes, etc.)
      let cleanEmail = match;
      if (match.startsWith('mailto:')) {
        cleanEmail = match.replace('mailto:', '');
      } else if (match.includes('data-email="')) {
        cleanEmail = match.match(/data-email="([^"]+)"/)?.[1] || match;
      } else if (match.includes('"email"')) {
        cleanEmail = match.match(/"email"\s*:\s*"([^"]+)"/)?.[1] || match;
      } else if (match.includes('emailAddress')) {
        cleanEmail = match.match(/emailAddress\s*[:=]\s*["']([^"']+)["']/)?.[1] || match;
      }
      
      // Handle obfuscated emails
      if (cleanEmail.includes('[at]')) {
        cleanEmail = cleanEmail.replace(/\s*\[at\]\s*/g, '@');
      }
      if (cleanEmail.includes('(at)')) {
        cleanEmail = cleanEmail.replace(/\s*\(at\)\s*/g, '@');
      }
      if (cleanEmail.includes('[dot]')) {
        cleanEmail = cleanEmail.replace(/\s*\[dot\]\s*/g, '.');
      }
      if (cleanEmail.includes('(dot)')) {
        cleanEmail = cleanEmail.replace(/\s*\(dot\)\s*/g, '.');
      }
      
      // Remove extra spaces
      cleanEmail = cleanEmail.replace(/\s+/g, '');
      
      if (isValidEmail(cleanEmail)) {
        // Normalize email for better deduplication
        const normalizedEmail = normalizeEmail(cleanEmail);
        allEmails.add(normalizedEmail);
      }
    });
  });
  
  return Array.from(allEmails);
}

/**
 * Validate email address and check against exclusion patterns
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email is valid and not excluded
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Enhanced email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return false;
  }

  // Check against excluded patterns
  for (const pattern of config.excludedEmailPatterns) {
    if (pattern.test(email)) {
      return false;
    }
  }

  // Additional validation: check for common invalid patterns
  const invalidPatterns = [
    /^[0-9]+@/, // Email starting with numbers only
    /@[0-9]+\.[a-zA-Z]+$/, // Domain with only numbers
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{1}$/, // Single letter TLD
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\.[a-zA-Z]{2,}$/, // Double TLD
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(email)) {
      return false;
    }
  }

  return true;
}

/**
 * Normalize email address for better deduplication
 * @param {string} email - Email address to normalize
 * @returns {string} - Normalized email address
 */
function normalizeEmail(email) {
  if (!email) return '';
  
  // Convert to lowercase
  let normalized = email.toLowerCase().trim();
  
  // Remove common email variations
  normalized = normalized.replace(/\+[^@]+@/, '@'); // Remove +tags
  
  // Remove common disposable email domains and fake emails
  const disposableDomains = [
    '10minutemail.com', 'guerrillamail.com', 'tempmail.org',
    'mailinator.com', 'throwaway.email', 'temp-mail.org',
    'example.com', 'domain.com', 'email.com', 'hosting.com',
    'test.com', 'demo.com', 'sample.com', 'placeholder.com'
  ];
  
  // Remove institutional/educational emails that are not relevant to business niche
  const institutionalDomains = [
    // Moroccan institutions
    'um6p.ma', 'um6ss.ma', 'um5.ma', 'um6.ma', 'um7.ma', 'um8.ma',
    'ofppt.ma', 'ens.ma', 'enam.ma', 'ena.ma', 'inpt.ma', 'emi.ma',
    'esith.ma', 'esca.ma', 'escaa.ma', 'uca.ma', 'ucam.ma', 'ucd.ma',
    'ucm.ma', 'ucf.ma', 'ucg.ma',
    
    // Common educational domains worldwide
    'edu', 'ac', 'school', 'college', 'university', 'institute', 'academy',
    'ac.ma', 'edu.ma', 'gov.ma', 'gouv.ma', 'ma.ma', 'ma.gov.ma', 'ma.gouv.ma',
    
    // Common institutional patterns
    'campus', 'faculty', 'department', 'division', 'bureau', 'office',
    'ministry', 'administration', 'service', 'agency', 'authority', 'council',
    'foundation', 'association', 'society', 'organization', 'corporation'
  ];
  
  const domain = normalized.split('@')[1];
  
  // Check if domain contains any institutional keywords
  const isInstitutional = institutionalDomains.some(institutional => 
    domain === institutional.toLowerCase()
  );
  
  if (disposableDomains.includes(domain) || isInstitutional) {
    return ''; // Return empty string to exclude these emails
  }
  
  return normalized;
} 