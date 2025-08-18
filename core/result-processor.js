import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import XLSX from 'xlsx';

/**
 * Result Processor - Handles output formatting and export for all sources
 * Provides unified result processing regardless of source
 */
export class ResultProcessor {
  constructor() {
    this.outputDir = './results';
  }

  /**
   * Process and export results from any source
   * @param {Array} results - Raw results from scraper
   * @param {string} source - Source type
   * @param {string} dataType - Type of data
   * @param {string} format - Output format
   * @param {string} niche - Original niche
   * @returns {Promise<Array>} Processed results
   */
  async process(results, source, dataType, format, niche) {
    try {
      console.log(chalk.blue.bold('📊 Processing results...\n'));
      
      // Ensure output directory exists
      await this.ensureOutputDirectory();
      
      // Process results based on source and data type
      const processedResults = this.processResultsBySource(results, source, dataType);
      
      // Generate statistics
      const stats = this.generateStatistics(processedResults, source);
      
      // Display summary
      this.displaySummary(stats, source, dataType);
      
      // Export results
      const filename = await this.exportResults(processedResults, source, dataType, format, niche);
      
      console.log(chalk.green.bold('\n✅ Results processed successfully!'));
      console.log(chalk.gray(`💾 Saved to: ${filename}`));
      console.log(chalk.gray(`📊 Total records: ${processedResults.length}\n`));
      
      return processedResults;
      
    } catch (error) {
      console.error(chalk.red(`❌ Error processing results: ${error.message}`));
      throw error;
    }
  }

  /**
   * Process results based on source type
   */
  processResultsBySource(results, source, dataType) {
    switch (source) {
      case 'google_search':
        return this.processGoogleSearchResults(results, dataType);
      case 'linkedin':
        return this.processLinkedInResults(results, dataType);
      case 'google_maps':
        return this.processGoogleMapsResults(results, dataType);
      case 'all_sources':
        return this.processAllSourcesResults(results, dataType);
      default:
        return results;
    }
  }

  /**
   * Process Google Search results
   */
  processGoogleSearchResults(results, dataType) {
    const processed = [];
    const emailSet = new Set();
    const phoneSet = new Set();
    
    results.forEach(result => {
      if (dataType === 'emails' && result.email) {
        if (!emailSet.has(result.email.toLowerCase())) {
          emailSet.add(result.email.toLowerCase());
          processed.push({ email: result.email, source: 'Google Search' });
        }
      } else if (dataType === 'phones' && result.phone) {
        if (!phoneSet.has(result.phone)) {
          phoneSet.add(result.phone);
          processed.push({ phone: result.phone, source: 'Google Search' });
        }
      } else if (dataType === 'contacts') {
        const item = { source: 'Google Search' };
        if (result.email) item.email = result.email;
        if (result.phone) item.phone = result.phone;
        if (item.email || item.phone) {
          processed.push(item);
        }
      }
    });
    
    return processed;
  }

  /**
   * Process LinkedIn results
   */
  processLinkedInResults(results, dataType) {
    const processed = [];
    const urlSet = new Set();
    
    results.forEach(result => {
      // Avoid duplicate LinkedIn profiles
      if (result.profileUrl && !urlSet.has(result.profileUrl)) {
        urlSet.add(result.profileUrl);
        
        const item = {
          source: 'LinkedIn'
        };
        
        if (dataType === 'profiles' || dataType === 'complete') {
          item.name = result.name || '';
          item.profileUrl = result.profileUrl || '';
          item.bio = result.bio || '';
          item.isCompanyPage = result.isCompanyPage || false;
        }
        
        if (dataType === 'contacts' || dataType === 'complete') {
          if (result.email) item.email = result.email;
          if (result.phone) item.phone = result.phone;
        }
        
        processed.push(item);
      }
    });
    
    return processed;
  }

