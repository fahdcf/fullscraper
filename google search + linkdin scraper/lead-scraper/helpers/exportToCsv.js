import { config } from '../config.js';
import chalk from 'chalk';
import fs from 'fs';
import XLSX from 'xlsx';

/**
 * Export results to CSV, Excel, or Text format
 * @param {Array} results - Array of result objects
 * @param {string} format - Export format ('csv', 'xlsx', or 'txt')
 * @param {string} filename - Output filename
 * @param {string} niche - Target niche for text format headers
 * @returns {Promise<string>} - Generated filename
 */
export async function exportResults(results, format = 'csv', filename = null, niche = '') {
  try {
    if (!results || results.length === 0) {
      console.log(chalk.yellow('⚠️  No results to export'));
      return null;
    }

    // Check if this is LinkedIn data (has name and profileUrl fields)
    const isLinkedInData = results.length > 0 && results[0].name && results[0].profileUrl;
    
    if (isLinkedInData) {
      return await exportLinkedInResults(results, format, filename);
    }

    // Generate filename if not provided
    if (!filename) {
      const timestamp = Date.now();
      filename = format === 'xlsx' ? `results_${timestamp}.xlsx` : `results_${timestamp}.csv`;
    }

    if (format === 'xlsx') {
      return await exportToExcel(results, filename);
    } else if (format === 'txt') {
      return await exportToText(results, filename, niche);
    } else {
      return await exportToCsv(results, filename);
    }

  } catch (error) {
    console.error(chalk.red(`❌ Export failed: ${error.message}`));
    throw error;
  }
}

/**
 * Export LinkedIn results with deduplication
 * @param {Array} results - Array of LinkedIn profile objects
 * @param {string} format - Export format ('csv' or 'xlsx')
 * @param {string} filename - Output filename
 */
export async function exportLinkedInResults(results, format, filename) {
  try {
    console.log(`📊 LinkedIn Export Summary:`);
    console.log(`   • Total Profiles Found: ${results.length}`);
    
    // Deduplicate profiles
    const uniqueProfiles = deduplicateLinkedInProfiles(results);
    console.log(`   • Unique Profiles: ${uniqueProfiles.length}`);
    console.log(`   • Duplicates Removed: ${results.length - uniqueProfiles.length}`);
    
    if (format === 'csv') {
      return await exportLinkedInToCsv(uniqueProfiles, filename);
    } else {
      // For Excel, we need to pass the niche to generate proper filename
      // Extract niche from filename or use a default
      const niche = filename ? filename.replace(/_linkedin_results.*$/, '') : 'linkedin_profiles';
      return await exportLinkedInToExcel(uniqueProfiles, niche);
    }
    
  } catch (error) {
    console.error(`❌ Error exporting LinkedIn results: ${error.message}`);
    throw error;
  }
}

/**
 * Enhanced deduplication for LinkedIn profiles
 * Removes duplicates based on name, URL, and bio similarity
 * @param {Array} profiles - Array of LinkedIn profile objects
 * @returns {Array} Deduplicated profiles
 */
function deduplicateLinkedInProfiles(profiles) {
  const seenUrls = new Set();
  const seenNames = new Set();
  const uniqueProfiles = [];
  
  for (const profile of profiles) {
    if (!profile.name || !profile.profileUrl) continue;
    
    // Normalize name and URL
    const normalizedName = profile.name.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedUrl = profile.profileUrl.toLowerCase().trim();
    
    // Check for exact URL duplicates
    if (seenUrls.has(normalizedUrl)) {
      continue; // Skip duplicate URLs
    }
    
    // Check for name duplicates (with some tolerance for minor variations)
    const nameKey = normalizedName.replace(/[^a-z0-9]/g, ''); // Remove special chars for comparison
    if (seenNames.has(nameKey)) {
      // Check if it's the same person with different URL formats
      const existingProfile = uniqueProfiles.find(p => {
        const existingName = p.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        return existingName === nameKey;
      });
      
      if (existingProfile) {
        // Keep the one with more complete information
        const currentScore = calculateProfileCompleteness(profile);
        const existingScore = calculateProfileCompleteness(existingProfile);
        
        if (currentScore > existingScore) {
          // Replace existing profile with better one
          const index = uniqueProfiles.indexOf(existingProfile);
          uniqueProfiles[index] = profile;
          seenUrls.add(normalizedUrl);
        }
        continue;
      }
    }
    
    // Add new unique profile
    seenUrls.add(normalizedUrl);
    seenNames.add(nameKey);
    uniqueProfiles.push(profile);
  }
  
  console.log(chalk.cyan(`📊 LinkedIn Deduplication: ${profiles.length} → ${uniqueProfiles.length} unique profiles`));
  console.log(chalk.gray(`   • Duplicates removed: ${profiles.length - uniqueProfiles.length}`));
  
  return uniqueProfiles;
}

