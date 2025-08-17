import chalk from 'chalk';
import { ScraperInterface } from '../core/scraper-interface.js';

/**
 * All Sources Scraper Wrapper
 * Combines Google Search, LinkedIn, and Google Maps results
 */
export class AllSourcesScraper extends ScraperInterface {
  constructor() {
    super('all_sources', 'All Sources');
    this.scrapers = new Map();
  }

  /**
   * Validate niche for all sources
   */
  validateNiche(niche) {
    if (!super.validateNiche(niche)) {
      return false;
    }
    
    // All sources can handle most niches, but warn about optimization
    const { businessType, location } = this.parseNiche(niche);
    
    if (!location) {
      console.log(chalk.yellow('⚠️  For best results across all sources, include a location'));
      console.log(chalk.gray('   Examples: "dentist casablanca", "web developer fes"'));
    }
    
    return true;
  }

  /**
   * Main scraping method combining all sources
   */
  async scrape(niche, options = {}) {
    try {
      await this.setup(options);
      
      console.log(chalk.blue('🌐 Starting multi-source scraping workflow...'));
      console.log(chalk.gray(`   Target: ${niche}`));
      console.log(chalk.gray(`   Sources: Google Search + LinkedIn + Google Maps`));
      console.log(chalk.gray(`   Data Type: ${options.dataType || 'complete'}`));
      
      const allResults = [];
      const sourceStats = {};
      
      // Load all scrapers
      const googleSearch = await this.loadScraper('google_search');
      const linkedin = await this.loadScraper('linkedin');
      const googleMaps = await this.loadScraper('google_maps');
      
      // Run scrapers sequentially to avoid overwhelming APIs
      console.log(chalk.blue('\n🔍 Phase 1: Google Search scraping...'));
      try {
        const googleResults = await googleSearch.scrape(niche, options);
        allResults.push(...googleResults);
        sourceStats['Google Search'] = googleResults.length;
        console.log(chalk.green(`✅ Google Search: ${googleResults.length} results`));
      } catch (error) {
        console.log(chalk.red(`❌ Google Search failed: ${error.message}`));
        sourceStats['Google Search'] = 0;
      }
      
      // Add delay between sources
      console.log(chalk.gray('⏳ Waiting 3 seconds before next source...'));
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log(chalk.blue('\n💼 Phase 2: LinkedIn scraping...'));
      try {
        const linkedinResults = await linkedin.scrape(niche, options);
        allResults.push(...linkedinResults);
        sourceStats['LinkedIn'] = linkedinResults.length;
        console.log(chalk.green(`✅ LinkedIn: ${linkedinResults.length} results`));
      } catch (error) {
        console.log(chalk.red(`❌ LinkedIn failed: ${error.message}`));
        sourceStats['LinkedIn'] = 0;
      }
      
      // Add delay between sources
      console.log(chalk.gray('⏳ Waiting 3 seconds before next source...'));
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log(chalk.blue('\n🗺️  Phase 3: Google Maps scraping...'));
      try {
        const mapsResults = await googleMaps.scrape(niche, options);
        allResults.push(...mapsResults);
        sourceStats['Google Maps'] = mapsResults.length;
        console.log(chalk.green(`✅ Google Maps: ${mapsResults.length} results`));
      } catch (error) {
        console.log(chalk.red(`❌ Google Maps failed: ${error.message}`));
        sourceStats['Google Maps'] = 0;
      }
      
      // Deduplicate and merge results
      const deduplicatedResults = this.deduplicateResults(allResults);
      
      console.log(chalk.blue('\n📊 Multi-source results summary:'));
      Object.entries(sourceStats).forEach(([source, count]) => {
        console.log(chalk.gray(`   ${source}: ${count} results`));
      });
      console.log(chalk.white(`   Total combined: ${allResults.length} results`));
      console.log(chalk.white(`   After deduplication: ${deduplicatedResults.length} results`));
      
      await this.cleanup(deduplicatedResults);
      
      return deduplicatedResults;
      
    } catch (error) {
      await this.handleError(error, 'multi-source scraping');
    }
  }

