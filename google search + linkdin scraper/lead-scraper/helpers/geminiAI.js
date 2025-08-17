import axios from 'axios';
import { config } from '../config.js';
import chalk from 'chalk'; // Added for colored console output

/**
 * Generate AI-powered search queries using Gemini API
 * @param {string} niche - The business niche to target
 * @param {string} source - Data source type ('google_search', 'linkedin')
 * @returns {Promise<Array>} Array of search queries
 */
export async function generateQueriesWithGemini(niche, source = 'google_search', numLinkedInQueries = null) {
  try {
    console.log(chalk.cyan(`🤖 Gemini AI: Generating ${source.toUpperCase()} queries for: "${niche}"`));
    console.log(chalk.gray(`   📝 Request type: ${source === 'linkedin' ? 'LinkedIn Profiles' : 'Google Search'}`));
    
    // Always generate 25 queries for both LinkedIn and Google Search
    const totalQueries = 25;
    console.log(chalk.gray(`   📊 Requested queries: ${totalQueries}`));

    if (!config.gemini.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Determine language and keyword distribution based on niche and source
    let languageConfig;
    if (source === 'linkedin') {
      // LinkedIn: Always 25 queries (20 French, 5 Arabic)
      const { language, frenchCount, arabicCount, otherCount } = detectNicheLanguage(niche);
      languageConfig = {
        language,
        frenchCount: 20, // Always 20 for LinkedIn
        arabicCount: 5,  // Always 5 for LinkedIn
        otherCount: 0    // No other languages for LinkedIn
      };
    } else {
      // Google Search: Always 25 queries (20 French, 5 Arabic for Moroccan)
      const { language, frenchCount, arabicCount, otherCount } = detectNicheLanguage(niche);
      languageConfig = {
        language,
        frenchCount: 20, // Always 20 for Google Search
        arabicCount: 5,  // Always 5 for Google Search
        otherCount: 0    // No other languages for Google Search
      };
    }

    console.log(chalk.blue(`   🌍 Language distribution: French(${languageConfig.frenchCount}), Arabic(${languageConfig.arabicCount}), Other(${languageConfig.otherCount})`));

    let prompt;
    if (source === 'linkedin') {
      prompt = await generateLinkedInPrompt(niche, languageConfig.language, languageConfig.frenchCount, languageConfig.arabicCount, languageConfig.otherCount);
    } else {
      prompt = await generateGoogleSearchPrompt(niche, languageConfig.language, languageConfig.frenchCount, languageConfig.arabicCount, languageConfig.otherCount);
    }

    console.log(chalk.blue(`   📤 Sending request to Gemini API...`));

    // Make direct API call to Gemini
    const response = await axios.post(
      `${config.gemini.baseUrl}?key=${config.gemini.apiKey}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(chalk.green(`   ✅ Gemini API response received`));

    if (!response.data.candidates || !response.data.candidates[0] || !response.data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const text = response.data.candidates[0].content.parts[0].text;

    // Parse the response to extract queries
    const queries = parseGeneratedQueries(text);

    // Ensure we have exactly 25 queries
    if (queries.length < totalQueries) {
      console.log(chalk.yellow(`   ⚠️  Only got ${queries.length} queries, using fallback for remaining ${totalQueries - queries.length}`));
      const fallbackQueries = getFallbackQueries(niche, source).slice(0, totalQueries - queries.length);
      queries.push(...fallbackQueries);
    }

    // Limit to exactly 25 queries
    const finalQueries = queries.slice(0, totalQueries);
    
    console.log(chalk.green(`✅ Gemini AI: Generated ${finalQueries.length} optimized ${source === 'linkedin' ? 'linkedin' : 'google search'} queries`));
    return finalQueries;

  } catch (error) {
    console.error(chalk.red(`❌ Error generating queries with Gemini: ${error.message}`));
    console.log(chalk.yellow('⚠️  Using fallback queries'));
    return getFallbackQueries(niche, source).slice(0, 25); // Always return 25 fallback queries
  }
}

/**
 * Detect the language and keyword distribution based on niche
 * @param {string} niche - The business niche
 * @returns {Object} Language detection result
 */
function detectNicheLanguage(niche) {
  const nicheLower = niche.toLowerCase();
  
  // Moroccan cities and regions
  const moroccanKeywords = [
    'morocco', 'moroccan', 'maroc', 'marocain', 'marocaine',
    'casablanca', 'rabat', 'marrakech', 'fes', 'fès', 'agadir', 'tangier', 'tanger',
    'oujda', 'kenitra', 'tetouan', 'tétouan', 'meknes', 'meknès', 'el jadida', 'el-jadida',
    'safi', 'larache', 'khemisset', 'taourirt', 'ouarzazate', 'taroudant', 'guelmim',
    'ifrane', 'dakhla', 'laayoune', 'taza', 'berkane', 'sidi slimane', 'sidi kacem',
    'khouribga', 'beni mellal', 'tiflet', 'sale', 'temara', 'mohammedia', 'ain haroda',
    'ain taoujdate', 'ain aouda', 'ain sbihi', 'ain dorij', 'ain cheggag', 'ain karma',
    'ain sebaa', 'ain chock', 'ain diab', 'ain harrouda', 'ain itti', 'ain jir', 'ain orma',
    'ain taoujdate', 'ain zohra', 'ain zora', 'ain zohra', 'ain zora', 'ain zohra'
  ];
  
  // Check if niche contains Moroccan keywords
  const isMoroccan = moroccanKeywords.some(keyword => nicheLower.includes(keyword));
  
  if (isMoroccan) {
    return {
      language: 'moroccan',
      frenchCount: 20, // 20 French queries for Moroccan niches
      arabicCount: 5,  // 5 Arabic queries for Moroccan niches
      otherCount: 0    // No other languages for Moroccan niches
    };
  }
  
  // Check for other specific languages/regions
  if (nicheLower.includes('france') || nicheLower.includes('français') || nicheLower.includes('paris')) {
    return {
      language: 'french',
      frenchCount: 12, // Reduced from 25 to 12
      arabicCount: 0,
      otherCount: 0
    };
  }
  
  if (nicheLower.includes('spain') || nicheLower.includes('español') || nicheLower.includes('madrid') || nicheLower.includes('barcelona')) {
    return {
      language: 'spanish',
      frenchCount: 0,
      arabicCount: 0,
      otherCount: 12 // Reduced from 25 to 12
    };
  }
  
  if (nicheLower.includes('italy') || nicheLower.includes('italiano') || nicheLower.includes('rome') || nicheLower.includes('milan')) {
    return {
      language: 'italian',
      frenchCount: 0,
      arabicCount: 0,
      otherCount: 12 // Reduced from 25 to 12
    };
  }
  
  if (nicheLower.includes('germany') || nicheLower.includes('deutsch') || nicheLower.includes('berlin') || nicheLower.includes('munich')) {
    return {
      language: 'german',
      frenchCount: 0,
      arabicCount: 0,
      otherCount: 12 // Reduced from 25 to 12
    };
  }
  
  // Default to English for international niches
  return {
    language: 'english',
    frenchCount: 0,
    arabicCount: 0,
    otherCount: 12 // Reduced from 25 to 12
  };
}

/**
 * Generate Google Search prompt with SEO optimization
 */
async function generateGoogleSearchPrompt(niche, language, frenchCount, arabicCount, otherCount) {
  const totalQueries = frenchCount + arabicCount + otherCount;
  
  let languageInstructions = '';
  
  if (language === 'moroccan') {
    languageInstructions = `
    Generate EXACTLY ${totalQueries} SEO-optimized search queries for Google Search:
    - ${frenchCount} queries in French (targeting French-speaking Moroccans)
    - ${arabicCount} queries in Arabic (targeting Arabic-speaking Moroccans)
    - ${otherCount} queries in English (for broader reach)
    
    CRITICAL: You must return exactly ${totalQueries} queries, no more, no less.
    `;
  } else if (language === 'french') {
    languageInstructions = `
    Generate EXACTLY ${totalQueries} SEO-optimized search queries in French for Google Search.
    
    CRITICAL: You must return exactly ${totalQueries} queries, no more, no less.
    `;
  } else {
    languageInstructions = `
    Generate EXACTLY ${totalQueries} SEO-optimized search queries in ${language} for Google Search.
    
    CRITICAL: You must return exactly ${totalQueries} queries, no more, no less.
    `;
  }
  
    return `You are helping someone find contact information for businesses and professionals.

 ${languageInstructions}

 Target niche: "${niche}"

 IMPORTANT: Generate SEO-optimized search queries that will find CONTACT PAGES and CONTACT INFORMATION. Focus on queries that will lead to pages with email addresses, phone numbers, and contact details.

 Requirements:
 - Include "contact" in most queries to target contact pages
 - Use terms like "contact", "coordonnées", "téléphone", "email", "adresse"
 - Include location-based terms when relevant
 - Use long-tail keywords that target contact information
 - Include business-specific terms that lead to contact pages
 - Use natural language that people search for when looking for contact info
 - Mix broad and specific terms for comprehensive coverage
 - Focus on queries that will find pages with contact details, not just general business pages
 - CRITICAL: Return exactly ${totalQueries} queries

 Format: Return only the search queries, one per line, no numbering or extra text.

 Example SEO-optimized queries for "web developers in Casablanca":
 développeur web Casablanca contact
 agence web Casablanca coordonnées
 création site web Casablanca téléphone
 web developer Casablanca email
 agence développement web Casablanca contact
 développeur freelance Casablanca coordonnées
 web design Casablanca téléphone
 programmeur web Casablanca email
 agence web Casablanca adresse
 développement site web Casablanca contact

 Example SEO-optimized queries for "restaurants in Rabat":
 restaurant Rabat contact
 restaurant Rabat téléphone
 restaurant Rabat réservation
 restaurant Rabat coordonnées
 restaurant Rabat adresse
 restaurant Rabat email
 restaurant Rabat livraison contact
 restaurant Rabat menu prix contact
 restaurant Rabat avis clients contact
 restaurant Rabat spécialités contact

 CRITICAL: Generate EXACTLY ${totalQueries} SEO-optimized queries for "${niche}" that will find contact pages and contact information:
 Remember: You must return exactly ${totalQueries} queries, no more, no less.`;
}

/**
 * Generate LinkedIn prompt with SEO optimization
 */
async function generateLinkedInPrompt(niche, language, frenchCount, arabicCount, otherCount) {
  const totalQueries = frenchCount + arabicCount + otherCount;
  
  let languageInstructions = '';
  
  if (language === 'moroccan') {
    languageInstructions = `
    Generate EXACTLY ${totalQueries} SEO-optimized search queries for LinkedIn:
    - ${frenchCount} queries in French (targeting French-speaking professionals)
    - ${arabicCount} queries in Arabic (targeting Arabic-speaking professionals)
    - ${otherCount} queries in English (for broader reach)
    
    CRITICAL: You must return exactly ${totalQueries} queries, no more, no less.
    `;
  } else if (language === 'french') {
    languageInstructions = `
    Generate EXACTLY ${totalQueries} SEO-optimized search queries in French for LinkedIn.
    
    CRITICAL: You must return exactly ${totalQueries} queries, no more, no less.
    `;
  } else {
    languageInstructions = `
    Generate EXACTLY ${totalQueries} SEO-optimized search queries in ${language} for LinkedIn.
    
    CRITICAL: You must return exactly ${totalQueries} queries, no more, no less.
    `;
  }
  
  return `You are helping someone find LinkedIn profiles and company pages.

${languageInstructions}

Target niche: "${niche}"

IMPORTANT: Generate SEO-optimized search queries that will find the most relevant LinkedIn profiles and company pages. Focus on professional keywords and industry-specific terms.

Requirements:
- Use professional and industry-specific keywords
- Include location-based terms when relevant
- Use job titles and professional roles
- Include company and business terms
- Use LinkedIn-specific terminology
- Mix broad and specific terms for comprehensive coverage
- Focus on high-quality professional results
- CRITICAL: Return exactly ${totalQueries} queries

Format: Return only the search queries, one per line, no numbering or extra text.

Example SEO-optimized queries for "web agencies in Casablanca":
Agence web Casablanca LinkedIn
Agence digitale Casablanca Morocco
Web agency Casablanca professional
Studio web Casablanca LinkedIn
Entreprise développement web Casablanca
Agence création site web Casablanca
Bureau web Casablanca Morocco
Agence marketing digital Casablanca
Atelier web Casablanca LinkedIn
Société web Casablanca professional

Example SEO-optimized queries for "doctors in Rabat":
Doctor Rabat Morocco LinkedIn
Médecin Rabat professional
Dentist Rabat Morocco
Dentiste Rabat LinkedIn
Cardiologist Rabat professional
Cardiologue Rabat Morocco
Surgeon Rabat LinkedIn
Chirurgien Rabat professional
Pediatrician Rabat Morocco
Pédiatre Rabat LinkedIn

Example SEO-optimized queries for "web developers in Fès":
Web developer Fès Morocco LinkedIn
Développeur web Fès professional
Full stack developer Fès Morocco
Développeur full stack Fès LinkedIn
Frontend developer Fès professional
Développeur frontend Fès Morocco
Backend developer Fès LinkedIn
Développeur backend Fès professional
Freelance developer Fès Morocco
Développeur freelance Fès LinkedIn

CRITICAL: Generate EXACTLY ${totalQueries} SEO-optimized queries for "${niche}":
Remember: You must return exactly ${totalQueries} queries, no more, no less.`;
}

/**
 * Parse generated queries from Gemini response
 * @param {string} text - Raw response text
 * @returns {Array} Array of cleaned queries
 */
function parseGeneratedQueries(text) {
  try {
    // Split by lines and clean up
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.match(/^\d+\./)) // Remove numbered lines
      .filter(line => !line.toLowerCase().includes('example'))
      .filter(line => !line.toLowerCase().includes('query'))
      .filter(line => line.length > 5); // Minimum query length
    
    // Remove duplicates
    const uniqueQueries = [...new Set(lines)];
    
    return uniqueQueries;
    
  } catch (error) {
    console.error(`❌ Error parsing generated queries: ${error.message}`);
    return [];
  }
}

/**
 * Generate fallback queries if AI fails
 * @param {string} niche - The business niche
 * @param {string} source - Data source type
 * @returns {Array} Array of fallback queries
 */
function getFallbackQueries(niche, source) {
  const baseQueries = [
    `${niche} contact`,
    `${niche} email`,
    `${niche} téléphone`,
    `${niche} adresse`,
    `${niche} coordonnées`
  ];
  
  if (source === 'linkedin') {
    return [
      `${niche} LinkedIn`,
      `${niche} LinkedIn profile`,
      `${niche} LinkedIn professional`,
      `${niche} LinkedIn director`,
      `${niche} LinkedIn founder`
    ];
  }
  
  return baseQueries;
}

/**
 * Generate all source queries (legacy function)
 * @param {string} niche - The business niche
 * @returns {Promise<Object>} Object with queries for different sources
 */
export async function generateAllSourceQueries(niche) {
  try {
    const [googleSearchQueries, linkedInQueries] = await Promise.all([
      generateQueriesWithGemini(niche, 'google_search'),
      generateQueriesWithGemini(niche, 'linkedin')
    ]);
    
    return {
      googleSearchQueries,
      linkedInQueries
    };
    
  } catch (error) {
    console.error(`❌ Error generating all source queries: ${error.message}`);
    return {
      googleSearchQueries: getFallbackQueries(niche, 'google_search'),
      linkedInQueries: getFallbackQueries(niche, 'linkedin')
    };
  }
}

/**
 * Analyze and filter scraped data using Gemini AI
 * @param {Array} results - Array of scraped results (emails/phones)
 * @param {string} niche - Target niche
 * @param {string} source - Data source ('google_search', 'linkedin', 'all_sources')
 * @returns {Promise<Object>} Filtered results with analysis
 */
export async function analyzeAndFilterData(results, niche, source) {
  try {
    console.log(chalk.cyan(`🤖 Gemini AI: Analyzing and filtering ${results.length} results for "${niche}"`));
    console.log(chalk.gray(`   📊 Source: ${source}`));

    if (!config.gemini.apiKey) {
      console.log(chalk.yellow('⚠️  Gemini API key not configured, skipping AI analysis'));
      return {
        filteredResults: results,
        analysis: {
          totalAnalyzed: results.length,
          removed: 0,
          kept: results.length,
          reasons: []
        }
      };
    }

    // Prepare data for analysis
    const dataToAnalyze = results.map((result, index) => {
      if (source === 'linkedin') {
        return {
          id: index + 1,
          name: result.name || null,
          url: result.profileUrl || result.url || null,
          bio: result.bio || null,
          query: result.query || null,
          isCompanyPage: !!result.isCompanyPage
        };
      }
      return {
        id: index + 1,
        email: result.email || null,
        phone: result.phone || null,
        url: result.url || null,
        query: result.query || null
      };
    });

    // Generate analysis prompt based on source
    let prompt;
    if (source === 'linkedin') {
      prompt = generateLinkedInAnalysisPrompt(dataToAnalyze, niche);
    } else {
      prompt = generateGoogleSearchAnalysisPrompt(dataToAnalyze, niche);
    }

    console.log(chalk.blue(`   📤 Sending data to Gemini AI for analysis...`));

    // Make API call to Gemini
    const response = await axios.post(
      `${config.gemini.baseUrl}?key=${config.gemini.apiKey}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // Longer timeout for data analysis
      }
    );

    console.log(chalk.green(`   ✅ Gemini AI analysis completed`));

    if (!response.data.candidates || !response.data.candidates[0] || !response.data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const analysisText = response.data.candidates[0].content.parts[0].text;
    
    // Parse the analysis response
    const parsed = parseDataAnalysis(analysisText, results);

    // Compute fallback metrics if Gemini omitted them
    const totalAnalyzed = parsed.analysis?.totalAnalyzed ?? results.length;
    const removed = parsed.analysis?.removed ?? (results.length - parsed.filteredResults.length);
    const kept = parsed.analysis?.kept ?? parsed.filteredResults.length;

    const finalAnalysis = {
      ...parsed.analysis,
      totalAnalyzed,
      removed,
      kept
    };

    console.log(chalk.blue(`   📊 Analysis Summary:`));
    console.log(chalk.gray(`      • Total analyzed: ${finalAnalysis.totalAnalyzed}`));
    console.log(chalk.gray(`      • Removed: ${finalAnalysis.removed}`));
    console.log(chalk.gray(`      • Kept: ${finalAnalysis.kept}`));

    return {
      filteredResults: parsed.filteredResults,
      analysis: finalAnalysis
    };

  } catch (error) {
    console.error(chalk.red(`❌ Error in AI data analysis: ${error.message}`));
    console.log(chalk.yellow('⚠️  Returning original results without AI filtering'));
    
    return {
      filteredResults: results,
      analysis: {
        totalAnalyzed: results.length,
        removed: 0,
        kept: results.length,
        reasons: ['AI analysis failed - using original data']
      }
    };
  }
}

/**
 * Generate prompt for Google Search data analysis
 */
function generateGoogleSearchAnalysisPrompt(data, niche) {
  const nicheInfo = niche.toLowerCase();
  const isHealthcare = nicheInfo.includes('dentist') || nicheInfo.includes('doctor') || nicheInfo.includes('medical') || nicheInfo.includes('clinic');
  const isTechnology = nicheInfo.includes('developer') || nicheInfo.includes('programmer') || nicheInfo.includes('software') || nicheInfo.includes('web');
  const isProfessional = nicheInfo.includes('lawyer') || nicheInfo.includes('accountant') || nicheInfo.includes('consultant') || nicheInfo.includes('architect');

  return `You are a data quality analyst specializing in Google Search results. Analyze the following scraped contact data for the niche "${niche}" from Google Search.

TASK: Filter out contacts that are NOT relevant to the target business niche. Focus on business contact information quality and relevance.

⚠️ AGGRESSIVE FILTERING REQUIRED: Be very strict about removing institutional, educational, government, and fake emails. When in doubt, REMOVE the contact. Only keep contacts that are clearly legitimate business contacts in the target niche.

DETAILED FILTERING CRITERIA (remove if ANY apply):

1. **Obvious Spam/Test/Fake Emails**:
   - email@example.com, test@test.com, youremail@yourhosting.com
   - Obvious fake or placeholder emails
   - Disposable email domains (10minutemail.com, temp-mail.org, etc.)
   - ANY email with domains: example.com, domain.com, email.com, mail.com, hosting.com, test.com, demo.com, sample.com, placeholder.com, temporary.com, fake.com, dummy.com, invalid.com, nonexistent.com
   - ANY email starting with: test@, demo@, sample@, example@, fake@, dummy@, admin@, root@, webmaster@, info@, contact@, hello@

2. **Malformed Contact Information**:
   - Emails that don't follow basic email format (missing @, invalid characters)
   - Phone numbers with suspicious patterns (666666666, 999999999, 000000000)
   - Phone numbers that are clearly fake or test numbers
   - Emails starting with only numbers
   - Emails with suspicious domain patterns

3. **Institutional/Educational Contacts** (NOT related to target business):
   - Schools, universities, government agencies unrelated to the business niche
   - Training institutions (like OFPPT) not directly related to the target business
   - Academic institutions that don't serve the target business type
   - Government agencies that don't provide business services
   - ANY email with domains: um6p.ma, um6ss.ma, um5.ma, um6.ma, um7.ma, um8.ma, ofppt.ma, ens.ma, enam.ma, ena.ma, inpt.ma, emi.ma, esith.ma, esca.ma, escaa.ma, uca.ma, ucam.ma, ucd.ma, ucm.ma, ucf.ma, ucg.ma, edu.ma, ac.ma, gov.ma, gouv.ma, ma.ma, ma.gov.ma, ma.gouv.ma
   - ANY email containing: edu, ac, school, college, university, institute, academy, campus, faculty, department, division, bureau, office, ministry, administration, service, agency, authority, council, foundation, association, society, organization, corporation
   - UNLESS the niche is specifically related to education, healthcare (for medical universities), or government services

4. **Completely Irrelevant Business Contacts**:
   - Contacts from completely different industries
   - Personal contacts that have no business relevance
   - Generic business directories or listing sites
   - Competitor analysis tools or business intelligence services

5. **Geographic Mismatch** (if niche specifies location):
   - Contacts from completely different regions/countries
   - International companies with no local presence
   - Overseas service providers not serving the target area

IMPORTANT FILTERING RULES:

✅ KEEP these contacts:
- Legitimate business emails in the target niche
- Medical universities/hospitals for healthcare niches (e.g., um6ss.ma for dentists)
- Professional associations related to the target business
- Local business contacts matching the niche
- Generic names that could be legitimate professionals (e.g., stephane.roochard@gmail.com)
- Business domains that might be related to the niche
- Contact information from legitimate business websites
- Institutional contacts that directly provide business services in the target niche

❌ REMOVE these contacts:
- Test/placeholder emails and phone numbers
- Institutional contacts unrelated to the business niche
- Malformed or suspicious contact information
- Completely irrelevant business contacts
- Geographic mismatches (if location-specific niche)

EXAMPLES FOR NICHE "dentists in Casablanca":

REMOVE:
- contact@ofppt.ma (training institution - not dental business)
- email@example.com (test email - fake domain)
- test@test.com (test email - fake domain)
- contact@domain.com (fake domain)
- +212666666666 (suspicious phone pattern)
- info@university.edu (university - not dental business)
- contact@restaurant.com (different industry)
- contact@um6p.ma (university - not dental business)
- info@ofppt.ma (training institution - not dental business)

KEEP:
- stephane.roochard@gmail.com (could be legitimate dentist)
- fm6md.casa@um6ss.ma (medical university - relevant for dentists)
- contact@dentalclinic.ma (dental clinic - directly related)
- info@dentalassociation.ma (dental association - directly related)
- contact@localbusiness.ma (could be dental business)
- contact@medicaluniversity.ma (if providing dental services)
- info@dentalinstitute.ma (if providing dental services)

DATA TO ANALYZE:
${JSON.stringify(data, null, 2)}

RESPONSE FORMAT (JSON only):
{
  "analysis": {
    "totalAnalyzed": number,
    "removed": number,
    "kept": number,
    "qualityScore": number (0-100)
  },
  "removedItems": [
    {
      "id": number,
      "reason": "detailed reason for removal (be specific)"
    }
  ],
  "keptItems": [
    {
      "id": number,
      "confidence": "high/medium/low",
      "reason": "why this contact is relevant"
    }
  ],
  "summary": "comprehensive analysis summary including quality insights"
}

Analyze each contact thoroughly and respond with valid JSON only.`;
}

/**
 * Generate prompt for LinkedIn data analysis
 */
function generateLinkedInAnalysisPrompt(data, niche) {
  const nicheInfo = niche.toLowerCase();
  const isHealthcare = nicheInfo.includes('dentist') || nicheInfo.includes('doctor') || nicheInfo.includes('medical') || nicheInfo.includes('clinic');
  const isTechnology = nicheInfo.includes('developer') || nicheInfo.includes('programmer') || nicheInfo.includes('software') || nicheInfo.includes('web');
  const isProfessional = nicheInfo.includes('lawyer') || nicheInfo.includes('accountant') || nicheInfo.includes('consultant') || nicheInfo.includes('architect');

  return `You are a LinkedIn profile quality analyst specializing in professional networking data. Analyze the following LinkedIn profile data for the niche "${niche}".

TASK: Keep profiles that are relevant to the user's niche request. ONLY remove (1) duplicate profiles and (2) profiles clearly unrelated to the requested niche.

IMPORTANT: Be conservative. If a profile might be relevant, KEEP it. Do not penalize for being a student, intern, or having a short bio. Company pages are VALID.

MINIMAL FILTERING CRITERIA (remove only if ANY apply):

1. Duplicate Profile Detection:
   - Multiple profiles for the same person (name + company/title strongly match)
   - Same LinkedIn URL with different variations
   - Keep the most complete/recent profile, remove duplicates

2. Unrelated to Target Niche:
   - Profiles from a completely different industry with no clear connection to the niche
   - Profiles whose bio/title explicitly indicates a different domain
   - Generic pages (e.g., international organizations) with no relation to the niche

Location Guidance (soft):
   - If the niche includes a location (e.g., a city), prefer local profiles but DO NOT remove unless the profile is clearly in a different country and unrelated.

Do NOT remove for these reasons:
   - Being a student/intern/junior
   - Minimal or short bio
   - Limited profile details
   - Company page instead of individual

KEEP examples:
 - Active professionals in the target niche
 - Relevant company pages in the niche
 - Students/interns in the niche field
 - Local or nearby professionals (if location mentioned)

REMOVE examples:
 - Duplicate profiles
 - Profiles clearly from a different industry/domain
 - Irrelevant international organizations unrelated to the niche

DATA TO ANALYZE:
${JSON.stringify(data, null, 2)}

RESPONSE FORMAT (JSON only):
{
  "analysis": {
    "totalAnalyzed": number,
    "removed": number,
    "kept": number,
    "qualityScore": number (0-100),
    "duplicatesRemoved": number
  },
  "removedItems": [
    {
      "id": number,
      "reason": "duplicate or unrelated (state why)"
    }
  ],
  "keptItems": [
    {
      "id": number,
      "confidence": "high/medium/low",
      "reason": "why this profile is relevant"
    }
  ],
  "summary": "clear summary of what was kept and removed"
}

Analyze each LinkedIn profile for niche relevance and duplicate detection only. Respond with valid JSON only.`;
}

/**
 * Parse Gemini AI analysis response
 */
function parseDataAnalysis(analysisText, originalResults) {
  try {
    // Try to extract JSON block
    let jsonString = null;
    const jsonMatch = analysisText.match(/\{[\s\S]*\}$/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    } else {
      // Fallback: attempt to fix common formatting issues
      const startIdx = analysisText.indexOf('{');
      const endIdx = analysisText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonString = analysisText.slice(startIdx, endIdx + 1);
      }
    }
    if (!jsonString) {
      throw new Error('No JSON found in response');
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch (e) {
      // Attempt to remove trailing commas and parse again
      const cleaned = jsonString.replace(/,\s*([}\]])/g, '$1');
      analysis = JSON.parse(cleaned);
    }

    const removedItems = Array.isArray(analysis.removedItems) ? analysis.removedItems : [];
    const keptItems = Array.isArray(analysis.keptItems) ? analysis.keptItems : [];

    // Build filtered results by excluding removed IDs; if keptItems provided, prefer that
    let filteredResults;
    if (keptItems.length > 0) {
      const keptIds = new Set(keptItems.map(item => item.id));
      filteredResults = originalResults.filter((_, idx) => keptIds.has(idx + 1));
    } else if (removedItems.length > 0) {
      const removedIds = new Set(removedItems.map(item => item.id));
      filteredResults = originalResults.filter((_, idx) => !removedIds.has(idx + 1));
    } else {
      filteredResults = originalResults;
    }

    return {
      filteredResults,
      analysis: {
        totalAnalyzed: analysis.analysis?.totalAnalyzed,
        removed: analysis.analysis?.removed,
        kept: analysis.analysis?.kept,
        qualityScore: analysis.analysis?.qualityScore,
        reasons: removedItems.map(item => item.reason).filter(Boolean),
        summary: analysis.summary,
        duplicatesRemoved: analysis.analysis?.duplicatesRemoved
      }
    };

  } catch (error) {
    console.error(chalk.red(`❌ Error parsing AI analysis: ${error.message}`));
    throw new Error('Failed to parse AI analysis response');
  }
}