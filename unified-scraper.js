#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { SourceManager } from './core/source-manager.js';

/**
 * Unified Business Scraper
 * Master entry point for all scraping sources
 */

async function displayWelcome() {
  console.clear();
  console.log(chalk.blue.bold('🚀 Unified Business Scraper v2.0'));
  console.log(chalk.gray('═══════════════════════════════════════════════════════════'));
  console.log(chalk.cyan('  Multi-Source Lead Generation & Business Intelligence'));
  console.log(chalk.gray('═══════════════════════════════════════════════════════════\n'));
}

async function getNicheInput() {
  const { niche } = await inquirer.prompt([{
    type: 'input',
    name: 'niche',
    message: chalk.yellow('🎯 Enter your target business niche:'),
    validate: input => {
      if (!input || input.trim().length === 0) {
        return 'Please enter a valid business niche';
      }
      if (input.trim().length < 3) {
        return 'Please enter at least 3 characters';
      }
      return true;
    },
    transformer: input => chalk.cyan(input)
  }]);

  return niche.trim();
}

async function selectDataSource() {
  const { source } = await inquirer.prompt([{
    type: 'list',
    name: 'source',
    message: chalk.yellow('📊 Select data source:'),
    choices: [
      { 
        name: chalk.green('🔍 Google Search') + chalk.gray(' (Business Websites & Contact Pages)'), 
        value: 'google_search' 
      },
      { 
        name: chalk.blue('💼 LinkedIn') + chalk.gray(' (Professional Profiles & Company Pages)'), 
        value: 'linkedin' 
      },
      { 
        name: chalk.red('🗺️  Google Maps') + chalk.gray(' (Business Directory & Local Listings)'), 
        value: 'google_maps' 
      },
      new inquirer.Separator(),
      { 
        name: chalk.magenta('🌐 All Sources') + chalk.gray(' (Combined Multi-Source Scraping)'), 
        value: 'all_sources' 
      }
    ]
  }]);
  
  return source;
}

async function selectDataType(source) {
  let choices;
  
  switch (source) {
    case 'linkedin':
      choices = [
        { name: 'Professional profiles only', value: 'profiles' },
        { name: 'Contact information (emails/phones)', value: 'contacts' },
        { name: 'Complete profile data', value: 'complete' }
      ];
      break;
      
    case 'google_maps':
      choices = [
        { name: 'Business profiles with addresses', value: 'profiles' },
        { name: 'Contact information (emails/phones)', value: 'contacts' },
        { name: 'Complete business data', value: 'complete' }
      ];
      break;
      
    case 'all_sources':
      choices = [
        { name: 'Contact information from all sources', value: 'contacts' },
        { name: 'Complete data from all sources', value: 'complete' }
      ];
      break;
      
    default: // google_search
      choices = [
        { name: 'Emails only', value: 'emails' },
        { name: 'Phone numbers only', value: 'phones' },
        { name: 'Both emails and phones', value: 'contacts' }
      ];
  }
  
  const { dataType } = await inquirer.prompt([{
    type: 'list',
    name: 'dataType',
    message: chalk.yellow('📋 What information do you want to extract?'),
    choices: choices
  }]);
  
  return dataType;
}