  /**
   * Load individual scraper
   */
  async loadScraper(source) {
    if (this.scrapers.has(source)) {
      return this.scrapers.get(source);
    }
    
    let scraper;
    
    switch (source) {
      case 'google_search':
        const { GoogleSearchScraper } = await import('./google-search-wrapper.js');
        scraper = new GoogleSearchScraper();
        break;
        
      case 'linkedin':
        const { LinkedInScraper } = await import('./linkedin-wrapper.js');
        scraper = new LinkedInScraper();
        break;
        
      case 'google_maps':
        const { GoogleMapsScraper } = await import('./google-maps-wrapper.js');
        scraper = new GoogleMapsScraper();
        break;
        
      default:
        throw new Error(`Unknown scraper source: ${source}`);
    }
    
    this.scrapers.set(source, scraper);
    return scraper;
  }

  /**
   * Deduplicate results from multiple sources
   */
  deduplicateResults(results) {
    const seen = new Set();
    const deduplicated = [];
    
    for (const result of results) {
      // Create a unique key based on available data
      let key = '';
      
      if (result.email) {
        key += `email:${result.email.toLowerCase()}`;
      }
      
      if (result.phone) {
        key += `phone:${result.phone.replace(/\s|-/g, '')}`;
      }
      
      if (result.profileUrl) {
        key += `url:${result.profileUrl}`;
      }
      
      if (result.businessName) {
        key += `name:${result.businessName.toLowerCase()}`;
      }
      
      if (result.name) {
        key += `name:${result.name.toLowerCase()}`;
      }
      
      // If no unique identifiers, create key from all available data
      if (!key) {
        key = JSON.stringify(result);
      }
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      } else {
        // Merge additional information from duplicate
        const existingIndex = deduplicated.findIndex(existing => {
          const existingKey = this.createKey(existing);
          return existingKey === key;
        });
        
        if (existingIndex !== -1) {
          deduplicated[existingIndex] = this.mergeResults(deduplicated[existingIndex], result);
        }
      }
    }
    
    return deduplicated;
  }

  /**
   * Create unique key for result
   */
  createKey(result) {
    let key = '';
    
    if (result.email) key += `email:${result.email.toLowerCase()}`;
    if (result.phone) key += `phone:${result.phone.replace(/\s|-/g, '')}`;
    if (result.profileUrl) key += `url:${result.profileUrl}`;
    if (result.businessName) key += `name:${result.businessName.toLowerCase()}`;
    if (result.name) key += `name:${result.name.toLowerCase()}`;
    
    return key || JSON.stringify(result);
  }

  /**
   * Merge two result objects
   */
  mergeResults(existing, newResult) {
    const merged = { ...existing };
    
    // Merge sources
    if (existing.source && newResult.source && existing.source !== newResult.source) {
      merged.source = `${existing.source}, ${newResult.source}`;
    } else if (newResult.source) {
      merged.source = newResult.source;
    }
    
    // Add missing fields from new result
    Object.keys(newResult).forEach(key => {
      if (key !== 'source' && (!merged[key] || merged[key] === '')) {
        merged[key] = newResult[key];
      }
    });
    
    return merged;
  }

  /**
   * Get configuration for all sources scraper
   */
  getConfig() {
    return {
      source: 'all_sources',
      name: 'All Sources',
      description: 'Combined Multi-Source Scraping',
      dataTypes: ['contacts', 'complete'],
      maxResults: 200,
      supportsBatch: true,
      requiresApiKey: true,
      specialFeatures: ['deduplication', 'multiSource', 'resultMerging']
    };
  }

  /**
   * Setup for multi-source scraping
   */
  async setup(options = {}) {
    await super.setup(options);
    
    console.log(chalk.gray('⚙️  Configuring multi-source scraping...'));
    console.log(chalk.gray('🔍 Google Search: Business websites and contact pages'));
    console.log(chalk.gray('💼 LinkedIn: Professional profiles and company pages'));
    console.log(chalk.gray('🗺️  Google Maps: Business directory and local listings'));
    console.log(chalk.gray('🔄 Deduplication: Enabled'));
  }

  /**
   * Enhanced error handling for multi-source
   */
  async handleError(error, context = 'multi-source scraping') {
    console.error(chalk.red(`❌ Multi-source scraping encountered an error`));
    
    if (error.message.includes('quota')) {
      console.error(chalk.yellow('💡 API quota issues - some sources may have partial results'));
    } else if (error.message.includes('network')) {
      console.error(chalk.yellow('💡 Network issues - try running individual sources separately'));
    } else if (error.message.includes('load')) {
      console.error(chalk.yellow('💡 Scraper loading issues - check that all source projects are available'));
    }
    
    await super.handleError(error, context);
  }
}