  /**
   * Process Google Maps results
   */
  processGoogleMapsResults(results, dataType) {
    const processed = [];
    const nameSet = new Set();
    
    results.forEach(result => {
      // Avoid duplicate businesses by name
      const businessKey = `${result.name || ''}-${result.phone || ''}`;
      if (!nameSet.has(businessKey)) {
        nameSet.add(businessKey);
        
        const item = {
          source: 'Google Maps'
        };
        
        if (dataType === 'profiles' || dataType === 'complete') {
          item.businessName = result.name || '';
          item.address = result.location || '';
          item.website = result.website || '';
        }
        
        if (dataType === 'contacts' || dataType === 'complete') {
          if (result.phone) item.phone = result.phone;
          if (result.emails) {
            if (Array.isArray(result.emails)) {
              item.emails = result.emails.join(', ');
            } else if (typeof result.emails === 'string') {
              item.emails = result.emails;
            }
          }
        }
        
        processed.push(item);
      }
    });
    
    return processed;
  }

  /**
   * Process combined results from all sources
   */
  processAllSourcesResults(results, dataType) {
    // Results from all sources are already processed by individual processors
    return results.map(result => ({
      ...result,
      source: result.source || 'Combined'
    }));
  }

  /**
   * Generate statistics for results
   */
  generateStatistics(results, source) {
    const stats = {
      total: results.length,
      withEmails: 0,
      withPhones: 0,
      withProfiles: 0,
      sources: {},
      emails: new Set(),
      phones: new Set()
    };
    
    results.forEach(result => {
      // Count by source
      const resultSource = result.source || source;
      stats.sources[resultSource] = (stats.sources[resultSource] || 0) + 1;
      
      // Count data types
      if (result.email || result.emails) {
        stats.withEmails++;
        if (result.email) stats.emails.add(result.email.toLowerCase());
        if (result.emails) {
          result.emails.split(',').forEach(email => {
            stats.emails.add(email.trim().toLowerCase());
          });
        }
      }
      
      if (result.phone) {
        stats.withPhones++;
        stats.phones.add(result.phone);
      }
      
      if (result.profileUrl || result.businessName) {
        stats.withProfiles++;
      }
    });
    
    stats.uniqueEmails = stats.emails.size;
    stats.uniquePhones = stats.phones.size;
    
    return stats;
  }

  /**
   * Display summary of results
   */
  displaySummary(stats, source, dataType) {
    console.log(chalk.blue.bold('📈 Results Summary:'));
    console.log(chalk.gray('─────────────────────────────────────'));
    
    console.log(chalk.white(`📊 Total Results: ${chalk.yellow(stats.total)}`));
    
    if (stats.withEmails > 0) {
      console.log(chalk.white(`📧 With Emails: ${chalk.yellow(stats.withEmails)} (${chalk.yellow(stats.uniqueEmails)} unique)`));
    }
    
    if (stats.withPhones > 0) {
      console.log(chalk.white(`📞 With Phones: ${chalk.yellow(stats.withPhones)} (${chalk.yellow(stats.uniquePhones)} unique)`));
    }
    
    if (stats.withProfiles > 0) {
      console.log(chalk.white(`👤 Profiles: ${chalk.yellow(stats.withProfiles)}`));
    }
    
    // Source breakdown for combined results
    if (Object.keys(stats.sources).length > 1) {
      console.log(chalk.white('\n📊 By Source:'));
      Object.entries(stats.sources).forEach(([sourceName, count]) => {
        console.log(chalk.gray(`   ${sourceName}: ${count}`));
      });
    }
    
    console.log(chalk.gray('─────────────────────────────────────'));
  }

