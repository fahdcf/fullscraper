#!/usr/bin/env node

import chalk from 'chalk';
import { SourceManager } from '../core/source-manager.js';

/**
 * Test script to verify all scrapers work with unified interface
 */

async function testScraper(source, niche, dataType = 'contacts') {
  console.log(chalk.blue(`\n🧪 Testing ${source} scraper...`));
  console.log(chalk.gray(`   Niche: ${niche}`));
  console.log(chalk.gray(`   Data Type: ${dataType}`));
  
  try {
    const sourceManager = new SourceManager();
    
    // Test with minimal options
    const results = await sourceManager.run(niche, source, dataType, 'json');
    
    console.log(chalk.green(`✅ ${source} test passed`));
    console.log(chalk.gray(`   Results: ${results.length} items`));
    
    return true;
    
  } catch (error) {
    console.log(chalk.red(`❌ ${source} test failed: ${error.message}`));
    return false;
  }
}

async function runAllTests() {
  console.log(chalk.blue.bold('🚀 Running Unified Scraper Tests\n'));
  
  const testResults = {};
  
  // Test Google Search
  testResults.google_search = await testScraper(
    'google_search', 
    'web developer contact test', 
    'contacts'
  );
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test LinkedIn
  testResults.linkedin = await testScraper(
    'linkedin', 
    'software engineer test', 
    'profiles'
  );
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test Google Maps
  testResults.google_maps = await testScraper(
    'google_maps', 
    'dentist casablanca', 
    'complete'
  );
  
  // Summary
  console.log(chalk.blue.bold('\n📊 Test Results Summary:'));
  console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  
  let passedCount = 0;
  Object.entries(testResults).forEach(([source, passed]) => {
    const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
    console.log(`${status} ${source.replace('_', ' ').toUpperCase()}`);
    if (passed) passedCount++;
  });
  
  console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.white(`Total: ${passedCount}/${Object.keys(testResults).length} tests passed`));
  
  if (passedCount === Object.keys(testResults).length) {
    console.log(chalk.green.bold('\n🎉 All tests passed! Unified scraper is ready to use.'));
    console.log(chalk.gray('Run "npm start" to begin scraping.'));
  } else {
    console.log(chalk.red.bold('\n⚠️  Some tests failed. Check the error messages above.'));
    console.log(chalk.gray('Common issues:'));
    console.log(chalk.gray('  - Missing API keys in env.config'));
    console.log(chalk.gray('  - Incorrect project folder structure'));
    console.log(chalk.gray('  - Network connectivity issues'));
  }
  
  process.exit(passedCount === Object.keys(testResults).length ? 0 : 1);
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error(chalk.red('❌ Test runner failed:'), error.message);
    process.exit(1);
  });
}
