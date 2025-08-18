#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CODES_FILE = path.join(__dirname, 'codes.json');

/**
 * Admin CLI for managing WhatsApp scraper access codes
 * Usage:
 *   node manage_codes.js add <code> <google_key_1> <google_key_2> <gemini_key>
 *   node manage_codes.js list
 *   node manage_codes.js remove <code>
 *   node manage_codes.js info <code>
 */

// Helper functions
function loadCodes() {
  if (!fs.existsSync(CODES_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
  } catch (error) {
    console.error('❌ Error reading codes.json:', error.message);
    return {};
  }
}

function saveCodes(codes) {
  try {
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Error saving codes.json:', error.message);
    return false;
  }
}

function generateRandomCode() {
  return crypto.randomBytes(4).toString('hex');
}

function validateApiKey(key, type) {
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    throw new Error(`${type} API key is required and cannot be empty`);
  }
  if (key.length < 10) {
    throw new Error(`${type} API key seems too short (minimum 10 characters)`);
  }
  return key.trim();
}

function maskApiKey(key) {
  if (!key || key.length < 8) return '***';
  return key.substring(0, 4) + '***' + key.substring(key.length - 4);
}

// Command handlers
function addCode(args) {
  const [code, googleKey1, googleKey2, geminiKey] = args;
  
  if (!code) {
    console.error('❌ Code is required');
    console.log('Usage: node manage_codes.js add <code> <google_key_1> <google_key_2> <gemini_key>');
    process.exit(1);
  }

  if (!googleKey1 || !googleKey2 || !geminiKey) {
    console.error('❌ All API keys are required: Google Key 1, Google Key 2, Gemini Key');
    console.log('Usage: node manage_codes.js add <code> <google_key_1> <google_key_2> <gemini_key>');
    process.exit(1);
  }

  try {
    // Validate API keys
    const validatedGoogleKey1 = validateApiKey(googleKey1, 'Google Search Key 1');
    const validatedGoogleKey2 = validateApiKey(googleKey2, 'Google Search Key 2');
    const validatedGeminiKey = validateApiKey(geminiKey, 'Gemini AI Key');

    const codes = loadCodes();
    
    if (codes[code]) {
      console.log(`⚠️  Code '${code}' already exists. Overwriting...`);
    }

    codes[code] = {
      apiKeys: {
        googleSearchKeys: [validatedGoogleKey1, validatedGoogleKey2],
        geminiKey: validatedGeminiKey
      },
      createdAt: new Date().toISOString(),
      expiresAt: null,
      meta: {
        issuedBy: 'admin',
        lastUsed: null,
        useCount: 0
      }
    };

    if (saveCodes(codes)) {
      console.log('✅ Code added successfully!');
      console.log(`📋 Code: ${code}`);
      console.log(`🔑 Google Search Keys: ${maskApiKey(validatedGoogleKey1)}, ${maskApiKey(validatedGoogleKey2)}`);
      console.log(`🤖 Gemini AI Key: ${maskApiKey(validatedGeminiKey)}`);
      console.log(`📅 Created: ${new Date().toLocaleString()}`);
    }
  } catch (error) {
    console.error('❌ Error adding code:', error.message);
    process.exit(1);
  }
}

function listCodes() {
  const codes = loadCodes();
  const codeList = Object.keys(codes);
  
  if (codeList.length === 0) {
    console.log('📋 No codes found. Use "add" command to create codes.');
    return;
  }

  console.log(`📋 Total Codes: ${codeList.length}\n`);
  
  codeList.forEach((code, index) => {
    const data = codes[code];
    console.log(`${index + 1}. Code: ${code}`);
    console.log(`   🔑 Google Keys: ${data.apiKeys.googleSearchKeys.map(maskApiKey).join(', ')}`);
    console.log(`   🤖 Gemini Key: ${maskApiKey(data.apiKeys.geminiKey)}`);
    console.log(`   📅 Created: ${new Date(data.createdAt).toLocaleString()}`);
    console.log(`   📊 Usage: ${data.meta.useCount} times`);
    if (data.meta.lastUsed) {
      console.log(`   ⏰ Last Used: ${new Date(data.meta.lastUsed).toLocaleString()}`);
    }
    if (data.expiresAt) {
      console.log(`   ⏳ Expires: ${new Date(data.expiresAt).toLocaleString()}`);
    }
    console.log('');
  });
}

