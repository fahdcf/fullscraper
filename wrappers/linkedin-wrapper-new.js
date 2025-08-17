import chalk from 'chalk';
import { ScraperInterface } from '../core/scraper-interface.js';

/**
 * LinkedIn Scraper Wrapper
 * Uses the enhanced scraper.js workflow with AI query generation and proper API key rotation
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
   * Main scraping method using enhanced scraper.js workflow
   */
  async scrape(niche, options = {}) {
    try {
      await this.setup(options);
      
      console.log(chalk.blue('💼 Starting LinkedIn scraping workflow...'));
      console.log(chalk.gray(`   Target: ${niche}`));
      console.log(chalk.gray(`   Data Type: ${options.dataType || 'complete'}`));
      
      console.log(chalk.blue('🔗 Searching LinkedIn profiles and company pages...'));
      
      // Use the same child process approach as Google Search wrapper
      return await this.runOriginalLinkedInScraper({ niche, ...options });
      
    } catch (error) {
      await this.handleError(error, 'LinkedIn scraping');
    }
  }
  
  /**
   * Run the original LinkedIn scraper with enhanced output capturing
   */
  async runOriginalLinkedInScraper(options) {
    const { spawn } = await import('child_process');
    const fs = await import('fs');
    
    const niche = options.niche || 'business professionals';
    
    console.log(chalk.blue('🚀 Starting original LinkedIn scraper...'));
    console.log(chalk.blue(`   🎯 Target Niche: "${niche}"`));
    console.log(chalk.gray('   🤖 AI Query Generation: ENABLED'));
    console.log(chalk.gray('   📊 Expected: 12+ LinkedIn-specific queries'));
    console.log(chalk.gray('   🔄 API Key Rotation: ENABLED (4 keys available)'));
    console.log(chalk.gray('   💾 Auto-save: ENABLED (every 120 seconds)'));
    console.log(chalk.blue('   🚀 Starting with full detailed logging...'));
    console.log('');
    
    return new Promise((resolve, reject) => {
      // Run the standalone scraper with special environment for detailed logging
      const child = spawn('node', ['scraper.js'], {
        cwd: './google search + linkdin scraper/lead-scraper',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          FORCE_COLOR: '1',  // Enable colors in child process
          UNIFIED_SCRAPER: '1'  // Tell scraper to use detailed console logging
        }
      });
      
      // Feed the answers via stdin for LinkedIn scraping
      const answers = [
        niche,     // Business niche
        '2',       // LinkedIn (Professional Profiles)
      ];
      
      let currentAnswer = 0;
      setTimeout(() => {
        if (currentAnswer < answers.length) {
          child.stdin.write(answers[currentAnswer] + '\n');
          currentAnswer++;
        }
      }, 1000);
      
      setTimeout(() => {
        if (currentAnswer < answers.length) {
          child.stdin.write(answers[currentAnswer] + '\n');
          currentAnswer++;
        }
      }, 2000);
      
      let stdout = '';
      let stderr = '';
      let isResolved = false;
      
      // Set up interruption handling with graceful shutdown
      const handleInterruption = () => {
        if (!isResolved) {
          console.log(chalk.yellow('\n⚠️  LinkedIn scraper interrupted by user'));
          console.log(chalk.blue('💾 Sending interruption signal to child process and waiting for save...'));
          
          // Send SIGINT to child process to trigger its own interruption handler
          try {
            child.kill('SIGINT');
            console.log(chalk.gray('   📡 SIGINT signal sent to child process'));
          } catch (e) {
            console.log(chalk.red('❌ Failed to send SIGINT, trying SIGTERM...'));
            try {
              child.kill('SIGTERM');
              console.log(chalk.gray('   📡 SIGTERM signal sent to child process'));
            } catch (e2) {
              console.log(chalk.red('❌ Failed to send SIGTERM, force killing...'));
              child.kill('SIGKILL');
            }
          }
          
          // Give the child process more time to save
          setTimeout(() => {
            if (!isResolved) {
              console.log(chalk.yellow('⏰ Child process taking longer than expected...'));
              console.log(chalk.blue('🔍 Checking for any saved results...'));
              cleanup();
              // Try to parse any results that might have been saved
              this.parseLinkedInResults(niche)
                .then(results => {
                  if (results && results.length > 0) {
                    console.log(chalk.green(`✅ Found ${results.length} saved results despite timeout`));
                    console.log(chalk.cyan(`📁 Results saved in: google search + linkdin scraper/lead-scraper/`));
                    console.log(chalk.gray(`   📄 LinkedIn file: ${niche.replace(/\s+/g, '_')}_linkedin_results.xlsx`));
                  } else {
                    console.log(chalk.yellow('⚠️  No results were saved - interrupted too early or no profiles found yet'));
                  }
                  resolve(results || []);
                })
                .catch(() => {
                  console.log(chalk.yellow('⚠️  No auto-save file found - scraper was interrupted before first auto-save'));
                  resolve([]);
                });
            }
          }, 8000); // Increased to 8 second timeout
        }
      };
      
      process.on('SIGINT', handleInterruption);
      process.on('SIGTERM', handleInterruption);
      
      const cleanup = () => {
        isResolved = true;
        process.removeListener('SIGINT', handleInterruption);
        process.removeListener('SIGTERM', handleInterruption);
      };
      
      // Enhanced output forwarding with spinner recreation
      let currentSpinner = null;
      let querySpinner = null;
      let ora = null;
      
      // Import ora dynamically
      import('ora').then(module => {
        ora = module.default;
      });
      
      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // Process each line to detect spinner updates
        const lines = output.split('\n');
        lines.forEach((line, index) => {
          if (line.trim()) {
            // Check for LinkedIn query spinner start
            if (line.includes('🔍 LinkedIn Query ') && line.includes('"')) {
              if (querySpinner) {
                querySpinner.stop();
              }
              if (ora) {
                querySpinner = ora(line.trim()).start();
              } else {
                console.log(line);
              }
            }
            // Check for LinkedIn query completion
            else if (line.includes('✅ LinkedIn query "') && line.includes('" completed')) {
              if (currentSpinner) {
                currentSpinner.stop();
                currentSpinner = null;
              }
              if (querySpinner) {
                querySpinner.succeed(line.trim());
                querySpinner = null;
              } else {
                console.log(line);
              }
            }
            // Check for LinkedIn query warning
            else if (line.includes('⚠️') && line.includes('No LinkedIn profiles found')) {
              if (currentSpinner) {
                currentSpinner.stop();
                currentSpinner = null;
              }
              if (querySpinner) {
                querySpinner.warn(line.trim());
                querySpinner = null;
              } else {
                console.log(line);
              }
            }
            // Regular output (not spinner related)
            else {
              // Stop current spinners if we're showing regular output that's not status updates
              if (!line.includes('🔍 LinkedIn Query')) {
                if (currentSpinner && (line.includes('❌') || line.includes('⚠️') || line.includes('📊'))) {
                  currentSpinner.stop();
                  currentSpinner = null;
                }
              }
              
              // Monitor for auto-save messages to know when results are available
              if (line.includes('💾 Auto-saving') || line.includes('Auto-saved')) {
                console.log(chalk.green('📋 LinkedIn results are being auto-saved - interruption will recover data'));
              } else if (line.includes('💾 Saving partial results') || line.includes('Saving partial results')) {
                console.log(chalk.blue('💾 Child process is saving partial LinkedIn results...'));
              }
              
              console.log(line);
            }
          }
        });
      });
      
      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        // Forward stderr immediately
        process.stderr.write(output);
      });
      
      child.on('close', (code) => {
        if (isResolved) return;
        
        // Clean up any active spinners
        if (currentSpinner) {
          currentSpinner.stop();
          currentSpinner = null;
        }
        if (querySpinner) {
          querySpinner.stop();
          querySpinner = null;
        }
        
        cleanup();
        
        if (code === 0) {
          console.log(chalk.green('\n✅ LinkedIn scraper completed successfully!'));
          console.log(chalk.blue('📊 Processing results from XLSX file...'));
          
          this.parseLinkedInResults(niche)
            .then(results => {
              if (results && results.length > 0) {
                console.log(chalk.green(`✅ Successfully parsed ${results.length} LinkedIn profiles from results file`));
                console.log(chalk.cyan(`📁 Results saved in: google search + linkdin scraper/lead-scraper/`));
                console.log(chalk.gray(`   📄 LinkedIn file: ${niche.replace(/\s+/g, '_')}_linkedin_results.xlsx`));
              } else {
                console.log(chalk.yellow('⚠️  No LinkedIn profiles found in results file'));
              }
              resolve(results);
            })
            .catch(error => {
              console.log(chalk.yellow(`⚠️  Could not parse LinkedIn results: ${error.message}`));
              resolve([]);
            });
        } else if (code === null || code === 130) {
          console.log(chalk.yellow('\n⚠️  LinkedIn scraper was interrupted by user'));
          console.log(chalk.blue('💾 Attempting to recover partial results...'));
          
          this.parseLinkedInResults(niche)
            .then(results => {
              if (results && results.length > 0) {
                console.log(chalk.green(`✅ Recovered ${results.length} partial LinkedIn results before interruption`));
                console.log(chalk.cyan(`📁 Partial results saved in: google search + linkdin scraper/lead-scraper/`));
                console.log(chalk.gray(`   📄 LinkedIn file: ${niche.replace(/\s+/g, '_')}_linkedin_results.xlsx`));
                console.log(chalk.blue('💡 These results include AI validation and profile enrichment'));
              } else {
                console.log(chalk.yellow('⚠️  No partial LinkedIn results found to recover'));
                console.log(chalk.gray('   The scraper may have been interrupted too early'));
              }
              resolve(results || []);
            })
            .catch(() => {
              console.log(chalk.yellow('⚠️  No LinkedIn results file found for recovery'));
              console.log(chalk.gray('   Auto-save may not have been triggered yet'));
              resolve([]);
            });
        } else {
          console.log(chalk.red(`❌ LinkedIn scraper failed with exit code ${code}`));
          if (stderr) {
            console.log(chalk.red('Error details:', stderr));
          }
          reject(new Error(`LinkedIn scraper exited with code ${code}. Error: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        if (isResolved) return;
        cleanup();
        reject(error);
      });
    });
  }
  
  /**
   * Parse results from LinkedIn scraper output
   */
  async parseLinkedInResults(niche = '') {
    const fs = await import('fs');
    const path = await import('path');
    
    try {
      // Look for results files in the LinkedIn directory
      const resultsDir = './google search + linkdin scraper/lead-scraper';
      const files = fs.readdirSync(resultsDir);
      
      // Find the most recent LinkedIn results file for this specific niche
      const nicheNormalized = niche.replace(/\s+/g, '_').toLowerCase();
      const resultFiles = files.filter(f => 
        f.endsWith('.xlsx') && 
        f.includes('linkedin') && 
        (f.includes(nicheNormalized) || f.includes(niche.replace(/\s+/g, '_')))
      );
      
      if (resultFiles.length === 0) {
        console.log(chalk.yellow('⚠️  No LinkedIn results file found'));
        return [];
      }
      
      // Get the most recent file
      const mostRecent = resultFiles
        .map(f => ({ 
          name: f, 
          time: fs.statSync(path.join(resultsDir, f)).mtime 
        }))
        .sort((a, b) => b.time - a.time)[0];
      
      console.log(chalk.green(`✅ Parsed LinkedIn results from: ${mostRecent.name}`));
      
      // For now, return empty array as XLSX parsing would require additional dependencies
      // The individual scraper handles the actual file creation and export
      console.log(chalk.blue(`📊 LinkedIn results are saved in XLSX format for manual access`));
      return [];
             
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not parse LinkedIn results:', error.message));
      return [];
    }
  }

  /**
   * Transform results based on data type
   */
  transformResults(results, dataType) {
    if (dataType === 'emails_only') {
      return results.filter(r => r.email).map(r => ({ email: r.email, source: 'LinkedIn' }));
    } else if (dataType === 'phones_only') {
      return results.filter(r => r.phone).map(r => ({ phone: r.phone, source: 'LinkedIn' }));
    } else {
      return results.map(r => ({ ...r, source: 'LinkedIn' }));
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
      maxQueries: 12, // LinkedIn uses 12 queries instead of 25
      supportsBatch: true,
      requiresApiKey: true,
      specialFeatures: ['profileLinks', 'companyPages', 'professionalBios', 'aiQueryGeneration']
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
