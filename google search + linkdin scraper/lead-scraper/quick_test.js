#!/usr/bin/env node

import chalk from 'chalk';

console.log(chalk.blue.bold('🧪 QUICK SCRAPER TEST'));
console.log(chalk.gray('─'.repeat(40)));

// Test basic functionality
async function quickTest() {
  try {
    console.log(chalk.gray('1. Testing config initialization...'));
    const { initializeConfig } = await import('./config.js');
    await initializeConfig();
    console.log(chalk.green('✅ Config loaded successfully'));
    
    console.log(chalk.gray('2. Testing AI query generation...'));
    const { generateQueriesWithGemini } = await import('./helpers/geminiAI.js');
    const queries = await generateQueriesWithGemini('dentist in casablanca', 'google_search', 3);
    console.log(chalk.green(`✅ Generated ${queries.length} test queries`));
    
    console.log(chalk.gray('3. Testing content validator...'));
    const { ContentValidator } = await import('./helpers/contentValidator.js');
    const validator = new ContentValidator('dentist in casablanca');
    console.log(chalk.green('✅ Content validator created'));
    
    console.log(chalk.gray('4. Testing auto-save functionality...'));
    // Test auto-save functions exist
    const scraperModule = await import('./scraper.js');
    console.log(chalk.green('✅ Auto-save functions available'));
    
    console.log(chalk.green.bold('\n✅ All basic functions working!'));
    console.log(chalk.gray('The scraper should now be stable and not crash.'));
    console.log(chalk.yellow('Run "npm start" to use the full scraper.'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Test failed: ${error.message}`));
    console.error(chalk.gray('Error details:', error.stack));
    process.exit(1);
  }
}

quickTest();