function removeCode(args) {
  const [code] = args;
  
  if (!code) {
    console.error('❌ Code is required');
    console.log('Usage: node manage_codes.js remove <code>');
    process.exit(1);
  }

  const codes = loadCodes();
  
  if (!codes[code]) {
    console.error(`❌ Code '${code}' not found`);
    process.exit(1);
  }

  delete codes[code];
  
  if (saveCodes(codes)) {
    console.log(`✅ Code '${code}' removed successfully!`);
  }
}

function showCodeInfo(args) {
  const [code] = args;
  
  if (!code) {
    console.error('❌ Code is required');
    console.log('Usage: node manage_codes.js info <code>');
    process.exit(1);
  }

  const codes = loadCodes();
  
  if (!codes[code]) {
    console.error(`❌ Code '${code}' not found`);
    process.exit(1);
  }

  const data = codes[code];
  console.log(`📋 Code Information: ${code}`);
  console.log('─'.repeat(50));
  console.log(`🔑 Google Search Keys:`);
  data.apiKeys.googleSearchKeys.forEach((key, i) => {
    console.log(`   Key ${i + 1}: ${maskApiKey(key)}`);
  });
  console.log(`🤖 Gemini AI Key: ${maskApiKey(data.apiKeys.geminiKey)}`);
  console.log(`📅 Created: ${new Date(data.createdAt).toLocaleString()}`);
  console.log(`📊 Usage Count: ${data.meta.useCount}`);
  console.log(`👤 Issued By: ${data.meta.issuedBy}`);
  
  if (data.meta.lastUsed) {
    console.log(`⏰ Last Used: ${new Date(data.meta.lastUsed).toLocaleString()}`);
  } else {
    console.log(`⏰ Last Used: Never`);
  }
  
  if (data.expiresAt) {
    const isExpired = new Date(data.expiresAt) < new Date();
    console.log(`⏳ Expires: ${new Date(data.expiresAt).toLocaleString()} ${isExpired ? '(EXPIRED)' : ''}`);
  } else {
    console.log(`⏳ Expires: Never`);
  }
}

function generateCode(args) {
  const [googleKey1, googleKey2, geminiKey] = args;
  
  if (!googleKey1 || !googleKey2 || !geminiKey) {
    console.error('❌ All API keys are required: Google Key 1, Google Key 2, Gemini Key');
    console.log('Usage: node manage_codes.js generate <google_key_1> <google_key_2> <gemini_key>');
    process.exit(1);
  }

  const randomCode = generateRandomCode();
  console.log(`🎲 Generated random code: ${randomCode}`);
  console.log('Adding with generated code...\n');
  
  addCode([randomCode, googleKey1, googleKey2, geminiKey]);
}

function showHelp() {
  console.log('🛠️  WhatsApp Scraper - Admin Code Management');
  console.log('═'.repeat(50));
  console.log('');
  console.log('📋 Available Commands:');
  console.log('');
  console.log('  add <code> <google_key_1> <google_key_2> <gemini_key>');
  console.log('    Add a new access code with API keys');
  console.log('');
  console.log('  generate <google_key_1> <google_key_2> <gemini_key>');
  console.log('    Generate a random code and add it with API keys');
  console.log('');
  console.log('  list');
  console.log('    List all existing codes (with masked keys)');
  console.log('');
  console.log('  info <code>');
  console.log('    Show detailed information about a specific code');
  console.log('');
  console.log('  remove <code>');
  console.log('    Remove an existing code');
  console.log('');
  console.log('  help');
  console.log('    Show this help message');
  console.log('');
  console.log('📝 Examples:');
  console.log('  node manage_codes.js add abc123 YOUR_GOOGLE_KEY_1 YOUR_GOOGLE_KEY_2 YOUR_GEMINI_KEY');
  console.log('  node manage_codes.js generate YOUR_GOOGLE_KEY_1 YOUR_GOOGLE_KEY_2 YOUR_GEMINI_KEY');
  console.log('  node manage_codes.js list');
  console.log('  node manage_codes.js info abc123');
  console.log('  node manage_codes.js remove abc123');
}

// Main CLI handler
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command) {
    showHelp();
    return;
  }

  switch (command.toLowerCase()) {
    case 'add':
      addCode(commandArgs);
      break;
    case 'generate':
      generateCode(commandArgs);
      break;
    case 'list':
      listCodes();
      break;
    case 'remove':
    case 'delete':
      removeCode(commandArgs);
      break;
    case 'info':
    case 'show':
      showCodeInfo(commandArgs);
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "node manage_codes.js help" for available commands');
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  main();
}

export {
  loadCodes,
  saveCodes,
  generateRandomCode,
  validateApiKey,
  maskApiKey
};