  /**
   * Export results to specified format
   */
  async exportResults(results, source, dataType, format, niche) {
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const sanitizedNiche = niche.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase();
    const filename = `${sanitizedNiche}_${source}_${dataType}_${timestamp}.${format}`;
    const filepath = path.join(this.outputDir, filename);
    
    switch (format) {
      case 'xlsx':
        await this.exportToExcel(results, filepath, source);
        break;
      case 'csv':
        await this.exportToCSV(results, filepath);
        break;
      case 'json':
        await this.exportToJSON(results, filepath, source, dataType, niche);
        break;
      case 'txt':
        await this.exportToTXT(results, filepath, source, dataType, niche);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    return filename;
  }

  /**
   * Export to Excel format
   */
  async exportToExcel(results, filepath, source) {
    const workbook = XLSX.utils.book_new();
    
    // Prepare data based on result structure
    const worksheetData = results.map(result => {
      const row = {};
      
      // Common fields
      if (result.source) row['Source'] = result.source;
      if (result.email) row['Email'] = result.email;
      if (result.emails) row['Emails'] = result.emails;
      if (result.phone) row['Phone'] = result.phone;
      
      // LinkedIn specific
      if (result.name) row['Name'] = result.name;
      if (result.profileUrl) row['LinkedIn URL'] = result.profileUrl;
      if (result.bio) row['Bio'] = result.bio;
      if (result.isCompanyPage !== undefined) row['Is Company'] = result.isCompanyPage ? 'Yes' : 'No';
      
      // Google Maps specific
      if (result.businessName) row['Business Name'] = result.businessName;
      if (result.address) row['Address'] = result.address;
      if (result.website) row['Website'] = result.website;
      
      return row;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    // Auto-size columns
    const cols = [];
    if (worksheetData.length > 0) {
      Object.keys(worksheetData[0]).forEach(key => {
        const maxLength = Math.max(
          key.length,
          ...worksheetData.map(row => String(row[key] || '').length)
        );
        cols.push({ width: Math.min(maxLength + 2, 50) });
      });
    }
    worksheet['!cols'] = cols;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    // Use manual buffer write instead of XLSX.writeFile for better compatibility
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    await fs.writeFile(filepath, buffer);
  }

  /**
   * Export to CSV format
   */
  async exportToCSV(results, filepath) {
    if (results.length === 0) {
      await fs.writeFile(filepath, 'No results found\n');
      return;
    }
    
    // Get all unique keys
    const keys = [...new Set(results.flatMap(Object.keys))];
    
    // Create CSV content
    const csvContent = [
      keys.join(','),
      ...results.map(result => 
        keys.map(key => {
          const value = result[key] || '';
          // Escape commas and quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    await fs.writeFile(filepath, csvContent);
  }

  /**
   * Export to JSON format
   */
  async exportToJSON(results, filepath, source, dataType, niche) {
    const jsonData = {
      metadata: {
        niche,
        source,
        dataType,
        scrapedAt: new Date().toISOString(),
        totalResults: results.length
      },
      results
    };
    
    await fs.writeFile(filepath, JSON.stringify(jsonData, null, 2));
  }

  /**
   * Export to TXT format (Google Search format)
   */
  async exportToTXT(results, filepath, source, dataType, niche) {
    let content = [];
    
    // Prepare counts first so header and summary are consistent
    const emails = results.filter(r => r.email).map(r => r.email);
    const phones = results.filter(r => r.phone).map(r => r.phone);
    const totalContacts = emails.length + phones.length;

    // Add header with niche and timestamp
    content.push(`# ${niche} - ${source} Results`);
    content.push(`# Generated: ${new Date().toLocaleString()}`);
    content.push(`# Total Results: ${totalContacts}`);
    content.push('');
    
    // Separate emails and phones like the original Google Search format
    
    if (emails.length > 0) {
      content.push('EMAILS:');
      content.push('======');
      emails.forEach(email => content.push(email));
      content.push('');
    }
    
    if (phones.length > 0) {
      content.push('PHONE NUMBERS:');
      content.push('=============');
      phones.forEach(phone => content.push(phone));
      content.push('');
    }
    
    // Add summary
    content.push('SUMMARY:');
    content.push('========');
    content.push(`Total Emails: ${emails.length}`);
    content.push(`Total Phones: ${phones.length}`);
    content.push(`Total Contacts: ${totalContacts}`);
    
    // Write to file
    await fs.writeFile(filepath, content.join('\n'), 'utf8');
    console.log(chalk.green(`✅ TXT file exported: ${path.basename(filepath)}`));
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDirectory() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(chalk.gray(`📁 Created output directory: ${this.outputDir}`));
    }
  }
}
