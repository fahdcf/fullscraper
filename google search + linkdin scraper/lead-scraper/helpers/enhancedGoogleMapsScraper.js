import { MapsScraper } from './googleMapsScraper.js';
import axios from 'axios';
import http from 'http';
import https from 'https';
import os from 'os';

// Optimize HTTP performance with keep-alive and sensible defaults
axios.defaults.httpAgent = new http.Agent({ keepAlive: true });
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true });
axios.defaults.timeout = 10000; // 10 seconds
axios.defaults.headers = axios.defaults.headers || {};
axios.defaults.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export class EnhancedGoogleMapsScraper {
  constructor() {
    this.scraper = new MapsScraper();
  }

  // Helper: Generate main search queries using Gemini
  async generateMainQueriesWithGemini(userQuery, locationContext) {
    try {
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBLq9NEBbVcfRhRn9fTJcE1WtDEv6azKXo';
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

      const prompt = `You are a helpful AI assistant. Given a user's search query for a business type and location (e.g., "dentist in fes"), your task is to generate 5 diverse and unique search queries that are highly likely to find more results for that business type in or around the specified location. 

If the location is in Morocco (e.g., Fes, Casablanca, Rabat), generate queries primarily in French, using common French terms for business types if appropriate. If the location is not Moroccan, use the original language or English.

Focus on varying the terminology, including common synonyms or related terms, and slightly different geographical scopes (e.g., nearby areas, general city search). Do NOT generate queries that are too specific to a single address or very obscure.

Return the 5 queries as a JSON array of strings, like this: ["query 1", "query 2", "query 3", "query 4", "query 5"]. Do NOT include any extra text, explanations, or markdown fences outside the JSON array.

User Query: "${userQuery}"
Location Context: "${locationContext}"

Generated Queries:`;

      const body = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt }
            ]
          }
        ]
      };

      await this.wait(1); // 1 second delay

      const resp = await axios.post(endpoint, body, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        }
      });

      const textResponse = ((resp && resp.data && resp.data.candidates && resp.data.candidates[0] && resp.data.candidates[0].content && resp.data.candidates[0].content.parts) || [])
        .map(p => (p && p.text) ? String(p.text) : '')
        .filter(Boolean)
        .join(' ');
      
      // Attempt to parse the JSON array. Gemini sometimes wraps it in markdown.
      const cleanedResponse = textResponse.replace(/^```json\n/g, '').replace(/\n```$/g, '').trim();

      try {
        const parsed = JSON.parse(cleanedResponse);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          return parsed.slice(0, 5); // Ensure exactly 5 queries
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini main queries response as JSON:', parseError.message);
      }

      return []; // Return empty array if parsing fails or invalid format

    } catch (e) {
      console.error('Error in generateMainQueriesWithGemini:', e.message);
      return [];
    }
  }

  // Helper: Generate sub-queries (neighborhoods/sub-cities) using Gemini
  async generateSubQueriesWithGemini(mainQuery, locationContext) {
    try {
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBLq9NEBbVcfRhRn9fTJcE1WtDEv6azKXo';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const prompt = `You are a helpful AI assistant. Given a general business search query (e.g., "cabinet dentaire fes") and a location context (e.g., "Fes"), your task is to generate 10 highly specific sub-queries. Each sub-query should target a major neighborhood or a well-known smaller area within the given city/country, related to the business type.

If the location is in Morocco (e.g., Fes, Casablanca, Rabat), generate queries primarily in French, using common French terms for neighborhoods if appropriate. If the location is not Moroccan, use the original language or English.

Ensure the sub-queries are distinct and cover significant parts of the city/area. Do NOT include redundant queries or queries that are too broad.

Return the 10 sub-queries as a JSON array of strings, like this: ["sub-query 1", "sub-query 2", ..., "sub-query 10"]. Do NOT include any extra text, explanations, or markdown fences outside the JSON array.

Main Query: "${mainQuery}"
Location Context: "${locationContext}"

Generated Sub-Queries:`;

      const body = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt }
            ]
          }
        ]
      };

      await this.wait(1); // 1 second delay

      const resp = await axios.post(endpoint, body, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        }
      });

      const textResponse = ((resp && resp.data && resp.data.candidates && resp.data.candidates[0] && resp.data.candidates[0].content && resp.data.candidates[0].content.parts) || [])
        .map(p => (p && p.text) ? String(p.text) : '')
        .filter(Boolean)
        .join(' ');
      
      const cleanedResponse = textResponse.replace(/^```json\n/g, '').replace(/\n```$/g, '').trim();

      try {
        const parsed = JSON.parse(cleanedResponse);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          return parsed.slice(0, 10); // Ensure exactly 10 queries
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini sub-queries response as JSON:', parseError.message);
      }

      return [];

    } catch (e) {
      console.error('Error in generateSubQueriesWithGemini:', e.message);
      return [];
    }
  }

  // Helper: Select best address candidate using Gemini generateContent API (BATCHED)
  async batchSelectAddressesWithGemini(businessDataArray) {
    try {
      if (!Array.isArray(businessDataArray) || businessDataArray.length === 0) return [];

      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBLq9NEBbVcfRhRn9fTJcE1WtDEv6azKXo';
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

      let instruction = `You are an expert address extraction AI. Your task is to process a list of business data, each containing a business name, its location context (city), and a list of address candidates extracted from Google Maps HTML.

GOAL: For EACH business entry, return the single candidate string that is MOST LIKELY to be the FULL POSTAL ADDRESS.

STRICT RULES FOR EACH ADDRESS SELECTION:
- Hard Exclusions (NEVER CHOOSE if a candidate contains any of these):
  - Review/comment markers or first-person opinion text: "avis", "écrire un avis", "note", "commentaire", "réponse", "répondu", "J'ai", "Je recommande", "Très bon", "tbarkAllah", "merci", "expérience", "visité", "satisfait", "professionnel", emojis (⭐ 👍 ❤️)
  - UI/controls: "Modifier le nom", "modifier l'adresse", "les horaires", "Suggérer une modification", "Signaler un problème", "Ajouter une photo", "Photos", "Voir les photos", "Directions", "Itinéraire", "Appeler", "Site Web", "Enregistrer", "Partager", "Questions-réponses", "Menu", "Ouvrir dans Google Maps"
  - Status/metadata: "Ouvert", "Fermé", "Ferme à", "Horaires", "Heures", "Mis à jour", "il y a", "hier", "aujourd'hui", "mins", "heures", "jours"
  - Arabic UI/reviews: "مفتوح", "مغلق", "اتجاهات", "موقع الويب", "اتصال", "مشاركة", "التعليقات", "المراجعات", "أضف صورة", "اقتراح تعديل", "زرت", "أنصح", "تجربة", "شكرا"
  - Pure phone numbers, prices, categories only, single-word labels.

- Positive Signals (a candidate is ADDRESS-LIKE if it satisfies BOTH):
  A) Contains at least one address token, for example:
     Rue, Avenue, Av., Blvd, Boulevard, Place, Lot, Lotissement, Résidence, Rés., Immeuble, Bloc, Appartement, App., Bureau, Zone, Route, Road, St, Rd, Quartier, Qrt, حي, شارع, إقامة, زنقة, رقم, n°/N°/No./n°, km
  B) And at least one of:
     - a street number (e.g., "12", "N° 5", "km 3"),
     - the city/locality (match the provided context),
     - a plausible 5-digit postal code (e.g., "30000", "10000"),
     - country/region names (e.g., "Maroc", "Morocco").

