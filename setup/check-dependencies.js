#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

/**
 * Setup script to check dependencies and project structure
 */

async function checkFileExists(filePath, description) {
  try {
    await fs.access(filePath);
    console.log(chalk.green(`✅ ${description}: ${filePath}`));
    return true;
  } catch {
    console.log(chalk.red(`❌ ${description}: ${filePath} (missing)`));
    return false;
  }
}

async function checkProjectStructure() {
  console.log(chalk.blue.bold('🔍 Checking project structure...\n'));
  
  const checks = [];
  
  // Check core files
  checks.push(await checkFileExists('unified-scraper.js', 'Main entry point'));
  checks.push(await checkFileExists('core/source-manager.js', 'Source manager'));
  checks.push(await checkFileExists('core/scraper-interface.js', 'Scraper interface'));
  checks.push(await checkFileExists('core/result-processor.js', 'Result processor'));
  
  // Check wrappers
  checks.push(await checkFileExists('wrappers/google-search-wrapper.js', 'Google Search wrapper'));
  checks.push(await checkFileExists('wrappers/linkedin-wrapper.js', 'LinkedIn wrapper'));
  checks.push(await checkFileExists('wrappers/google-maps-wrapper.js', 'Google Maps wrapper'));
  checks.push(await checkFileExists('wrappers/all-sources-wrapper.js', 'All Sources wrapper'));
  
  // Check existing projects
  checks.push(await checkFileExists('google search + linkdin scraper/lead-scraper/index.js', 'Google Search + LinkedIn scraper'));
  checks.push(await checkFileExists('google search + linkdin scraper/lead-scraper/config.js', 'Google Search + LinkedIn config'));
  checks.push(await checkFileExists('maps_scraper/run.js', 'Google Maps scraper'));
  checks.push(await checkFileExists('maps_scraper/config.js', 'Google Maps config'));
  
  return checks.every(check => check);
}

async function checkAPIKeys() {
  console.log(chalk.blue.bold('\n🔑 Checking API key configuration...\n'));
  
  const configs = [];
  
  // Check Google Search + LinkedIn config
  try {
    const googleLinkedInConfigPath = 'google search + linkdin scraper/lead-scraper/env.config';
    const configContent = await fs.readFile(googleLinkedInConfigPath, 'utf8');
    
    const hasGoogleKey = configContent.includes('GOOGLE_API_KEY');
    const hasGeminiKey = configContent.includes('GEMINI_API_KEY');
    
    if (hasGoogleKey) {
      console.log(chalk.green('✅ Google Custom Search API key found'));
    } else {
      console.log(chalk.yellow('⚠️  Google Custom Search API key not found in env.config'));
    }
    
    if (hasGeminiKey) {
      console.log(chalk.green('✅ Gemini AI API key found'));
    } else {
      console.log(chalk.yellow('⚠️  Gemini AI API key not found in env.config'));
    }
    
    configs.push(hasGoogleKey && hasGeminiKey);
    
  } catch (error) {
    console.log(chalk.red('❌ Could not read Google Search + LinkedIn config'));
    configs.push(false);
  }
  
  // Check Google Maps config
  try {
    const mapsConfigPath = 'maps_scraper/config.js';
    const configContent = await fs.readFile(mapsConfigPath, 'utf8');
    
    const hasGeminiKey = configContent.includes('apiKey') && !configContent.includes('YOUR_API_KEY');
    
    if (hasGeminiKey) {
      console.log(chalk.green('✅ Google Maps Gemini AI key configured'));
    } else {
      console.log(chalk.yellow('⚠️  Google Maps Gemini AI key not configured'));
    }
    
    configs.push(hasGeminiKey);
    
  } catch (error) {
    console.log(chalk.red('❌ Could not read Google Maps config'));
    configs.push(false);
  }
  
  return configs.some(config => config); // At least one config should be valid
}

async function checkDependencies() {
  console.log(chalk.blue.bold('\n📦 Checking dependencies...\n'));
  
  try {
    const packageJsonContent = await fs.readFile('package.json', 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    
    const requiredDeps = [
      'axios', 'chalk', 'cheerio', 'commander', 'csv-writer', 
      'inquirer', 'ora', 'xlsx', '@google/generative-ai'
    ];
    
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missingDeps.length === 0) {
      console.log(chalk.green('✅ All required dependencies are listed'));
      return true;
    } else {
      console.log(chalk.red(`❌ Missing dependencies: ${missingDeps.join(', ')}`));
      return false;
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Could not read package.json'));
    return false;
  }
}

async function createDirectories() {
  console.log(chalk.blue.bold('\n📁 Creating required directories...\n'));
  
  const directories = ['results', 'test', 'setup'];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(chalk.green(`✅ Directory created/verified: ${dir}/`));
    } catch (error) {
      console.log(chalk.red(`❌ Could not create directory: ${dir}/`));
    }
  }
}

async function generateSetupSummary(structureOk, apiKeysOk, depsOk) {
  console.log(chalk.blue.bold('\n📋 Setup Summary:'));
  console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  
  console.log(`${structureOk ? '✅' : '❌'} Project Structure`);
  console.log(`${apiKeysOk ? '✅' : '⚠️ '} API Configuration`);
  console.log(`${depsOk ? '✅' : '❌'} Dependencies`);
  
  console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  
  if (structureOk && depsOk) {
    console.log(chalk.green.bold('\n🎉 Setup complete! The unified scraper is ready to use.'));
    console.log(chalk.white('\nQuick start:'));
    console.log(chalk.cyan('  npm start          # Interactive mode'));
    console.log(chalk.cyan('  npm run test       # Test all scrapers'));
    console.log(chalk.cyan('  npm run google-search  # Google Search only'));
    console.log(chalk.cyan('  npm run linkedin   # LinkedIn only'));
    console.log(chalk.cyan('  npm run google-maps    # Google Maps only'));
    
    if (!apiKeysOk) {
      console.log(chalk.yellow('\n⚠️  API keys need configuration for full functionality:'));
      console.log(chalk.gray('  - Add Google Custom Search API keys to google search + linkdin scraper/lead-scraper/env.config'));
      console.log(chalk.gray('  - Add Gemini AI API key to maps_scraper/config.js'));
    }
  } else {
    console.log(chalk.red.bold('\n⚠️  Setup incomplete. Please fix the issues above.'));
    
    if (!structureOk) {
      console.log(chalk.gray('\n📁 Project structure issues:'));
      console.log(chalk.gray('  - Ensure all core files and wrappers are in place'));
      console.log(chalk.gray('  - Verify both existing projects are available'));
    }
    
    if (!depsOk) {
      console.log(chalk.gray('\n📦 Dependency issues:'));
      console.log(chalk.gray('  - Run "npm install" to install missing packages'));
    }
  }
}

async function main() {
  console.log(chalk.blue.bold('🚀 Unified Business Scraper Setup Check\n'));
  
  const structureOk = await checkProjectStructure();
  const apiKeysOk = await checkAPIKeys();
  const depsOk = await checkDependencies();
  
  await createDirectories();
  await generateSetupSummary(structureOk, apiKeysOk, depsOk);
  
  process.exit((structureOk && depsOk) ? 0 : 1);
}

// Run setup check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('❌ Setup check failed:'), error.message);
    process.exit(1);
  });
}
