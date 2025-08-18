import chalk from 'chalk';
import ora from 'ora';
import { ScraperInterface } from './scraper-interface.js';
import { ResultProcessor } from './result-processor.js';

/**
 * Source Manager - Orchestrates different scraping sources
 * Maintains separate workflows while providing unified interface
 */
export class SourceManager {
  constructor() {
    this.scrapers = new Map();
    this.resultProcessor = new ResultProcessor();
    this.isProcessing = false;
    this.currentSource = null;
  }

  /**
   * Main execution method - routes to appropriate scraper
   */
  async run(niche, source, dataType, format, options = {}) {
    const { onResult, onBatch, onProgress, apiKeys } = options;
    this.isProcessing = true;
    this.currentSource = source;
    
    try {
      console.log(chalk.cyan(`🎯 Target: ${chalk.white(niche)}`));
      console.log(chalk.cyan(`📊 Source: ${chalk.white(this.getSourceDisplayName(source))}`));
      console.log(chalk.cyan(`📋 Data Type: ${chalk.white(dataType)}`));
      console.log(chalk.cyan(`💾 Format: ${chalk.white(format.toUpperCase())}\n`));
      
      // Load appropriate scraper
      const scraper = await this.loadScraper(source);
      
      // Validate niche for the selected source
      if (!scraper.validateNiche(niche)) {
        throw new Error(`Invalid niche format for ${source}`);
      }
      
              // Run scraping with unified interface
        console.log(chalk.blue.bold(`🚀 Starting ${this.getSourceDisplayName(source)} scraper...\n`));
        
        // If we have callbacks, use them to stream results
        if (onResult || onBatch || onProgress) {
          // Create a results collector
          const allResults = [];
          let processedCount = 0;
          
          // Run the scraper first to get results
          const results = await scraper.scrape(niche, { 
            dataType, 
            format,
            maxResults: this.getMaxResults(source),
            apiKeys: apiKeys || {} // Pass API keys to the scraper
          });
        
        // Handle empty results gracefully
        if (!results || results.length === 0) {
          console.log(chalk.yellow('\n📈 Results Summary:'));
          console.log(chalk.gray('─────────────────────────────────────'));
          console.log(chalk.yellow('📊 Total Results: 0'));
          console.log(chalk.gray('─────────────────────────────────────'));
          console.log(chalk.yellow('💡 No results to save - try running longer or adjust search terms'));
          this.isProcessing = false;
          return [];
        }
        
        // Process results through callbacks
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          processedCount++;
          allResults.push(result);
          
          // Call onResult callback
          if (onResult) {
            try {
              await onResult(result);
            } catch (error) {
              console.error('onResult callback error:', error.message);
            }
          }
          
          // Call onProgress callback
          if (onProgress) {
            try {
              await onProgress({ 
                processed: processedCount, 
                total: results.length, 
                phase: 'scraping', 
                message: `Processing result ${processedCount}/${results.length}` 
              });
            } catch (error) {
              console.error('onProgress callback error:', error.message);
            }
          }
        }
        
        // Call onBatch callback with all results
        if (onBatch && allResults.length > 0) {
          try {
            await onBatch([...allResults]);
          } catch (error) {
            console.error('onBatch callback error:', error.message);
          }
        }
        
        return allResults;
      } else {
        // Original behavior without callbacks
        const results = await scraper.scrape(niche, { 
          dataType, 
          format,
          maxResults: this.getMaxResults(source),
          apiKeys: apiKeys || {} // Pass API keys to the scraper
        });
        
        // Handle empty results gracefully
        if (!results || results.length === 0) {
          console.log(chalk.yellow('\n📈 Results Summary:'));
          console.log(chalk.gray('─────────────────────────────────────'));
          console.log(chalk.yellow('📊 Total Results: 0'));
          console.log(chalk.gray('─────────────────────────────────────'));
          console.log(chalk.yellow('💡 No results to save - try running longer or adjust search terms'));
          this.isProcessing = false;
          return [];
        }
      }
      
      // Check if results are pre-processed (from auto-save recovery)
      const isPreProcessed = results.length > 0 && results[0]._preProcessed;
      
      if (isPreProcessed) {
        console.log(chalk.blue('📊 Processing results...'));
        console.log(chalk.blue('💡 Results recovered from auto-save - already processed and validated'));
        console.log(chalk.green(`✅ Auto-save recovery completed successfully!`));
        console.log(chalk.gray(`📁 LinkedIn data available in: ${results[0].savedInFile}`));
        console.log(chalk.yellow(`📊 Total LinkedIn profiles: ${results.length}`));
        this.isProcessing = false;
        return results;
      }
      
      // Process and export results
      const processedResults = await this.resultProcessor.process(
        results, 
        source, 
        dataType, 
        format, 
        niche
      );
      
      this.isProcessing = false;
      return processedResults;
      
    } catch (error) {
      this.isProcessing = false;
      console.error(chalk.red(`\n❌ ${this.getSourceDisplayName(source)} scraping failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Load appropriate scraper based on source type
   */
  async loadScraper(source) {
    // Check cache first
    if (this.scrapers.has(source)) {
      return this.scrapers.get(source);
    }
    
    const spinner = ora(`Loading ${this.getSourceDisplayName(source)} scraper...`).start();
    
    try {
      let scraper;
      
      switch (source) {
        case 'google_search':
          const { GoogleSearchScraper } = await import('../wrappers/google-search-wrapper.js');
          scraper = new GoogleSearchScraper();
          break;
          
        case 'linkedin':
          const { LinkedInScraper } = await import('../wrappers/linkedin-wrapper.js');
          scraper = new LinkedInScraper();
          break;
          
        case 'google_maps':
          const { GoogleMapsScraper } = await import('../wrappers/google-maps-wrapper.js');
          scraper = new GoogleMapsScraper();
          break;
          
        case 'all_sources':
          const { AllSourcesScraper } = await import('../wrappers/all-sources-wrapper.js');
          scraper = new AllSourcesScraper();
          break;
          
        default:
          throw new Error(`Unknown scraper source: ${source}`);
      }
      
      // Validate scraper implements required interface
      if (!(scraper instanceof ScraperInterface)) {
        throw new Error(`Invalid scraper implementation for ${source}`);
      }
      
      // Cache the scraper
      this.scrapers.set(source, scraper);
      
      spinner.succeed(`${this.getSourceDisplayName(source)} scraper loaded`);
      return scraper;
      
    } catch (error) {
      spinner.fail(`Failed to load ${this.getSourceDisplayName(source)} scraper`);
      throw new Error(`Could not load scraper for ${source}: ${error.message}`);
    }
  }

  /**
   * Get display name for source
   */
  getSourceDisplayName(source) {
    const names = {
      google_search: 'Google Search',
      linkedin: 'LinkedIn',
      google_maps: 'Google Maps',
      all_sources: 'All Sources'
    };
    return names[source] || source;
  }

  /**
   * Get maximum results based on source
   */
  getMaxResults(source) {
    const limits = {
      google_search: 100,
      linkedin: 50,
      google_maps: 100,
      all_sources: 200
    };
    return limits[source] || 100;
  }

  /**
   * Get available sources
   */
  static getAvailableSources() {
    return [
      { 
        key: 'google_search', 
        name: 'Google Search', 
        description: 'Business Websites & Contact Pages',
        icon: '🔍'
      },
      { 
        key: 'linkedin', 
        name: 'LinkedIn', 
        description: 'Professional Profiles & Company Pages',
        icon: '💼'
      },
      { 
        key: 'google_maps', 
        name: 'Google Maps', 
        description: 'Business Directory & Local Listings',
        icon: '🗺️'
      },
      { 
        key: 'all_sources', 
        name: 'All Sources', 
        description: 'Combined Multi-Source Scraping',
        icon: '🌐'
      }
    ];
  }

  /**
   * Check if scraper is currently processing
   */
  isCurrentlyProcessing() {
    return this.isProcessing;
  }

  /**
   * Get current processing source
   */
  getCurrentSource() {
    return this.currentSource;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isProcessing) {
      console.log(chalk.yellow('\n⚠️  Gracefully stopping current scraping operation...'));
      this.isProcessing = false;
      
      // Give scrapers time to clean up
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(chalk.green('✅ Scraper stopped successfully'));
    }
  }
}
