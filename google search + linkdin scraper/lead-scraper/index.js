
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { config } from './config.js';
import { searchGoogle, filterUrls } from './helpers/googleSearch.js';
import { fetchPage, delay } from './helpers/fetchPage.js';
import { extractEmails } from './helpers/extractEmails.js';
import { extractPhones } from './helpers/extractPhones.js';
import { exportResults } from './helpers/exportToCsv.js';

// Main scraping logic, now exported for programmatic use
async function runScraper({ queries, format, output, onQuotaExceeded } = {}) {
  // ...existing code...
  let isProcessing = false;
  let currentResults = [];
  let currentNiche = '';
  let currentDataType = '';

  // Handle interruption (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('\n⚠️  Interruption detected. Saving partial results...');
    if (isProcessing && currentResults.length > 0) {
      try {
        if (currentDataType === 'linkedin') {
          // Save LinkedIn partial results
          // ...existing code...
        } else {
          // Save Google Search partial results
          // ...existing code...
        }
        console.log('✅ Partial results saved successfully!');
      } catch (error) {
        console.error(`❌ Error saving partial results: ${error.message}`);
      }
    }
    console.log('Cleaning up...');
    process.exit(0);
  });

  // Use custom queries if provided, otherwise use config
  const usedQueries = queries
    ? queries
    : config.searchQueries;
  const options = { format: format || config.output.defaultFormat, output };

  console.log(chalk.blue.bold('🚀 Web Scraper CLI Starting...\n'));
  console.log(chalk.yellow(`📋 Processing ${usedQueries.length} search queries...`));
  console.log(chalk.gray('Queries:', usedQueries.join(', ')));
  console.log('');

  const allResults = [];
  const allEmails = new Set();
  const allPhones = new Set();

  // Process each query sequentially
  for (let i = 0; i < usedQueries.length; i++) {
    const query = usedQueries[i];
    const spinner = ora(`🔍 Searching for: "${query}"`).start();
    try {
      // Search Google for URLs
      let searchResults;
      try {
        searchResults = await searchGoogle(query);
      } catch (e) {
        // If quota error, try to rotate key if callback provided
        if (onQuotaExceeded) {
          onQuotaExceeded(config.googleSearch.currentKeyIndex);
        }
        throw e;
      }
      spinner.text = `🔍 Found ${searchResults.length} URLs for: "${query}"`;
      // ...existing code...
      const filteredUrls = filterUrls(searchResults);
      spinner.text = `🔍 Filtered to ${filteredUrls.length} relevant URLs for: "${query}"`;
      if (filteredUrls.length === 0) {
        spinner.warn(`⚠️  No relevant URLs found for: "${query}"`);
        continue;
      }
      for (let j = 0; j < filteredUrls.length; j++) {
        const urlData = filteredUrls[j];
        const url = urlData.url;
        spinner.text = `🌐 Scraping (${j + 1}/${filteredUrls.length}): ${url}`;
        const html = await fetchPage(url);
        if (!html) {
          console.log(chalk.red(`❌ Failed to fetch: ${url}`));
          continue;
        }
        const emails = extractEmails(html);
        const phones = extractPhones(html);
        emails.forEach(email => allEmails.add(email.toLowerCase()));
        phones.forEach(phone => allPhones.add(phone));
        if (emails.length > 0 || phones.length > 0) {
          allResults.push({ url: url, emails: emails, phones: phones });
        }
        if (j < filteredUrls.length - 1) {
          await delay();
        }
      }
      spinner.succeed(`✅ Completed query "${query}" - Found ${filteredUrls.length} URLs`);
      if (i < usedQueries.length - 1) {
        await delay(3000);
      }
    } catch (error) {
      spinner.fail(`❌ Error processing query "${query}": ${error.message}`);
      if (error.message && error.message.includes('quota')) {
        if (onQuotaExceeded) onQuotaExceeded(config.googleSearch.currentKeyIndex);
        throw error;
      }
    }
  }
  // ...existing code...
  console.log('\n' + chalk.blue.bold('📊 Processing Results...'));
  const finalResults = [];
  const emailsArray = Array.from(allEmails);
  const phonesArray = Array.from(allPhones);
  const maxLength = Math.max(emailsArray.length, phonesArray.length);
  for (let i = 0; i < maxLength; i++) {
    finalResults.push({ email: emailsArray[i] || '', phone: phonesArray[i] || '' });
  }
  console.log(chalk.green.bold('\n📈 Scraping Summary:'));
  console.log(chalk.green(`   • Total URLs processed: ${allResults.length}`));
  console.log(chalk.green(`   • Unique emails found: ${emailsArray.length}`));
  console.log(chalk.green(`   • Unique phones found: ${phonesArray.length}`));
  console.log(chalk.green(`   • Final results: ${finalResults.length} rows`));
  const outputFormat = options.format;
  const outputFile = options.output || (outputFormat === 'xlsx' ? config.output.xlsxFile : config.output.csvFile);
  console.log(chalk.blue.bold(`\n💾 Exporting to ${outputFormat.toUpperCase()}...`));
  await exportResults(finalResults, outputFormat);
  if (finalResults.length > 0) {
    console.log(chalk.yellow.bold('\n📋 Sample Results:'));
    finalResults.slice(0, 5).forEach((result, index) => {
      console.log(chalk.gray(`${index + 1}. Email: ${result.email || 'N/A'} | Phone: ${result.phone || 'N/A'}`));
    });
    if (finalResults.length > 5) {
      console.log(chalk.gray(`   ... and ${finalResults.length - 5} more results`));
    }
  }
  console.log(chalk.green.bold('\n✅ Scraping completed successfully!'));
}

// CLI entry for old system
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  import('commander').then(({ Command }) => {
    const program = new Command();
    program
      .name('web-scraper-cli')
      .description('CLI tool to scrape emails and phone numbers from company URLs')
      .version('1.0.0')
      .option('-f, --format <format>', 'Output format (csv or xlsx)', 'csv')
      .option('-q, --queries <queries>', 'Custom search queries (comma-separated)')
      .option('-o, --output <filename>', 'Output filename')
      .parse();
    const options = program.opts();
    runScraper({
      queries: options.queries ? options.queries.split(',').map(q => q.trim()) : undefined,
      format: options.format,
      output: options.output
    }).catch((error) => {
      console.error(chalk.red.bold('\n❌ Fatal error:'), error.message);
      process.exit(1);
    });
  });
}

export default runScraper;