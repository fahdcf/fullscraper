import axios from 'axios';
import https from 'https';

export class MapsScraper {
  constructor() {
    this.results = [];
  }

  // Scrape Google Maps for business data
  async scrapeGoogleMaps(searchQuery = 'cabient+dentaire+atlas') {
    try {
      console.log('Scraping Google Maps...');

      // Configuration constants
      const config = {
        requestSettings: {
          timeout: 10000,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      };

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
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            }),
            timeout: config.requestSettings.timeout
          });

          const data = response.data;

          // Check if we got useful data (look for business patterns)
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

      const config = {
        requestSettings: {
          timeout: 10000,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      };

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
}