/**
 * Calculate profile completeness score
 * @param {Object} profile - LinkedIn profile object
 * @returns {number} Completeness score (0-100)
 */
function calculateProfileCompleteness(profile) {
  let score = 0;
  
  if (profile.name) score += 20;
  if (profile.profileUrl) score += 20;
  if (profile.bio && profile.bio.length > 10) score += 30;
  if (profile.company) score += 15;
  if (profile.isCompanyPage !== undefined) score += 15;
  
  return score;
}

/**
 * Export LinkedIn results to CSV format
 * @param {Array} profiles - Array of LinkedIn profile objects
 * @param {string} filename - Output filename
 * @returns {Promise<string>} - Generated filename
 */
async function exportLinkedInToCsv(profiles, filename) {
  try {
    const fs = await import('fs/promises');
    
    // Generate filename if not provided
    if (!filename) {
      const timestamp = Date.now();
      filename = `linkedin_results_${timestamp}.csv`;
    }
    
    // Create CSV header
    const headers = ['Name', 'Profile URL', 'Bio', 'Source', 'Query'];
    const csvHeader = headers.join(',') + '\n';
    
    // Create CSV rows
    const csvRows = profiles.map(profile => {
      const name = (profile.name || '').replace(/"/g, '""'); // Escape quotes
      const profileUrl = (profile.profileUrl || '').replace(/"/g, '""');
      const bio = (profile.bio || '').replace(/"/g, '""').replace(/\n/g, ' '); // Remove newlines
      const source = profile.source || 'linkedin';
      const query = (profile.query || '').replace(/"/g, '""');
      
      return `"${name}","${profileUrl}","${bio}","${source}","${query}"`;
    });
    
    const csvContent = csvHeader + csvRows.join('\n');
    
    // Write to file
    await fs.writeFile(filename, csvContent, 'utf8');
    
    console.log(chalk.green(`✅ LinkedIn CSV exported: ${filename}`));
    
    // Verify file was created
    const stats = fs.statSync(filename);
    console.log(`✅ File verified: ${filename} (${stats.size} bytes)`);
    
    return filename;
    
  } catch (error) {
    console.error(chalk.red(`❌ LinkedIn CSV export failed: ${error.message}`));
    throw error;
  }
}

/**
 * Export LinkedIn results to Excel
 * @param {Array} results - LinkedIn profile results
 * @param {string} niche - Target niche
 * @returns {string} File path
 */
export async function exportLinkedInToExcel(results, niche) {
  try {
    console.log(`💾 Saving ${results.length} validated results...`);
    
    // Prepare data for Excel with hyperlinks
    const data = results.map(profile => ({
      'Name': profile.name || '',
      'Profile Link': profile.profileUrl || '',
      'Bio': (profile.bio || '').substring(0, 200) + (profile.bio && profile.bio.length > 200 ? '...' : ''), // Truncate bio
      'Type': profile.isCompanyPage ? 'Company' : 'Individual'
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Add hyperlinks to profile URLs using proper Excel hyperlink format
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const urlCell = XLSX.utils.encode_cell({ r: row, c: 1 }); // Profile Link column (B)
      const url = worksheet[urlCell]?.v;
      
      if (url && url.startsWith('http')) {
        // Set the cell value to the URL and add hyperlink formatting
        worksheet[urlCell] = {
          v: url,
          l: { Target: url, Tooltip: 'Click to open LinkedIn profile' }
        };
      }
    }
    
    // Set column widths and text wrapping for better readability
    worksheet['!cols'] = [
      { width: 25 }, // Name
      { width: 45 }, // Profile Link
      { width: 50 }, // Bio (with text wrapping)
      { width: 15 }  // Type
    ];
    
    // Add text wrapping to Bio column
    const bioColIndex = 2; // Column C (0-indexed)
    for (let row = range.s.r; row <= range.e.r; row++) {
      const bioCell = XLSX.utils.encode_cell({ r: row, c: bioColIndex });
      if (worksheet[bioCell]) {
        worksheet[bioCell].s = {
          alignment: {
            wrapText: true,
            vertical: 'top'
          }
        };
      }
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LinkedIn Profiles');
    
    // Generate filename
    const timestamp = Date.now();
    const filename = `${niche.replace(/[^a-zA-Z0-9]/g, '_')}_linkedin_results_${timestamp}.xlsx`;
    
    console.log(`📁 Saving to: ${filename}`);
    
    // Save file
    XLSX.writeFile(workbook, filename);
    
    console.log(`✅ LinkedIn Excel exported: ${filename}`);
    
    // Verify file was created
    const stats = fs.statSync(filename);
    console.log(`✅ File verified: ${filename} (${stats.size} bytes)`);
    
    return filename;
    
  } catch (error) {
    console.error(`❌ Error exporting LinkedIn to Excel: ${error.message}`);
    throw error;
  }
}

/**
 * Export results to Text format with descriptive header
 * @param {Array} results - Array of result objects
 * @param {string} filename - Output filename
 * @param {string} niche - Target niche for the header
 * @returns {Promise<string>} - Generated filename
 */
async function exportToText(results, filename, niche = '') {
  try {
    if (!results || results.length === 0) {
      console.log(chalk.yellow('⚠️  No results to export'));
      return null;
    }

    // Generate filename if not provided
    if (!filename) {
      const timestamp = Date.now();
      filename = `results_${timestamp}.txt`;
    }

    // Extract and deduplicate emails and phones
    const emails = results.filter(r => r.email && r.email.trim() !== '').map(r => r.email.toLowerCase().trim());
    const phones = results.filter(r => r.phone && r.phone.trim() !== '').map(r => r.phone.trim());
    
    // Remove duplicates using Set
    const uniqueEmails = [...new Set(emails)];
    const uniquePhones = [...new Set(phones)];
    
    // Sort for better readability
    uniqueEmails.sort();
    uniquePhones.sort();
    
    let content = '';
    
    if (uniqueEmails.length > 0 && uniquePhones.length > 0) {
      // Both emails and phones
      content = `Email and Phone Numbers Data for: ${niche}\n`;
      content += `Total Emails: ${uniqueEmails.length} | Total Phone Numbers: ${uniquePhones.length}\n`;
      content += `Generated on: ${new Date().toLocaleString()}\n`;
      content += `─`.repeat(60) + `\n\n`;
      
      content += `EMAILS:\n`;
      content += `─`.repeat(20) + `\n`;
      uniqueEmails.forEach(email => {
        content += `${email}\n`;
      });
      
      content += `\nPHONE NUMBERS:\n`;
      content += `─`.repeat(20) + `\n`;
      uniquePhones.forEach(phone => {
        content += `${phone}\n`;
      });
      
    } else if (uniqueEmails.length > 0) {
      // Only emails
      content = `Email Data for: ${niche}\n`;
      content += `Total Emails: ${uniqueEmails.length}\n`;
      content += `Generated on: ${new Date().toLocaleString()}\n`;
      content += `─`.repeat(60) + `\n\n`;
      
      content += `EMAILS:\n`;
      content += `─`.repeat(20) + `\n`;
      uniqueEmails.forEach(email => {
        content += `${email}\n`;
      });
      
    } else if (uniquePhones.length > 0) {
      // Only phones
      content = `Phone Numbers Data for: ${niche}\n`;
      content += `Total Phone Numbers: ${uniquePhones.length}\n`;
      content += `Generated on: ${new Date().toLocaleString()}\n`;
      content += `─`.repeat(60) + `\n\n`;
      
      content += `PHONE NUMBERS:\n`;
      content += `─`.repeat(20) + `\n`;
      uniquePhones.forEach(phone => {
        content += `${phone}\n`;
      });
    } else {
      content = `No contact information found for: ${niche}\n`;
      content += `Generated on: ${new Date().toLocaleString()}\n`;
    }

    // Write to file
    await fs.promises.writeFile(filename, content, 'utf8');
    console.log(chalk.green(`✅ Text file exported: ${filename}`));
    
    // Verify file was created
    const stats = await fs.promises.stat(filename);
    console.log(chalk.blue(`✅ File verified: ${filename} (${stats.size} bytes)`));
    
    return filename;
    
  } catch (error) {
    console.error(chalk.red(`❌ Text export failed: ${error.message}`));
    throw error;
  }
}

/**
 * Export results to CSV format
 * @param {Array} results - Array of result objects
 * @param {string} filename - Output filename
 * @returns {Promise<string>} - Generated filename
 */
async function exportToCsv(results, filename) {
  try {
    console.log(`💾 Saving ${results.length} validated results...`);
    
    // Create CSV content
    let csvContent = '';
    
    // Add headers
    if (results.length > 0) {
      const headers = Object.keys(results[0]);
      csvContent += headers.join(',') + '\n';
    }
    
    // Add data rows
    for (const result of results) {
      const row = Object.values(result).map(value => {
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvContent += row.join(',') + '\n';
    }
    
    // Write to file
    fs.writeFileSync(filename, csvContent, 'utf8');
    
    console.log(`✅ CSV exported: ${filename}`);
    
    // Verify file was created
    const stats = fs.statSync(filename);
    console.log(`✅ File verified: ${filename} (${stats.size} bytes)`);
    
    return filename;
    
  } catch (error) {
    console.error(`❌ Error exporting to CSV: ${error.message}`);
    throw error;
  }
}

/**
 * Export results to Excel format
 * @param {Array} results - Array of result objects
 * @param {string} filename - Output filename
 * @returns {Promise<string>} - Generated filename
 */
async function exportToExcel(results, filename) {
  try {
    const XLSX = await import('xlsx');
    
    // Prepare data for Excel
    const excelData = results.map(result => ({
      Email: result.email || '',
      Phone: result.phone || ''
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    
    // Write to file
    XLSX.writeFile(workbook, filename);
    
    console.log(chalk.green(`✅ Excel exported: ${filename}`));
    return filename;
    
  } catch (error) {
    console.error(chalk.red(`❌ Excel export failed: ${error.message}`));
    throw error;
  }
}

/**
 * Export multi-source results (legacy function)
 * @param {Array} allResults - Array of all results
 * @param {string} format - Export format ('csv' or 'xlsx')
 * @param {string} filename - Output filename
 * @returns {Promise<string>} - Generated filename
 */
export async function exportMultiSourceResults(allResults, format = 'csv', filename = null) {
  try {
    if (!allResults || allResults.length === 0) {
      console.log(chalk.yellow('⚠️  No results to export'));
      return null;
    }

    // Generate filename if not provided
    if (!filename) {
      const timestamp = Date.now();
      filename = format === 'xlsx' ? `multi_source_results_${timestamp}.xlsx` : `multi_source_results_${timestamp}.csv`;
    }

    if (format === 'xlsx') {
      return await exportMultiSourceToExcel(allResults, filename);
    } else {
      return await exportMultiSourceToCsv(allResults, filename);
    }

  } catch (error) {
    console.error(chalk.red(`❌ Multi-source export failed: ${error.message}`));
    throw error;
  }
}

/**
 * Export multi-source results to CSV
 * @param {Array} allResults - Array of all results
 * @param {string} filename - Output filename
 * @returns {Promise<string>} - Generated filename
 */
async function exportMultiSourceToCsv(allResults, filename) {
  try {
    const fs = await import('fs/promises');
    
    // Create CSV header
    const headers = ['Email', 'Phone', 'Source', 'URL', 'Query'];
    const csvHeader = headers.join(',') + '\n';
    
    // Create CSV rows
    const csvRows = allResults.map(result => {
      const email = result.email || '';
      const phone = result.phone || '';
      const source = result.source || '';
      const url = result.url || '';
      const query = result.query || '';
      
      return `"${email}","${phone}","${source}","${url}","${query}"`;
    });
    
    const csvContent = csvHeader + csvRows.join('\n');
    
    // Write to file
    await fs.writeFile(filename, csvContent, 'utf8');
    
    console.log(chalk.green(`✅ Multi-source CSV exported: ${filename}`));
    return filename;
    
  } catch (error) {
    console.error(chalk.red(`❌ Multi-source CSV export failed: ${error.message}`));
    throw error;
  }
}

/**
 * Export multi-source results to Excel
 * @param {Array} allResults - Array of all results
 * @param {string} filename - Output filename
 * @returns {Promise<string>} - Generated filename
 */
async function exportMultiSourceToExcel(allResults, filename) {
  try {
    const XLSX = await import('xlsx');
    
    // Prepare data for Excel
    const excelData = allResults.map(result => ({
      Email: result.email || '',
      Phone: result.phone || '',
      Source: result.source || '',
      URL: result.url || '',
      Query: result.query || ''
    }));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Multi-Source Results');
    
    // Write to file
    XLSX.writeFile(workbook, filename);
    
    console.log(chalk.green(`✅ Multi-source Excel exported: ${filename}`));
    return filename;
    
  } catch (error) {
    console.error(chalk.red(`❌ Multi-source Excel export failed: ${error.message}`));
    throw error;
  }
} 