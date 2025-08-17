const axios = require('axios');
const utils = require('./utils');
const config = require('./config');

class MapsScraper {
  constructor() {
    this.results = [];
  }

  // Scrape Google Maps for business data
  async scrapeGoogleMaps(searchQuery = 'cabient+dentaire+atlas') {
    try {
      console.log('Scraping Google Maps...');

      // Try multiple approaches to get the data
      const approaches = [
        // Approach 1: Direct search URL
        `https://www.google.com/maps/search/${searchQuery}`,
        // Approach 2: Search with additional parameters
        `https://www.google.com/maps/search/${searchQuery}?hl=en&gl=us`,
        // Approach 3: API-like endpoint
        `https://www.google.com/search?tbm=map&q=${searchQuery}`
      ];

      for (let i = 0; i < approaches.length; i++) {
        const url = approaches[i];
        console.log(`Trying approach ${i + 1}: ${url.substring(0, 60)}...`);

        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': config.requestSettings.userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            httpsAgent: new (require('https').Agent)({
              rejectUnauthorized: false
            }),
            timeout: config.requestSettings.timeout
          });

          const data = response.data;

          // Check if we got useful data (look for business patterns)
          // A more robust check might involve looking for specific HTML elements/classes
          // related to business listings, e.g., if (data.includes('window.APP_INITIALIZATION_STATE') || data.includes('"place_id"'))
          if (data.includes('[7,[[') || data.includes('data-section-id="ol"') || data.includes('data-section-id="lu"')) {
            console.log(`Success with approach ${i + 1}`);
            return data;
          }

        } catch (error) {
          console.log(`Approach ${i + 1} failed: ${error.message}`);
          if (error.response) {
            console.log(`  Status: ${error.response.status}`);
            console.log(`  Headers: ${JSON.stringify(error.response.headers)}`);
          } else if (error.request) {
            console.log(`  No response received. Request made but no response.`);
          } else {
            console.log(`  Error setting up request: ${error.message}`);
          }
        }
      }

      console.log('All approaches failed, returning empty string');
      return '';

    } catch (error) {
      console.error('Error scraping Google Maps:', error.message);
      return '';
    }
  }

  // Scrape individual website for emails
  async scrapeWebsite(website) {
    try {
      console.log(`Scraping website: ${website}`);

      const response = await axios.get(website, {
        timeout: config.requestSettings.timeout,
        headers: {
          'User-Agent': config.requestSettings.userAgent
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error scraping ${website}:`, error.message);
      return '';
    }
  }

  // Extract domain from URL
  extractDomain(url) {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch {
      return '';
    }
  }

  // Smart website matching based on business names
  findBestWebsiteMatch(businessName, websites) {
    const name = businessName.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    // Extract key terms from business name (names, important words)
    const nameTerms = name.split(/[\s\-_.,|()]+/).filter(term =>
      term.length > 2 &&
      !['cabinet', 'centre', 'center', 'dentaire', 'dental', 'dr', 'docteur', 'chirurgien', 'fès', 'fes'].includes(term)
    );

    console.log(`  Analyzing "${businessName}"`);
    console.log(`  Key terms: [${nameTerms.join(', ')}]`);

    for (const website of websites) {
      const url = website.toLowerCase();
      let score = 0;
      let matchedTerms = [];

      // Check if any name terms appear in the URL
      for (const term of nameTerms) {
        if (url.includes(term)) {
          const termScore = term.length * 2; // Longer matches get higher scores
          score += termScore;
          matchedTerms.push(term);
        }
      }

      // Bonus for multiple term matches
      if (matchedTerms.length > 1) {
        score += 15;
      }

      // Bonus for exact long name matches (5+ characters)
      if (nameTerms.some(term => url.includes(term) && term.length >= 5)) {
        score += 20;
      }

      // Penalty for very generic matches
      if (matchedTerms.length === 1 && matchedTerms[0].length <= 3) {
        score -= 5;
      }

      if (score > 0) {
        console.log(`    ${website}: score ${score} (matched: ${matchedTerms.join(', ')})`);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = website;
      }
    }

    // Only return matches with a reasonable confidence score
    if (bestScore >= 8) { // Require at least a 4+ character match or multiple matches
      console.log(`    → Best match: ${bestMatch} (score: ${bestScore})`);
      return bestMatch;
    } else {
      console.log(`    → No confident match found (best score: ${bestScore})`);
      return null;
    }
  }

  // Final combination of all data with smart website assignment and email mapping
  combineAllDataWithEmails(namesNumbers, websites = [], websiteEmailMap = new Map()) {
    const result = [];
    const usedWebsites = new Set();

    console.log('\n=== SMART WEBSITE MATCHING ===');

    for (let i = 0; i < namesNumbers.length; i++) {
      const nameNumber = namesNumbers[i];

      // Try to find the best matching website for this business
      let businessWebsite = '';
      let businessEmails = [];

      // First, try smart matching
      const availableWebsites = websites.filter(w => !usedWebsites.has(w));
      const matchedWebsite = this.findBestWebsiteMatch(nameNumber.name, availableWebsites);

      if (matchedWebsite) {
        businessWebsite = matchedWebsite;
        usedWebsites.add(matchedWebsite);
        console.log(`✅ Matched "${nameNumber.name}" → ${matchedWebsite}`);

        // Get emails for this website
        if (websiteEmailMap.has(matchedWebsite)) {
          businessEmails = websiteEmailMap.get(matchedWebsite);
        }
      } else {
        console.log(`❌ No website match found for "${nameNumber.name}"`);
      }

      result.push({
        name: nameNumber.name,
        number: nameNumber.number,
        website: businessWebsite,
        emails: businessEmails
      });
    }

    console.log('=== MATCHING COMPLETE ===\n');

    // Filter out entries with no phone number and no emails
    return result.filter(r => r.number.trim() !== '' || r.emails.length > 0);
  }

  // Keep the old function for backward compatibility
  combineAllData(namesNumbers, namesEmails, websites = []) {
    const result = [];
    const usedDomains = new Set();

    for (let i = 0; i < namesNumbers.length; i++) {
      const nameNumber = namesNumbers[i];
      const matchingEmail = namesEmails.find(ne => ne.name === nameNumber.name);

      // Try to find a unique website for this business
      let businessWebsite = '';

      // Look for an unused website domain
      for (const website of websites) {
        const domain = this.extractDomain(website);
        if (domain && !usedDomains.has(domain)) {
          businessWebsite = website;
          usedDomains.add(domain);
          break;
        }
      }

      result.push({
        name: nameNumber.name,
        number: nameNumber.number,
        website: businessWebsite,
        emails: matchingEmail ? matchingEmail.email : []
      });
    }

    // Filter out entries with no phone number and no emails
    return result.filter(r => r.number.trim() !== '' || r.emails.length > 0);
  }

  // Main scraping function
  async scrape(searchQuery = 'cabient+dentaire+atlas') {
    try {
      console.log('Starting Google Maps scraping workflow...');

      // Step 1: Scrape Google Maps
      const googleMapsData = await this.scrapeGoogleMaps(searchQuery);
      
      // Step 2: Extract data from Google Maps
      const phoneNumbers = utils.extractPhoneNumbers(googleMapsData);
      const businessNames = utils.extractBusinessNames(googleMapsData);
      const parts = utils.extractGoogleMapsParts(googleMapsData);

      console.log(`Found ${phoneNumbers.length} phone numbers`);
      console.log(`Found ${businessNames.length} business names`);
      console.log(`Found ${parts.length} parts`);

      // Step 3: Filter parts and extract URLs
      const filteredParts = utils.filterSocialMediaParts(parts);
      const websites = utils.removeDuplicates(utils.extractWebsites(filteredParts, googleMapsData));

      console.log(`Found ${websites.length} unique websites`);

      // Step 4: Find names that have websites
      const validNames = utils.findNamesWithWebsites(filteredParts, businessNames);

      // Step 5: Combine names and numbers with intelligent matching
      const namesNumbers = utils.combineNamesAndNumbers(businessNames, phoneNumbers, googleMapsData);

      // Step 6: Scrape websites for emails and create website-email mapping
      const websiteEmailMap = new Map();

      for (let i = 0; i < websites.length; i++) {
        const website = websites[i];
        console.log(`Processing website ${i + 1}/${websites.length}: ${website}`);

        // Add delay between requests
        await utils.wait(1);

        const websiteContent = await this.scrapeWebsite(website);
        const emails = utils.extractEmails(websiteContent);

        if (emails.length > 0) {
          console.log(`✅ Found ${emails.length} emails from ${website}:`, emails);
          websiteEmailMap.set(website, emails);
        } else {
          console.log(`❌ No emails found from ${website}`);
        }
      }

      // Step 7: Final combination with website-email mapping
      const finalResults = this.combineAllDataWithEmails(namesNumbers, websites, websiteEmailMap);

      console.log(`\nScraping completed! Found ${finalResults.length} businesses with contact information.`);
      
      return finalResults;

    } catch (error) {
      console.error('Error in scraping workflow:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const scraper = new MapsScraper();
  
  try {
    const results = await scraper.scrape();
    
    console.log('\n=== RESULTS ===');
    results.forEach((business, index) => {
      console.log(`\n${index + 1}. ${business.name}`);
      console.log(`   Phone: ${business.number || 'N/A'}`);
      console.log(`   Emails: ${business.emails.length > 0 ? business.emails.join(', ') : 'N/A'}`);
    });

    // Optionally save results to JSON file
    const fs = require('fs');
    fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
    console.log('\nResults saved to results.json');

  } catch (error) {
    console.error('Scraping failed:', error);
  }
}

// Run the scraper
if (require.main === module) {
  main();
}

module.exports = MapsScraper;
