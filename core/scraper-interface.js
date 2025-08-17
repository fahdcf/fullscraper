import chalk from 'chalk';

/**
 * Base Scraper Interface - All scrapers must inherit from this
 * Ensures consistent behavior across different scraping sources
 */
export class ScraperInterface {
  constructor(sourceName, displayName) {
    this.sourceName = sourceName;
    this.displayName = displayName || sourceName;
    this.startTime = null;
    this.isRunning = false;
  }

  /**
   * Main scraping method - Must be implemented by all scrapers
   * @param {string} niche - Target business niche
   * @param {Object} options - Scraping options
   * @returns {Promise<Array>} Scraped results
   */
  async scrape(niche, options = {}) {
    throw new Error(`Scraper ${this.sourceName} must implement scrape() method`);
  }

  /**
   * Validate niche input for this scraper
   * @param {string} niche - Target business niche
   * @returns {boolean} Whether niche is valid
   */
  validateNiche(niche) {
    if (!niche || typeof niche !== 'string') {
      return false;
    }
    
    const trimmed = niche.trim();
    
    // Basic validation
    if (trimmed.length < 3) {
      return false;
    }
    
    // Remove common invalid patterns
    const invalidPatterns = [
      /^test\s*$/i,
      /^example\s*$/i,
      /^sample\s*$/i,
      /^\d+$/,  // Only numbers
      /^[!@#$%^&*()]+$/  // Only special characters
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * Transform results to unified format (optional override)
   * @param {Array} results - Raw results from scraper
   * @param {string} dataType - Type of data requested
   * @returns {Array} Transformed results
   */
  transformResults(results, dataType) {
    return results;
  }

  /**
   * Get source-specific configuration (optional override)
   * @returns {Object} Configuration object
   */
  getConfig() {
    return {};
  }

  /**
   * Pre-scraping setup (optional override)
   * @param {Object} options - Scraping options
   */
  async setup(options = {}) {
    this.startTime = Date.now();
    this.isRunning = true;
    
    console.log(chalk.gray(`⚙️  Setting up ${this.displayName} scraper...`));
  }

  /**
   * Post-scraping cleanup (optional override)
   * @param {Array} results - Scraping results
   */
  async cleanup(results = []) {
    this.isRunning = false;
    
    const duration = this.startTime ? Date.now() - this.startTime : 0;
    const durationStr = this.formatDuration(duration);
    
    console.log(chalk.gray(`✅ ${this.displayName} scraper completed in ${durationStr}`));
    console.log(chalk.gray(`📊 Total results: ${results.length}\n`));
  }

  /**
   * Handle errors during scraping (optional override)
   * @param {Error} error - Error that occurred
   * @param {string} context - Context where error occurred
   */
  async handleError(error, context = 'scraping') {
    this.isRunning = false;
    
    console.error(chalk.red(`❌ Error in ${this.displayName} ${context}: ${error.message}`));
    
    // Log additional context for debugging
    if (error.code) {
      console.error(chalk.gray(`   Error code: ${error.code}`));
    }
    
    if (error.status || error.statusCode) {
      console.error(chalk.gray(`   Status code: ${error.status || error.statusCode}`));
    }
    
    throw error;
  }

  /**
   * Format duration in human-readable format
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Log progress information
   * @param {string} message - Progress message
   * @param {Object} stats - Optional statistics
   */
  logProgress(message, stats = {}) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(chalk.blue(`[${timestamp}] ${this.displayName}: ${message}`));
    
    if (Object.keys(stats).length > 0) {
      Object.entries(stats).forEach(([key, value]) => {
        console.log(chalk.gray(`   ${key}: ${value}`));
      });
    }
  }

  /**
   * Check if scraper is currently running
   * @returns {boolean} Whether scraper is running
   */
  isScraperRunning() {
    return this.isRunning;
  }

  /**
   * Get scraper runtime statistics
   * @returns {Object} Runtime statistics
   */
  getStats() {
    const runtime = this.startTime ? Date.now() - this.startTime : 0;
    
    return {
      sourceName: this.sourceName,
      displayName: this.displayName,
      isRunning: this.isRunning,
      startTime: this.startTime,
      runtime: runtime,
      runtimeFormatted: this.formatDuration(runtime)
    };
  }

  /**
   * Parse niche into business type and location (utility method)
   * @param {string} niche - Raw niche input
   * @returns {Object} Parsed business type and location
   */
  parseNiche(niche) {
    const words = niche.trim().toLowerCase().split(/\s+/);
    
    // Simple parsing - last word is likely location
    const location = words.length > 1 ? words[words.length - 1] : '';
    const businessType = words.length > 1 ? words.slice(0, -1).join(' ') : niche;
    
    return {
      businessType: businessType.trim(),
      location: location.trim(),
      originalNiche: niche.trim()
    };
  }

  /**
   * Validate and sanitize email address
   * @param {string} email - Email to validate
   * @returns {string|null} Sanitized email or null if invalid
   */
  sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
      return null;
    }
    
    const sanitized = email.toLowerCase().trim();
    
    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(sanitized)) {
      return null;
    }
    
    // Filter out common test/fake emails
    const blacklistPatterns = [
      /example\.(com|org|net)/,
      /test\.(com|org|net)/,
      /dummy\.(com|org|net)/,
      /fake\.(com|org|net)/,
      /^test@/,
      /^demo@/,
      /^example@/,
      /^noreply@/,
      /^no-reply@/
    ];
    
    if (blacklistPatterns.some(pattern => pattern.test(sanitized))) {
      return null;
    }
    
    return sanitized;
  }

  /**
   * Validate and sanitize phone number
   * @param {string} phone - Phone number to validate
   * @returns {string|null} Sanitized phone or null if invalid
   */
  sanitizePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return null;
    }
    
    // Remove all non-digit characters except + and spaces/hyphens
    const cleaned = phone.replace(/[^\d+\s-]/g, '');
    
    // Basic phone validation (at least 7 digits)
    const digitCount = (cleaned.match(/\d/g) || []).length;
    
    if (digitCount < 7) {
      return null;
    }
    
    // Filter out obviously fake numbers
    const fakePatterns = [
      /^0+$/,
      /^1+$/,
      /^123+$/,
      /^999+$/,
      /^555+$/
    ];
    
    const digitsOnly = cleaned.replace(/[^\d]/g, '');
    
    if (fakePatterns.some(pattern => pattern.test(digitsOnly))) {
      return null;
    }
    
    return cleaned.trim();
  }
}
