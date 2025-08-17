import chalk from 'chalk';
import { ScraperInterface } from '../core/scraper-interface.js';

/**
 * LinkedIn Scraper Wrapper
 * Maintains the exact existing workflow while providing unified interface
 */
export class LinkedInScraper extends ScraperInterface {
  constructor() {
    super('linkedin', 'LinkedIn');
  }

  /**
   * Validate niche for LinkedIn
   */
  validateNiche(niche) {
    if (!super.validateNiche(niche)) {
      return false;
    }
    
    // LinkedIn works best with professional niches
    const professionalKeywords = [
      'developer', 'engineer', 'manager', 'director', 'ceo', 'cto', 'cfo',
      'consultant', 'analyst', 'specialist', 'expert', 'professional',
      'designer', 'architect', 'lawyer', 'doctor', 'dentist', 'accountant',
      'marketer', 'sales', 'business', 'entrepreneur', 'founder', 'owner'
    ];
    
    const lowerNiche = niche.toLowerCase();
    const hasProfessionalContext = professionalKeywords.some(keyword => 
      lowerNiche.includes(keyword)
    );
    
    if (!hasProfessionalContext) {
      console.log(chalk.yellow(`⚠️  "${niche}" may not yield optimal LinkedIn results`));
      console.log(chalk.gray('   Consider adding professional terms like "manager", "consultant", "professional", etc.'));
    }
    
    return true;
  }

  /**
   * Main scraping method using existing LinkedIn workflow
   */
  async scrape(niche, options = {}) {
    try {
      await this.setup(options);
      
      console.log(chalk.blue('💼 Starting LinkedIn scraping workflow...'));
      console.log(chalk.gray(`   Target: ${niche}`));
      console.log(chalk.gray(`   Data Type: ${options.dataType || 'profiles'}`));
      
      // Dynamic import to avoid affecting other scrapers
      const runScraper = await this.loadLinkedInScraper();
      
      // Prepare queries array (existing scraper expects array)
      const queries = [niche];
      
      // Configure options for existing scraper
      const scraperOptions = {
        queries: queries,
        format: 'json', // Get raw results first
        output: null,   // Don't save yet (unified processor will handle)
        source: 'linkedin' // Ensure LinkedIn workflow
      };
      
      console.log(chalk.blue('🔗 Searching LinkedIn profiles and company pages...'));
      
      // Run existing LinkedIn scraper with EXACT same workflow
      const results = await runScraper(scraperOptions);
      
      // Transform results based on requested data type
      const transformedResults = this.transformResults(results, options.dataType);
      
      await this.cleanup(transformedResults);
      
      return transformedResults;
      
    } catch (error) {
      await this.handleError(error, 'LinkedIn scraping');
    }
  }

  /**
   * Load the existing LinkedIn scraper
   */
  async loadLinkedInScraper() {
    try {
      // Import the existing scraper module (UNCHANGED workflow)
      const scraperModule = await import('../google search + linkdin scraper/lead-scraper/index.js');
      
      // The existing scraper exports a default function
      return scraperModule.default;
      
    } catch (error) {
      throw new Error(`Failed to load LinkedIn scraper: ${error.message}`);
    }
  }

  /**
   * Transform results based on data type
   */
  transformResults(results, dataType) {
    if (!Array.isArray(results)) {
      console.log(chalk.yellow('⚠️  LinkedIn returned non-array results, converting...'));
      return [];
    }
    
    // LinkedIn results structure is different - they contain profile objects
    const linkedInProfiles = results.filter(r => r.profileUrl || r.name);
    
    switch (dataType) {
      case 'profiles':
        return linkedInProfiles.map(profile => ({
          name: profile.name || '',
          profileUrl: profile.profileUrl || '',
          bio: profile.bio || '',
          isCompanyPage: Boolean(profile.isCompanyPage),
          source: 'LinkedIn'
        }));
        
      case 'contacts':
        return linkedInProfiles
          .map(profile => {
            const result = { source: 'LinkedIn' };
            
            // LinkedIn rarely provides direct contact info
            // But we include name and URL as "contact" information
            if (profile.name) result.name = profile.name;
            if (profile.profileUrl) result.linkedInUrl = profile.profileUrl;
            
            // If profile has actual email/phone (rare)
            if (profile.email) {
              const email = this.sanitizeEmail(profile.email);
              if (email) result.email = email;
            }
            
            if (profile.phone) {
              const phone = this.sanitizePhone(profile.phone);
              if (phone) result.phone = phone;
            }
            
            return result;
          })
          .filter(r => r.name || r.email || r.phone);
          
      case 'complete':
      default:
        return linkedInProfiles.map(profile => ({
          name: profile.name || '',
          profileUrl: profile.profileUrl || '',
          bio: profile.bio || '',
          isCompanyPage: Boolean(profile.isCompanyPage),
          email: profile.email ? this.sanitizeEmail(profile.email) : '',
          phone: profile.phone ? this.sanitizePhone(profile.phone) : '',
          source: 'LinkedIn'
        }));
    }
  }

  /**
   * Get configuration for LinkedIn scraper
   */
  getConfig() {
    return {
      source: 'linkedin',
      name: 'LinkedIn',
      description: 'Professional Profiles & Company Pages',
      dataTypes: ['profiles', 'contacts', 'complete'],
      maxQueries: 25,
      supportsBatch: true,
      requiresApiKey: true,
      specialFeatures: ['profileLinks', 'companyPages', 'professionalBios']
    };
  }

  /**
   * Setup for LinkedIn scraping
   */
  async setup(options = {}) {
    await super.setup(options);
    
    console.log(chalk.gray('⚙️  Configuring LinkedIn search parameters...'));
    
    // Validate that LinkedIn dependencies are available
    try {
      await import('../google search + linkdin scraper/lead-scraper/helpers/multiSourceSearch.js');
      console.log(chalk.gray('✅ LinkedIn search configuration loaded'));
    } catch (error) {
      throw new Error('LinkedIn scraper configuration not found. Make sure the google search + linkdin scraper project is available.');
    }
    
    // LinkedIn-specific setup
    console.log(chalk.gray('🔗 Optimizing for LinkedIn profile discovery...'));
  }

  /**
   * Enhanced error handling for LinkedIn
   */
  async handleError(error, context = 'LinkedIn scraping') {
    // Handle specific LinkedIn errors
    if (error.message.includes('quota')) {
      console.error(chalk.red('❌ Google API quota exceeded (LinkedIn uses Google Search)'));
      console.error(chalk.yellow('💡 Try adding more Google API keys or wait for quota reset'));
    } else if (error.message.includes('linkedin')) {
      console.error(chalk.red('❌ LinkedIn access issue'));
      console.error(chalk.yellow('💡 LinkedIn profiles are searched via Google - check API configuration'));
    } else if (error.message.includes('profiles')) {
      console.error(chalk.red('❌ Profile extraction issue'));
      console.error(chalk.yellow('💡 Try adjusting the search query to be more specific'));
    }
    
    await super.handleError(error, context);
  }

  /**
   * Enhanced progress logging for LinkedIn
   */
  logProgress(message, stats = {}) {
    super.logProgress(message, stats);
    
    // LinkedIn-specific progress information
    if (stats.profilesFound) {
      console.log(chalk.blue(`   👤 Profiles discovered: ${stats.profilesFound}`));
    }
    
    if (stats.companyPages) {
      console.log(chalk.blue(`   🏢 Company pages found: ${stats.companyPages}`));
    }
  }
}