- Tie-Breaking / Partials:
  - If one candidate has the street line and another has only city/postal, choose the STREET LINE (do NOT combine strings).
  - Prefer candidates with multiple components separated by commas/newlines: street, locality/city, postal code, country.
  - Prefer candidates that include a substring of the business name only if the string is still address-like per the rules above.
  - Reject very short fragments (<12 chars) unless clearly a street+number.

OUTPUT FORMAT:
Return a JSON array where each element is the selected address string for the corresponding business, or an empty string if no plausible address is found.
Example: ["123 Main St, City", "", "Another Address, 10000"]

BUSINESS DATA TO PROCESS:
`;

      const businessesInput = businessDataArray.map((data, index) => {
        const numberedCandidates = data.candidates.map((c, i) => `${i + 1}. ${c}`).join('\n');
        return `--- Business ${index + 1} ---\nBusiness Name: "${data.businessName}"\nCity: "${data.location}"\nCandidates:\n${numberedCandidates}`;
      }).join('\n\n');

      const body = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: instruction + businessesInput }
            ]
          }
        ]
      };

      // Add a delay before the API call to prevent rate limiting (429 errors)
      await this.wait(1);

      const resp = await axios.post(endpoint, body, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey
        }
      });

      const textResponse = ((resp && resp.data && resp.data.candidates && resp.data.candidates[0] && resp.data.candidates[0].content && resp.data.candidates[0].content.parts) || [])
        .map(p => (p && p.text) ? String(p.text) : '')
        .filter(Boolean)
        .join(' ');
      
      // Remove markdown code block fences if Gemini wrapped the JSON
      const cleanedResponse = textResponse.replace(/^```json\n/g, '').replace(/\n```$/g, '').trim();

      try {
        // Attempt to parse the JSON array
        const parsed = JSON.parse(cleanedResponse);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini batch address response as JSON:', parseError.message);
        // Fallback: If parsing fails, try to extract lines as individual addresses
        return cleanedResponse.split('\n').map(line => line.trim()).filter(Boolean);
      }

      return []; // Return empty array if no valid response
    } catch (e) {
      console.error('Error in batchSelectAddressesWithGemini:', e.message);
      return [];
    }
  }

  // Individual search for each business to get accurate data
  async searchIndividualBusiness(businessName, location) {
    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔍 SEARCHING: "${businessName.substring(0, 60)}${businessName.length > 60 ? '...' : ''}"`);
      console.log(`📍 LOCATION: ${location.toUpperCase()}`);
      console.log(`${'='.repeat(80)}`);

      // Create search query with location to ensure local results
      const searchQuery = `${businessName.replace(/\s+/g, '+')}+${location}`;
      console.log(`🔗 Query: ${searchQuery}`);

      // Scrape Google Maps for this specific business
      console.log(`⏳ Scraping Google Maps...`);
      const googleMapsData = await this.scraper.scrapeGoogleMaps(searchQuery);

      if (!googleMapsData) {
        console.log(`❌ ERROR: No data found from Google Maps`);
        console.log(`${'='.repeat(80)}\n`);
        return null;
      }

      console.log(`✅ SUCCESS: Google Maps data retrieved`);

      // Extract data using the utility functions from googleMapsUtils
      const { extractPhoneNumbers, extractBusinessNames, extractGoogleMapsParts, filterSocialMediaParts, extractWebsites, removeDuplicates, extractAdresse } = await import('./googleMapsUtils.js');

      console.log(`\n📊 EXTRACTING DATA:`);
      const phoneNumbers = extractPhoneNumbers(googleMapsData);
      const businessNames = extractBusinessNames(googleMapsData);
      const parts = extractGoogleMapsParts(googleMapsData);

      console.log(`   📞 Phone numbers found: ${phoneNumbers.length}`);
      if (phoneNumbers.length > 0) {
        phoneNumbers.slice(0, 3).forEach((phone, i) => {
          console.log(`      ${i + 1}. ${phone}`);
        });
        if (phoneNumbers.length > 3) console.log(`      ... and ${phoneNumbers.length - 3} more`);
      }

      console.log(`   🏢 Business names found: ${businessNames.length}`);
      if (businessNames.length > 0) {
        businessNames.slice(0, 2).forEach((name, i) => {
          console.log(`      ${i + 1}. ${name.substring(0, 50)}${name.length > 50 ? '...' : ''}`);
        });
        if (businessNames.length > 2) console.log(`      ... and ${businessNames.length - 2} more`);
      }

      // Filter and extract websites
      console.log(`\n🌐 EXTRACTING WEBSITES:`);
      console.log(`   🔗 Raw data parts found: ${parts.length}`);
      const filteredParts = filterSocialMediaParts(parts);
      console.log(`   ✅ After filtering social media: ${filteredParts.length} parts`);

      const websites = removeDuplicates(
        extractWebsites(filteredParts, googleMapsData)
      );

      console.log(`   🌐 Legitimate websites found: ${websites.length}`);
      if (websites.length > 0) {
        websites.forEach((website, i) => {
          console.log(`      ${i + 1}. ${website}`);
        });
      }

      // Find the best matching business name
      console.log(`\n🎯 MATCHING BUSINESS NAME:`);
      let bestBusinessName = businessName; // Default fallback
      if (businessNames.length > 0) {
        console.log(`   🔍 Searching for best match among ${businessNames.length} names...`);
        // Find the business name that best matches our search
        const searchTerms = businessName.toLowerCase().split(/\s+/);
        console.log(`   🔑 Search terms: [${searchTerms.join(', ')}]`);

        let bestMatch = businessNames[0];
        let bestScore = 0;

        for (const name of businessNames) {
          const nameLower = name.toLowerCase();
          let score = 0;
          for (const term of searchTerms) {
            if (nameLower.includes(term)) {
              score += term.length;
            }
          }
          if (score > bestScore) {
            bestScore = score;
            bestMatch = name;
          }
        }
        bestBusinessName = bestMatch;
        console.log(`   ✅ Best match: "${bestBusinessName}" (score: ${bestScore})`);
      } else {
        console.log(`   ⚠️  No business names found, using search term`);
      }

      // Extract address candidates and pick using Gemini
      const rawAddressCandidates = extractAdresse(googleMapsData);
      let address = ''; // Re-introduced address variable
      if (rawAddressCandidates.length > 0) {
        console.log(`\n📍 ADDRESS CANDIDATES: ${rawAddressCandidates.length}`);
        // Note: Address selection will be done in batch processing later
      }

      // Get the first phone number (most likely to be correct for individual search)
      const phoneNumber = phoneNumbers.length > 0 ? phoneNumbers[0] : '';
      console.log(`\n📞 SELECTED PHONE: ${phoneNumber || 'None found'}`);

      // Get the first website (most likely to be correct for individual search)
      const website = websites.length > 0 ? websites[0] : '';
      console.log(`🌐 SELECTED WEBSITE: ${website || 'None found'}`);

      // Scrape emails from website if available
      let emails = [];
      if (website) {
        console.log(`\n📧 EMAIL EXTRACTION:`);
        console.log(`   🔗 Scraping: ${website}`);
        try {
          console.log(`   ⏳ Waiting 1 second (rate limiting)...`);
          await this.wait(1); // Rate limiting
          console.log(`   🌐 Fetching website content...`);
          const websiteContent = await this.scraper.scrapeWebsite(website);
          console.log(`   📄 Content length: ${websiteContent ? websiteContent.length : 0} characters`);
          const { extractEmails } = await import('./googleMapsUtils.js');
          emails = extractEmails(websiteContent);
          console.log(`   ✅ Emails extracted from main page: ${emails.length}`);
          if (emails.length > 0) {
            emails.forEach((email, i) => {
              console.log(`      ${i + 1}. ${email}`);
            });
          } else {
            // If no emails found, try the contact page
            console.log(`   📧 No emails found on main page, trying contact page...`);
            const contactUrl = website.endsWith('/') ? `${website}contact` : `${website}/contact`;
            console.log(`   🔗 Scraping contact page: ${contactUrl}`);
            try {
              console.log(`   ⏳ Waiting 1 second (rate limiting)...`);
              await this.wait(1); // Rate limiting
              console.log(`   🌐 Fetching contact page content...`);
              const contactContent = await this.scraper.scrapeWebsite(contactUrl);
              console.log(`   📄 Contact page length: ${contactContent ? contactContent.length : 0} characters`);
              const contactEmails = extractEmails(contactContent);
              console.log(`   ✅ Emails extracted from contact page: ${contactEmails.length}`);
              if (contactEmails.length > 0) {
                emails = contactEmails;
                contactEmails.forEach((email, i) => {
                  console.log(`      ${i + 1}. ${email}`);
                });
              } else {
                console.log(`   ❌ No emails found on contact page either`);
              }
            } catch (contactError) {
              console.log(`   ❌ Contact page scraping failed: ${contactError.message}`);
            }
          }
        } catch (error) {
          console.log(`   ❌ Website scraping failed: ${error.message}`);
        }
      } else {
        console.log(`\n📧 EMAIL EXTRACTION: Skipped (no website found)`);
      }

      console.log(`\n📋 FINAL RESULT:`);
      console.log(`   🏢 Business: ${bestBusinessName}`);
      console.log(`   📍 Location: ${(address || location) || 'Not found'}`);
      console.log(`   📞 PHONE: ${phoneNumber || 'Not found'}`);
      console.log(`   🌐 WEBSITE: ${website || 'Not found'}`);
      console.log(`   📧 EMAILS: ${emails.length > 0 ? emails.join(', ') : 'Not found'}`);
      console.log(`${'='.repeat(80)}\n`);

      return {
        name: bestBusinessName,
        phone: phoneNumber,
        website: website,
        emails: emails,
        location: address || location,
        rawAddressCandidates: rawAddressCandidates // Added raw address candidates
      };

    } catch (error) {
      console.log(`\n❌ CRITICAL ERROR: ${error.message}`);
      console.log(`${'='.repeat(80)}\n`);
      return null;
    }
  }

  // Main function to scrape multiple businesses
  async scrapeBusinesses(businessType, location = 'fes', maxResults = 100) {
    try {
      console.log(`\n🚀 BUSINESS SCRAPER STARTED`);
      console.log(`📋 BUSINESS TYPE: "${businessType.toUpperCase()}"`);
      console.log(`📍 LOCATION: ${location.toUpperCase()}`);
      console.log(`🎯 TARGET: ${maxResults} businesses\n`);

      // First, get a list of businesses from general search
      console.log(`${'▓'.repeat(60)}`);
      console.log(`📋 STEP 1: GETTING BUSINESS LIST`);
      console.log(`${'▓'.repeat(60)}`);

      const searchQuery = `${businessType.replace(/\s+/g, '+')}+${location}`;
      console.log(`🔗 Search query: ${searchQuery}`);
      console.log(`⏳ Scraping Google Maps for business list...`);

      const googleMapsData = await this.scraper.scrapeGoogleMaps(searchQuery);

      if (!googleMapsData) {
        console.log(`❌ FATAL ERROR: No data found from Google Maps`);
        throw new Error('No data found from Google Maps');
      }

      console.log(`✅ Google Maps data retrieved successfully`);
      const { extractBusinessNames } = await import('./googleMapsUtils.js');
      const businessNames = extractBusinessNames(googleMapsData);
      console.log(`📊 BUSINESSES FOUND: ${businessNames.length}`);

      if (businessNames.length === 0) {
        console.log(`❌ No businesses found for "${businessType}" in ${location}`);
        return [];
      }

      // Show the business list
      console.log(`\n📋 BUSINESS LIST:`);
      businessNames.slice(0, Math.min(10, businessNames.length)).forEach((name, i) => {
        console.log(`   ${i + 1}. ${name.substring(0, 70)}${name.length > 70 ? '...' : ''}`);
      });
      if (businessNames.length > 10) {
        console.log(`   ... and ${businessNames.length - 10} more businesses`);
      }

      // Limit to maxResults
      const businessesToSearch = businessNames.slice(0, maxResults);
      console.log(`\n🎯 SELECTED FOR INDIVIDUAL RESEARCH: ${businessesToSearch.length} businesses`);

      // Step 2: INDIVIDUAL BUSINESS RESEARCH (CONCURRENT)
      console.log(`\n${'▓'.repeat(60)}`);
      console.log(`🔍 STEP 2: INDIVIDUAL BUSINESS RESEARCH (CONCURRENT)`);
      console.log(`${'▓'.repeat(60)}`);

      // Simple concurrency pool runner
      async function runWithConcurrency(items, limit, worker) {
        const results = new Array(items.length);
        let nextIndex = 0;

        async function runNext() {
          const current = nextIndex++;
          if (current >= items.length) return;
          try {
            results[current] = await worker(items[current], current);
          } catch (err) {
            results[current] = null;
          }
          return runNext();
        }

        const runners = Array.from({ length: Math.min(limit, items.length) }, () => runNext());
        await Promise.all(runners);
        return results.filter(r => r);
      }

      const concurrency = Math.min(5, Math.max(2, Math.floor(os.cpus().length / 2)));
      console.log(`Using concurrency: ${concurrency}`);

      let completed = 0;
      const allRawAddressCandidates = []; // To collect all rawAddressCandidates
      const allBusinessNames = []; // To collect all business names for Gemini prompt
      const allLocations = []; // To collect all locations for Gemini prompt
      const originalIndexes = []; // To map back results

      const results = await runWithConcurrency(businessesToSearch, concurrency, async (businessName, idx) => {
        const prefix = `[${idx + 1}/${businessesToSearch.length}]`;
        console.log(`\n${'░'.repeat(40)}`);
        console.log(`${prefix} START: ${businessName.substring(0, 60)}${businessName.length > 60 ? '...' : ''}`);
        console.log(`${'░'.repeat(40)}`);
        const data = await this.searchIndividualBusiness(businessName, location);
        if (data && data.rawAddressCandidates) {
          allRawAddressCandidates.push(data.rawAddressCandidates);
          allBusinessNames.push(data.name); // Using data.name (best matched name)
          allLocations.push(location); // Using the original location
          originalIndexes.push(idx);
          delete data.rawAddressCandidates; // Remove to avoid saving raw data
        }
        completed++;
        if (data) {
          console.log(`${prefix} ✅ DONE (${Math.round(completed / businessesToSearch.length * 100)}%)`);
        } else {
          console.log(`${prefix} ❌ FAILED (${Math.round(completed / businessesToSearch.length * 100)}%)`);
        }
        return data;
      });

      console.log(`\n${'▓'.repeat(60)}`);
      console.log(`✅ ALL INDIVIDUAL SEARCHES COMPLETED`);
      console.log(`${'▓'.repeat(60)}`);
      console.log(`📊 TOTAL RESULTS: ${results.length}/${businessesToSearch.length} businesses`);

      // STEP 3: BATCH ADDRESS SELECTION WITH GEMINI
      console.log(`\n${'▓'.repeat(60)}`);
      console.log(`🤖 STEP 3: BATCH ADDRESS SELECTION WITH GEMINI`);
      console.log(`${'▓'.repeat(60)}`);

      const businessDataForGemini = originalIndexes.map(idx => ({
        businessName: results[idx].name,
        location: allLocations[originalIndexes.indexOf(idx)], // Get location using original index
        candidates: allRawAddressCandidates[originalIndexes.indexOf(idx)] // Get candidates using original index
      }));

      console.log(`Sending ${businessDataForGemini.length} business address candidate sets to Gemini...`);
      const selectedAddresses = await this.batchSelectAddressesWithGemini(businessDataForGemini);
      console.log(`Received ${selectedAddresses.length} addresses from Gemini.`);

      // Distribute the selected addresses back to the results
      for (let i = 0; i < selectedAddresses.length; i++) {
        const originalIdx = originalIndexes[i];
        if (results[originalIdx]) {
          results[originalIdx].location = selectedAddresses[i] || results[originalIdx].location; // Update location or keep existing
        }
      }

      return results.filter(r => r);

    } catch (error) {
      console.log(`\n❌ CRITICAL SCRAPING ERROR: ${error.message}`);
      throw error;
    }
  }

  // Parse query to extract business type and location
  parseQuery(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);

    let location = '';
    let businessType = '';

    if (words.length > 0) {
      location = words[words.length - 1]; // Last word is the location
      businessType = words.slice(0, -1).join(' '); // Rest are business type
    } else {
      // Fallback if query is empty
      location = 'maroc'; 
      businessType = '';
    }
    
    return { businessType: businessType.trim(), location: location.trim() };
  }

  // New orchestration function to manage query generation and scraping
  async orchestrateScraping(userQuery, maxResultsPerSubQuery) {
    console.log(`\n🚀 Orchestrating enhanced scraping for: "${userQuery}"`);
    console.log(`🎯 Max results per sub-query: ${maxResultsPerSubQuery}\n`);

    let allCombinedResults = [];

    try {
      const { businessType, location } = this.parseQuery(userQuery);
      console.log(`Initial parsed business type: "${businessType}", location: "${location}"`);

      // STEP 1: Generate Main Queries
      console.log(`\n${'▓'.repeat(60)}`);
      console.log(`🤖 STEP 1: GENERATING MAIN SEARCH QUERIES WITH GEMINI`);
      console.log(`${'▓'.repeat(60)}`);

      const mainQueries = await this.generateMainQueriesWithGemini(userQuery, location);
      if (mainQueries.length === 0) {
        console.log(`❌ No main queries generated. Exiting.`);
        return [];
      }
      console.log(`✅ Generated ${mainQueries.length} main queries:`, mainQueries);

      // STEP 2: Iterate through main queries and generate sub-queries
      for (let i = 0; i < mainQueries.length; i++) {
        const mainQuery = mainQueries[i];
        console.log(`\n${'▓'.repeat(60)}`);
        console.log(`🤖 STEP 2: GENERATING SUB-QUERIES FOR MAIN QUERY [${i + 1}/${mainQueries.length}]: "${mainQuery}"`);
        console.log(`${'▓'.repeat(60)}`);

        const subQueries = await this.generateSubQueriesWithGemini(mainQuery, location);
        if (subQueries.length === 0) {
          console.log(`❌ No sub-queries generated for "${mainQuery}". Skipping.`);
          continue;
        }
        console.log(`✅ Generated ${subQueries.length} sub-queries:`, subQueries);

        // STEP 3: Scrape for each sub-query
        for (let j = 0; j < subQueries.length; j++) {
          const subQuery = subQueries[j];
          console.log(`\n${'─'.repeat(80)}`);
          console.log(`🔍 SCRAPING SUB-QUERY [${j + 1}/${subQueries.length}] for "${mainQuery}": "${subQuery}"`);
          console.log(`${'─'.repeat(80)}`);

          try {
            const resultsForSubQuery = await this.scrapeBusinesses(subQuery, location, maxResultsPerSubQuery);
            if (resultsForSubQuery.length > 0) {
              allCombinedResults.push(...resultsForSubQuery);
              console.log(`📊 Added ${resultsForSubQuery.length} results from sub-query. Total so far: ${allCombinedResults.length}`);
            } else {
              console.log(`⚠️ No results found for sub-query: "${subQuery}"`);
            }
          } catch (subQueryError) {
            console.log(`❌ Error scraping sub-query "${subQuery}": ${subQueryError.message}`);
          }
        }
      }

      // Final display and deduplicate results
      console.log(`\n${'▓'.repeat(80)}`);
      console.log(`✅ ALL SCRAPING ROUNDS COMPLETED`);
      console.log(`${'▓'.repeat(80)}`);
      console.log(`📊 TOTAL UNIQUE BUSINESSES FOUND: ${allCombinedResults.length}`);

      // Deduplicate final results (assuming 'name' and 'phone' make a business unique enough)
      const uniqueResults = [];
      const seenBusinesses = new Set();

      allCombinedResults.forEach(business => {
        const identifier = `${business.name}-${business.phone}`; // Or any other unique identifier
        if (!seenBusinesses.has(identifier)) {
          seenBusinesses.add(identifier);
          uniqueResults.push(business);
        }
      });

      console.log(`📊 TOTAL DEDUPLICATED BUSINESSES: ${uniqueResults.length}`);

      this.displayResults(uniqueResults, businessType, location);

      console.log(`\n🎉 ENHANCED SCRAPING COMPLETED SUCCESSFULLY!`);
      console.log(`📊 Total unique businesses processed: ${uniqueResults.length}`);
      console.log(`⏱️  Scraping session completed at: ${new Date().toLocaleString()}\n`);

      return uniqueResults;

    } catch (error) {
      console.log(`\n❌ ENHANCED SCRAPING FAILED`);
      console.log(`💥 Error: ${error.message}`);
      console.log(`⏱️  Failed at: ${new Date().toLocaleString()}\n`);
      throw error;
    }
  }

  // Display results summary
  displayResults(results, businessType, location) {
    console.log(`\n📊 FINAL SCRAPING RESULTS`);
    console.log(`📋 BUSINESS TYPE: ${businessType.toUpperCase()}`);
    console.log(`📍 LOCATION: ${location.toUpperCase()}`);
    console.log(`🎯 TOTAL BUSINESSES FOUND: ${results.length}\n`);

    if (results.length === 0) {
      console.log(`❌ NO RESULTS FOUND`);
      console.log(`   Try different search terms or location\n`);
      return;
    }

    console.log(`${'▓'.repeat(80)}`);
    console.log(`📋 DETAILED BUSINESS LIST`);
    console.log(`${'▓'.repeat(80)}`);

    results.forEach((business, index) => {
      console.log(`\n${index + 1}. ${'─'.repeat(70)}`);
      console.log(`🏢 BUSINESS: ${business.name}`);
      console.log(`📍 LOCATION: ${business.location || '❌ Not available'}`);
      console.log(`📞 PHONE: ${business.phone || '❌ Not available'}`);
      console.log(`🌐 WEBSITE: ${business.website || '❌ Not available'}`);
      console.log(`📧 EMAILS: ${business.emails.length > 0 ? business.emails.join(', ') : '❌ Not available'}`);
      console.log(`${'─'.repeat(70)}`);
    });

    // Statistics
    const withPhone = results.filter(b => b.phone).length;
    const withWebsite = results.filter(b => b.website).length;
    const withEmails = results.filter(b => b.emails.length > 0).length;
    const totalEmails = results.reduce((sum, b) => sum + b.emails.length, 0);

    console.log(`\n${'▓'.repeat(80)}`);
    console.log(`📈 STATISTICS & SUMMARY`);
    console.log(`${'▓'.repeat(80)}`);
    console.log(`📊 SUCCESS RATES:`);
    console.log(`   📞 Phone Numbers: ${withPhone}/${results.length} businesses (${Math.round(withPhone/results.length*100)}%)`);
    console.log(`   🌐 Websites: ${withWebsite}/${results.length} businesses (${Math.round(withWebsite/results.length*100)}%)`);
    console.log(`   📧 Email Addresses: ${withEmails}/${results.length} businesses (${Math.round(withEmails/results.length*100)}%)`);
    console.log(`   📧 Total Emails: ${totalEmails} email addresses found`);

    console.log(`\n🎯 QUALITY ASSESSMENT:`);
    if (withPhone >= results.length * 0.8) {
      console.log(`   📞 Phone coverage: ✅ EXCELLENT (${Math.round(withPhone/results.length*100)}%)`);
    } else if (withPhone >= results.length * 0.5) {
      console.log(`   📞 Phone coverage: ⚠️  GOOD (${Math.round(withPhone/results.length*100)}%)`);
    } else {
      console.log(`   📞 Phone coverage: ❌ NEEDS IMPROVEMENT (${Math.round(withPhone/results.length*100)}%)`);
    }

    if (withWebsite >= results.length * 0.5) {
      console.log(`   🌐 Website coverage: ✅ GOOD (${Math.round(withWebsite/results.length*100)}%)`);
    } else if (withWebsite >= results.length * 0.3) {
      console.log(`   🌐 Website coverage: ⚠️  FAIR (${Math.round(withWebsite/results.length*100)}%)`);
    } else {
      console.log(`   🌐 Website coverage: ❌ LOW (${Math.round(withWebsite/results.length*100)}%)`);
    }

    if (withEmails >= results.length * 0.3) {
      console.log(`   📧 Email coverage: ✅ GOOD (${Math.round(withEmails/results.length*100)}%)`);
    } else if (withEmails >= results.length * 0.1) {
      console.log(`   📧 Email coverage: ⚠️  FAIR (${Math.round(withEmails/results.length*100)}%)`);
    } else {
      console.log(`   📧 Email coverage: ❌ LOW (${Math.round(withEmails/results.length*100)}%)`);
    }
  }

  // Wait function (utility)
  wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
}