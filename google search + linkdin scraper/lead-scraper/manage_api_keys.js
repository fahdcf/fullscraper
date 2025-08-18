#!/usr/bin/env node

import fs from 'fs/promises';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * API Key Management Tool
 * Easily add, list, and manage Google API keys
 */

async function loadEnvConfig() {
  try {
    const envContent = await fs.readFile('env.config', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        envVars[key.trim()] = value.trim();
      }
    });
    
    return envVars;
  } catch (error) {
    console.warn('⚠️  env.config file not found');
    return {};
  }
}

async function saveEnvConfig(envVars) {
  let content = `# Google Custom Search API Keys (Primary + Fallbacks)
# If daily quota runs out, it will automatically use the next key
`;
  
  // Add numbered keys
  let keyIndex = 1;
  while (envVars[`GOOGLE_API_KEY_${keyIndex}`]) {
    content += `GOOGLE_API_KEY_${keyIndex}=${envVars[`GOOGLE_API_KEY_${keyIndex}`]}\n`;
    keyIndex++;
  }
  
  // Add alternative keys
  const alternativeKeys = ['A', 'B', 'C', 'PRIMARY', 'SECONDARY', 'BACKUP', 'MAIN', 'ALT1', 'ALT2'];
  for (const alt of alternativeKeys) {
    if (envVars[`GOOGLE_API_KEY_${alt}`]) {
      content += `GOOGLE_API_KEY_${alt}=${envVars[`GOOGLE_API_KEY_${alt}`]}\n`;
    }
  }
  
  content += `
# Google Custom Search Engine ID
GOOGLE_SEARCH_ENGINE_ID=4385aef0f424b4b5b

# Gemini AI API Key (for intelligent query generation)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

# Request Configuration
REQUEST_DELAY=2000
REQUEST_TIMEOUT=20000
`;
  
  await fs.writeFile('env.config', content);
}

async function listApiKeys() {
  const envVars = await loadEnvConfig();
  const keys = [];
  
  // Find all API keys
  for (const [key, value] of Object.entries(envVars)) {
    if (key.startsWith('GOOGLE_API_KEY_') && value && value.length > 20) {
      keys.push({ name: key, value: value.substring(0, 20) + '...' });
    }
  }
  
  console.log('\n📋 Current API Keys:');
  console.log('─'.repeat(50));
  
  if (keys.length === 0) {
    console.log('❌ No API keys found');
  } else {
    keys.forEach((key, index) => {
      console.log(`${index + 1}. ${key.name}: ${key.value}`);
    });
  }
  
  console.log(`\n✅ Total: ${keys.length} API keys loaded`);
}

async function addApiKey() {
  const envVars = await loadEnvConfig();
  
  console.log('\n🔑 Add New API Key');
  console.log('─'.repeat(30));
  
  // Find next available slot
  let nextSlot = 1;
  while (envVars[`GOOGLE_API_KEY_${nextSlot}`]) {
    nextSlot++;
  }
  
  const apiKey = await new Promise(resolve => {
    rl.question(`Enter your Google API key (slot ${nextSlot}): `, resolve);
  });
  
  if (apiKey && apiKey.length > 20) {
    envVars[`GOOGLE_API_KEY_${nextSlot}`] = apiKey;
    await saveEnvConfig(envVars);
    console.log(`✅ API key added successfully to slot ${nextSlot}`);
  } else {
    console.log('❌ Invalid API key (too short)');
  }
}

async function replaceApiKey() {
  const envVars = await loadEnvConfig();
  
  console.log('\n🔄 Replace API Key');
  console.log('─'.repeat(30));
  
  // List current keys
  const keys = [];
  for (const [key, value] of Object.entries(envVars)) {
    if (key.startsWith('GOOGLE_API_KEY_') && value && value.length > 20) {
      keys.push({ name: key, value: value.substring(0, 20) + '...' });
    }
  }
  
  if (keys.length === 0) {
    console.log('❌ No API keys to replace');
    return;
  }
  
  console.log('Current keys:');
  keys.forEach((key, index) => {
    console.log(`${index + 1}. ${key.name}: ${key.value}`);
  });
  
  const slotChoice = await new Promise(resolve => {
    rl.question('\nEnter the slot number to replace (or key name): ', resolve);
  });
  
  let targetKey;
  if (/^\d+$/.test(slotChoice)) {
    const index = parseInt(slotChoice) - 1;
    if (index >= 0 && index < keys.length) {
      targetKey = keys[index].name;
    }
  } else {
    targetKey = slotChoice;
  }
  
  if (!targetKey || !envVars[targetKey]) {
    console.log('❌ Invalid selection');
    return;
  }
  
  const newApiKey = await new Promise(resolve => {
    rl.question(`Enter new API key for ${targetKey}: `, resolve);
  });
  
  if (newApiKey && newApiKey.length > 20) {
    envVars[targetKey] = newApiKey;
    await saveEnvConfig(envVars);
    console.log(`✅ API key replaced successfully`);
  } else {
    console.log('❌ Invalid API key (too short)');
  }
}

async function removeApiKey() {
  const envVars = await loadEnvConfig();
  
  console.log('\n🗑️  Remove API Key');
  console.log('─'.repeat(30));
  
  // List current keys
  const keys = [];
  for (const [key, value] of Object.entries(envVars)) {
    if (key.startsWith('GOOGLE_API_KEY_') && value && value.length > 20) {
      keys.push({ name: key, value: value.substring(0, 20) + '...' });
    }
  }
  
  if (keys.length === 0) {
    console.log('❌ No API keys to remove');
    return;
  }
  
  console.log('Current keys:');
  keys.forEach((key, index) => {
    console.log(`${index + 1}. ${key.name}: ${key.value}`);
  });
  
  const slotChoice = await new Promise(resolve => {
    rl.question('\nEnter the slot number to remove: ', resolve);
  });
  
  const index = parseInt(slotChoice) - 1;
  if (index >= 0 && index < keys.length) {
    const targetKey = keys[index].name;
    delete envVars[targetKey];
    await saveEnvConfig(envVars);
    console.log(`✅ API key removed successfully`);
  } else {
    console.log('❌ Invalid selection');
  }
}

async function showMenu() {
  console.log('\n🔑 API Key Management Tool');
  console.log('─'.repeat(40));
  console.log('1. List all API keys');
  console.log('2. Add new API key');
  console.log('3. Replace existing API key');
  console.log('4. Remove API key');
  console.log('5. Exit');
  
  const choice = await new Promise(resolve => {
    rl.question('\nSelect an option (1-5): ', resolve);
  });
  
  switch (choice) {
    case '1':
      await listApiKeys();
      break;
    case '2':
      await addApiKey();
      break;
    case '3':
      await replaceApiKey();
      break;
    case '4':
      await removeApiKey();
      break;
    case '5':
      console.log('👋 Goodbye!');
      rl.close();
      return;
    default:
      console.log('❌ Invalid option');
  }
  
  // Show menu again
  await showMenu();
}

// Main execution
console.log('🚀 API Key Management Tool');
console.log('This tool helps you manage Google API keys easily');

await showMenu(); 