async function getOutputFormat(source) {
  // Each scraper has its own fixed format - match individual scraper behavior
  let choices, defaultFormat;
  
  switch (source) {
    case 'google_search':
      // Google Search scraper only saves to TXT format
      choices = [
        { name: 'Text (.txt) - Google Search format', value: 'txt' }
      ];
      defaultFormat = 'txt';
      break;
      
    case 'linkedin':
      // LinkedIn scraper only saves to XLSX format
      choices = [
        { name: 'Excel (.xlsx) - LinkedIn format', value: 'xlsx' }
      ];
      defaultFormat = 'xlsx';
      break;
      
    case 'google_maps':
      // Google Maps scraper saves to JSON format (individual scraper behavior)
      choices = [
        { name: 'JSON (.json) - Google Maps format', value: 'json' },
        { name: 'CSV (.csv) - Alternative format', value: 'csv' }
      ];
      defaultFormat = 'json';
      break;
      
    case 'all_sources':
      // For combined sources, allow unified processing formats
      choices = [
        { name: 'Excel (.xlsx) - Recommended for combined data', value: 'xlsx' },
        { name: 'CSV (.csv) - Universal', value: 'csv' },
        { name: 'JSON (.json) - Developer', value: 'json' }
      ];
      defaultFormat = 'xlsx';
      break;
      
    default:
      // Fallback to unified options
      choices = [
        { name: 'Excel (.xlsx) - Recommended', value: 'xlsx' },
        { name: 'CSV (.csv) - Universal', value: 'csv' },
        { name: 'JSON (.json) - Developer', value: 'json' }
      ];
      defaultFormat = 'xlsx';
  }
  
  // If only one choice, auto-select it
  if (choices.length === 1) {
    console.log(chalk.cyan(`💾 Output format: ${choices[0].name}`));
    return choices[0].value;
  }
  
  const { format } = await inquirer.prompt([{
    type: 'list',
    name: 'format',
    message: chalk.yellow('💾 Select output format:'),
    choices: choices,
    default: defaultFormat
  }]);
  
  return format;
}

async function confirmExecution(niche, source, dataType, format) {
  console.log(chalk.cyan('\n📋 Scraping Configuration:'));
  console.log(chalk.gray('───────────────────────────────────────'));
  console.log(chalk.white(`  🎯 Target Niche: ${chalk.yellow(niche)}`));
  console.log(chalk.white(`  📊 Data Source: ${chalk.yellow(getSourceDisplayName(source))}`));
  console.log(chalk.white(`  📋 Data Type: ${chalk.yellow(dataType)}`));
  console.log(chalk.white(`  💾 Output Format: ${chalk.yellow(format.toUpperCase())}`));
  console.log(chalk.gray('───────────────────────────────────────\n'));
  
  const { confirmed } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmed',
    message: chalk.yellow('🚀 Start scraping with these settings?'),
    default: true
  }]);
  
  return confirmed;
}

function getSourceDisplayName(source) {
  const names = {
    google_search: 'Google Search',
    linkedin: 'LinkedIn',
    google_maps: 'Google Maps',
    all_sources: 'All Sources'
  };
  return names[source] || source;
}

async function main() {
  try {
    // Welcome screen
    await displayWelcome();
    
    // Step 1: Get business niche
    const niche = await getNicheInput();
    
    // Step 2: Select data source
    const source = await selectDataSource();
    
    // Step 3: Select data type based on source
    const dataType = await selectDataType(source);
    
    // Step 4: Select output format
    const format = await getOutputFormat(source);
    
    // Step 5: Confirm execution
    const confirmed = await confirmExecution(niche, source, dataType, format);
    
    if (!confirmed) {
      console.log(chalk.yellow('\n⚠️  Scraping cancelled by user.'));
      process.exit(0);
    }
    
    // Step 6: Initialize and run scraper
    console.log(chalk.blue.bold('\n🚀 Initializing scraper...\n'));
    
    const sourceManager = new SourceManager();
    const results = await sourceManager.run(niche, source, dataType, format);
    
    // Success message
    console.log(chalk.green.bold('\n✅ Scraping completed successfully!'));
    console.log(chalk.gray(`📊 Total results: ${results.length}`));
    console.log(chalk.gray(`💾 Results saved in ${format.toUpperCase()} format\n`));
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Scraping failed:'), error.message);
    
    if (error.code === 'ENOENT') {
      console.error(chalk.red('💡 Make sure all required files are in place'));
    } else if (error.message.includes('quota')) {
      console.error(chalk.red('💡 API quota exceeded - try again later or add more API keys'));
    } else if (error.message.includes('network')) {
      console.error(chalk.red('💡 Network error - check your internet connection'));
    }
    
    console.log(chalk.gray('\n📝 Check the error details above for troubleshooting'));
    process.exit(1);
  }
}

// Note: Individual scrapers handle their own SIGINT/SIGTERM interruption
// This allows them to save partial results before exiting gracefully

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n❌ Unhandled rejection:'), reason);
  process.exit(1);
});

// Run the unified scraper
if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  main();
}

export default main;
