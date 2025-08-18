import fs from 'fs';
import path from 'path';
import qrcode from 'qrcode-terminal';
import { fileURLToPath } from 'url';
import { startUnifiedScraper } from './lib/startUnifiedScraper.js';
import { createRequire } from 'module';
import chalk from 'chalk';

const require = createRequire(import.meta.url);
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('baileys');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * WhatsApp Bot for Unified Business Scraper v2.0
 * 
 * Commands:
 * - CODE: <code> → Validate and assign API keys
 * - SOURCE: <google|linkedin|maps|all> → Set preferred source
 * - FORMAT: <xlsx|csv|json> → Set output format  
 * - LIMIT: <n> → Set max results
 * - STATUS → Show current job status
 * - STOP → Abort current job
 * - RESET → Clear session preferences
 * - HELP → Show available commands
 * - Plain text → Treat as niche query
 */

// File paths
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');
const CODES_FILE = path.join(__dirname, 'codes.json');
const AUTH_DIR = path.join(__dirname, 'auth_info');

// Active jobs tracking
const activeJobs = new Map(); // jid -> { abort: AbortController, status: string }

// Helper functions
function loadJson(filePath, defaultValue = {}) {
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    return defaultValue;
  }
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${filePath}:`, error.message);
    return false;
  }
}

async function sendChunkedMessage(sock, jid, text, maxChars = 4000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxChars) {
    chunks.push(text.slice(i, i + maxChars));
  }
  
  for (const chunk of chunks) {
    try {
      await sock.sendMessage(jid, { text: chunk });
      // Small delay between chunks to avoid rate limiting
      if (chunks.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Error sending chunk:', error.message);
    }
  }
}

async function sendFile(sock, jid, filePath, caption = '') {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    const fileName = path.basename(filePath);
    const fileData = fs.readFileSync(filePath);
    const fileExt = path.extname(fileName).toLowerCase();
    
    let mimetype;
    switch (fileExt) {
      case '.xlsx':
        mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.csv':
        mimetype = 'text/csv';
        break;
      case '.json':
        mimetype = 'application/json';
        break;
      case '.txt':
        mimetype = 'text/plain';
        break;
      default:
        mimetype = 'application/octet-stream';
    }

    await sock.sendMessage(jid, {
      document: fileData,
      fileName: fileName,
      mimetype: mimetype,
      caption: caption
    });

            console.log(chalk.green(`📎 File sent: ${fileName}`));
    return true;
  } catch (error) {
    console.error('❌ Error sending file:', error.message);
    await sock.sendMessage(jid, { 
      text: `❌ Could not send file: ${error.message}` 
    });
    return false;
  }
}

function formatResultSummary(results, meta) {
  let summary = `✅ **Scraping Complete!**\n\n`;
  summary += `📊 **Results Summary:**\n`;
  summary += `• Total Results: ${meta.totalResults}\n`;
  summary += `• Source: ${meta.source}\n`;
  summary += `• Format: ${meta.format}\n`;
  summary += `• Niche: "${meta.niche}"\n`;
  summary += `• Processed: ${new Date(meta.processedAt).toLocaleString()}\n\n`;

  if (results && results.length > 0) {
    // Count different types of data
    let emails = 0, phones = 0, websites = 0;
    
    results.forEach(result => {
      if (result.emails && Array.isArray(result.emails)) {
        emails += result.emails.length;
      } else if (result.email && result.email !== 'Not found') {
        emails++;
      }
      
      if (result.phones && Array.isArray(result.phones)) {
        phones += result.phones.length;
      } else if (result.phone && result.phone !== 'Not found') {
        phones++;
      }
      
      if (result.website && result.website !== 'Not found') {
        websites++;
      }
    });

    summary += `📈 **Data Breakdown:**\n`;
    summary += `• 📧 Emails: ${emails}\n`;
    summary += `• 📞 Phones: ${phones}\n`;
    summary += `• 🌐 Websites: ${websites}\n\n`;
  }

  summary += `💾 **File Information:**\n`;
  summary += `• Format: ${meta.format}\n`;
  summary += `• Ready for download below ⬇️\n\n`;
  
  if (meta.isPartial) {
    summary += `⚠️ **Note:** This is a partial result due to interruption or error.\n`;
  }

  return summary;
}

function getHelpMessage() {
   return `🤖 **WhatsApp Business Scraper Bot**\n\n` +
          `📋 **Available Commands:**\n\n` +
          `🔐 **CODE: <your_code>**\n` +
          `   Authenticate with your access code\n\n` +
          `🎯 **SOURCE: <source>**\n` +
          `   Set data source: GOOGLE, LINKEDIN, MAPS, ALL\n\n` +
          `📋 **TYPE: <type>**\n` +
          `   Set data type (varies by source)\n\n` +
          `📄 **FORMAT: <format>**\n` +
          `   Set output format (varies by source)\n\n` +
          `📏 **LIMIT: <number>**\n` +
          `   Set max results (1-500)\n` +
          `   Default: 300\n\n` +
          `🚀 **START**\n` +
          `   Begin scraping after configuration\n\n` +
          `📊 **STATUS**\n` +
          `   Check current job status\n\n` +
          `🛑 **STOP**\n` +
          `   Cancel current scraping job\n\n` +
          `♻️ **RESET**\n` +
          `   Reset all preferences\n\n` +
          `❓ **HELP**\n` +
          `   Show this help message\n\n` +
          `🔍 **Search Query**\n` +
          `   Send any text as a search niche\n` +
          `   Example: "dentist casablanca"\n\n` +
          `💡 **Getting Started:**\n` +
          `1. Get your access code from admin\n` +
          `2. Send: CODE: your_code_here\n` +
          `3. Send your search query\n` +
          `4. Follow the configuration prompts\n` +
          `5. Send: START to begin scraping\n` +
          `6. Receive real-time progress updates!`;
 }

async function handleMessage(sock, message) {
  const jid = message.key.remoteJid;
  const text = (message.message?.conversation || 
                message.message?.extendedTextMessage?.text || '').trim();
  
  if (!text || message.key.fromMe) return;

  // Simple colored message log
  const shortText = text.length > 30 ? text.substring(0, 30) + '...' : text;
  console.log(chalk.blue(`📱 ${jid.split('@')[0]}: ${shortText}`));

  // Load session data
  let sessions = loadJson(SESSIONS_FILE, {});
  const codesDb = loadJson(CODES_FILE, {});

  // Initialize session if not exists
  if (!sessions[jid]) {
    sessions[jid] = {
      prefs: {
        source: 'ALL',
        format: 'XLSX',
        limit: 300
      },
      status: 'idle',
      meta: {
        createdAt: new Date().toISOString(),
        totalJobs: 0,
        lastNiche: null
      }
    };
    saveJson(SESSIONS_FILE, sessions);
  }

  const session = sessions[jid];

  try {
    // Command: CODE
    if (/^CODE:?\s+/i.test(text)) {
      const code = text.replace(/^CODE:?\s+/i, '').trim();
      
      if (!codesDb[code]) {
        await sock.sendMessage(jid, { 
          text: '❌ Invalid access code. Please contact admin for a valid code.' 
        });
        return;
      }

      // Update usage statistics
      codesDb[code].meta.lastUsed = new Date().toISOString();
      codesDb[code].meta.useCount = (codesDb[code].meta.useCount || 0) + 1;
      saveJson(CODES_FILE, codesDb);

      // Assign API keys to session
      session.code = code;
      session.apiKeys = codesDb[code].apiKeys;
      sessions[jid] = session;
      saveJson(SESSIONS_FILE, sessions);

      await sock.sendMessage(jid, { 
        text: `✅ **Access granted!** Welcome to the Business Scraper.\n\n` +
              `🎯 Current Settings:\n` +
              `• Source: ${session.prefs.source}\n` +
              `• Format: ${session.prefs.format}\n` +
              `• Limit: ${session.prefs.limit}\n\n` +
              `📝 Send a search query (e.g., "restaurant casablanca") or type HELP for commands.`
      });
      return;
    }

         // Command: SOURCE
     if (/^SOURCE:?\s+/i.test(text)) {
       const source = text.replace(/^SOURCE:?\s+/i, '').trim().toUpperCase();
       const validSources = ['GOOGLE', 'LINKEDIN', 'MAPS', 'ALL'];
       
       if (!validSources.includes(source)) {
         await sock.sendMessage(jid, { 
           text: `⚠️ Invalid source. Choose from: ${validSources.join(', ')}`
         });
         return;
       }

       // Check if we have a pending niche to process
       if (session.pendingNiche) {
         session.prefs.source = source;
         sessions[jid] = session;
         saveJson(SESSIONS_FILE, sessions);
         
         // Now ask for data type based on source
         let dataTypeChoices;
         switch (source) {
           case 'GOOGLE':
             dataTypeChoices = `📋 **Select Data Type for Google Search:**\n\n` +
                              `1️⃣ **EMAILS** - Extract email addresses only\n` +
                              `2️⃣ **PHONES** - Extract phone numbers only\n` +
                              `3️⃣ **CONTACTS** - Both emails and phones\n\n` +
                              `💬 **Reply with:** TYPE: EMAILS\n` +
                              `💬 **Example:** TYPE: CONTACTS\n\n` +
                              `📝 **Note:** You must type the full command with colon`;
             break;
           case 'LINKEDIN':
             dataTypeChoices = `📋 **Select Data Type for LinkedIn:**\n\n` +
                              `1️⃣ **PROFILES** - Professional profiles only\n` +
                              `2️⃣ **CONTACTS** - Contact information (emails/phones)\n` +
                              `3️⃣ **COMPLETE** - Complete profile data\n\n` +
                              `💬 **Reply with:** TYPE: PROFILES\n` +
                              `💬 **Example:** TYPE: CONTACTS\n\n` +
                              `📝 **Note:** You must type the full command with colon`;
             break;
           case 'MAPS':
             dataTypeChoices = `📋 **Select Data Type for Google Maps:**\n\n` +
                              `1️⃣ **PROFILES** - Business profiles with addresses\n` +
                              `2️⃣ **CONTACTS** - Contact information (emails/phones)\n` +
                              `3️⃣ **COMPLETE** - Complete business data\n\n` +
                              `💬 **Reply with:** TYPE: PROFILES\n` +
                              `💬 **Example:** TYPE: CONTACTS\n\n` +
                              `📝 **Note:** You must type the full command with colon`;
             break;
           case 'ALL':
             dataTypeChoices = `📋 **Select Data Type for All Sources:**\n\n` +
                              `1️⃣ **CONTACTS** - Contact information from all sources\n` +
                              `2️⃣ **COMPLETE** - Complete data from all sources\n\n` +
                              `💬 **Reply with:** TYPE: CONTACTS\n` +
                              `💬 **Example:** TYPE: COMPLETE\n\n` +
                              `📝 **Note:** You must type the full command with colon`;
             break;
         }
         
         await sock.sendMessage(jid, { text: dataTypeChoices });
         return;
       } else {
         // Just updating preferences
         session.prefs.source = source;
         sessions[jid] = session;
         saveJson(SESSIONS_FILE, sessions);

         await sock.sendMessage(jid, { 
           text: `🎯 Data source set to: **${source}**`
         });
         return;
       }
     }

         // Command: TYPE (for data type selection)
     if (/^TYPE:?\s+/i.test(text)) {
       const dataType = text.replace(/^TYPE:?\s+/i, '').trim().toUpperCase();
       
       if (!session.pendingNiche) {
         await sock.sendMessage(jid, { 
           text: '⚠️ No pending search. Please send a search query first.'
         });
         return;
       }
       
       // Validate data type based on source
       const source = session.prefs.source;
       let validTypes = [];
       
       switch (source) {
         case 'GOOGLE':
           validTypes = ['EMAILS', 'PHONES', 'CONTACTS'];
           break;
         case 'LINKEDIN':
           validTypes = ['PROFILES', 'CONTACTS', 'COMPLETE'];
           break;
         case 'MAPS':
           validTypes = ['PROFILES', 'CONTACTS', 'COMPLETE'];
           break;
         case 'ALL':
           validTypes = ['CONTACTS', 'COMPLETE'];
           break;
       }
       
       if (!validTypes.includes(dataType)) {
         await sock.sendMessage(jid, { 
           text: `⚠️ Invalid data type for ${source}. Choose from: ${validTypes.join(', ')}`
         });
         return;
       }
       
       // Store data type and ask for format
       session.prefs.dataType = dataType;
       sessions[jid] = session;
       saveJson(SESSIONS_FILE, sessions);
       
       // Now ask for output format
       let formatChoices;
       switch (source) {
         case 'GOOGLE':
           formatChoices = `💾 **Google Search only supports TXT format**\n\n` +
                          `📄 Format: TXT (Text file)\n\n` +
                          `🚀 Ready to start scraping!\n\n` +
                          `💬 **Send:** START\n\n` +
                          `📝 **Note:** Just type START (no colon needed)`;
           break;
         case 'LINKEDIN':
           formatChoices = `💾 **LinkedIn only supports XLSX format**\n\n` +
                          `📄 Format: XLSX (Excel file)\n\n` +
                          `🚀 Ready to start scraping!\n\n` +
                          `💬 **Send:** START\n\n` +
                          `📝 **Note:** Just type START (no colon needed)`;
           break;
         case 'MAPS':
           formatChoices = `💾 **Select Output Format for Google Maps:**\n\n` +
                          `1️⃣ **JSON** - Native Google Maps format\n` +
                          `2️⃣ **CSV** - Alternative format\n\n` +
                          `💬 **Reply with:** FORMAT: JSON\n` +
                          `💬 **Example:** FORMAT: CSV\n\n` +
                          `📝 **Note:** You must type the full command with colon`;
           break;
         case 'ALL':
           formatChoices = `💾 **Select Output Format for All Sources:**\n\n` +
                          `1️⃣ **XLSX** - Recommended for combined data\n` +
                          `2️⃣ **CSV** - Universal format\n` +
                          `3️⃣ **JSON** - Developer format\n\n` +
                          `💬 **Reply with:** FORMAT: XLSX\n` +
                          `💬 **Example:** FORMAT: CSV\n\n` +
                          `📝 **Note:** You must type the full command with colon`;
           break;
       }
       
       await sock.sendMessage(jid, { text: formatChoices });
       return;
     }

          // Command: FORMAT
     if (/^FORMAT:?\s+/i.test(text)) {
       const format = text.replace(/^FORMAT:?\s+/i, '').trim().toUpperCase();
       
       if (!session.pendingNiche) {
         await sock.sendMessage(jid, { 
           text: '⚠️ No pending search. Please send a search query first.'
         });
         return;
       }
       
       const source = session.prefs.source;
       let validFormats = [];
       
       switch (source) {
         case 'GOOGLE':
           validFormats = ['TXT'];
           break;
         case 'LINKEDIN':
           validFormats = ['XLSX'];
           break;
         case 'MAPS':
           validFormats = ['JSON', 'CSV'];
           break;
         case 'ALL':
           validFormats = ['XLSX', 'CSV', 'JSON'];
           break;
       }
       
       if (!validFormats.includes(format)) {
         await sock.sendMessage(jid, { 
           text: `⚠️ Invalid format for ${source}. Choose from: ${validFormats.join(', ')}`
         });
         return;
       }

       session.prefs.format = format;
       sessions[jid] = session;
       saveJson(SESSIONS_FILE, sessions);

       // Now ready to start
       await sock.sendMessage(jid, { 
         text: `💾 **Output format set to: ${format}**\n\n` +
               `🚀 **Ready to start scraping!**\n\n` +
               `💬 **Send:** START\n\n` +
               `📝 **Note:** Just type START (no colon needed)`
       });
       return;
     }

    // Command: LIMIT
    if (/^LIMIT:?\s+/i.test(text)) {
      const limitStr = text.replace(/^LIMIT:?\s+/i, '').trim();
      const limit = parseInt(limitStr, 10);
      
      if (!Number.isFinite(limit) || limit < 1 || limit > 500) {
        await sock.sendMessage(jid, { 
          text: '⚠️ Invalid limit. Please enter a number between 1 and 500.'
        });
        return;
      }

      session.prefs.limit = limit;
      sessions[jid] = session;
      saveJson(SESSIONS_FILE, sessions);

      await sock.sendMessage(jid, { 
        text: `📏 Results limit set to: **${limit}**`
      });
      return;
    }

    // Command: STATUS
    if (/^STATUS$/i.test(text)) {
      const activeJob = activeJobs.get(jid);
      
      if (activeJob) {
        await sock.sendMessage(jid, { 
          text: `📊 **Current Status:** ${activeJob.status || 'Processing...'}\n\n` +
                `🎯 Source: ${session.prefs.source}\n` +
                `📄 Format: ${session.prefs.format}\n` +
                `📏 Limit: ${session.prefs.limit}\n\n` +
                `💡 Send STOP to cancel the current job.`
        });
      } else {
        await sock.sendMessage(jid, { 
          text: `📊 **Status:** Idle\n\n` +
                `🎯 Source: ${session.prefs.source}\n` +
                `📄 Format: ${session.prefs.format}\n` +
                `📏 Limit: ${session.prefs.limit}\n\n` +
                `💡 Send a search query to start scraping.`
        });
      }
      return;
    }

    // Command: STOP
    if (/^STOP$/i.test(text)) {
      const activeJob = activeJobs.get(jid);
      
      if (activeJob && activeJob.abort) {
        activeJob.abort.abort();
        activeJobs.delete(jid);
        
        session.status = 'idle';
        sessions[jid] = session;
        saveJson(SESSIONS_FILE, sessions);

        await sock.sendMessage(jid, { 
          text: '🛑 **Job cancelled successfully.** You can send a new search query when ready.'
        });
      } else {
        await sock.sendMessage(jid, { 
          text: '📊 No active job to cancel. You can send a search query to start scraping.'
        });
      }
      return;
    }

    // Command: RESET
    if (/^RESET$/i.test(text)) {
      session.prefs = {
        source: 'ALL',
        format: 'XLSX',
        limit: 300
      };
      sessions[jid] = session;
      saveJson(SESSIONS_FILE, sessions);

      await sock.sendMessage(jid, { 
        text: '♻️ **Preferences reset to defaults:**\n\n' +
              '🎯 Source: ALL\n' +
              '📄 Format: XLSX\n' +
              '📏 Limit: 300'
      });
      return;
    }

         // Command: START
     if (/^START$/i.test(text)) {
       if (!session.pendingNiche) {
         await sock.sendMessage(jid, { 
           text: '⚠️ No pending search. Please send a search query first.'
         });
         return;
       }
       
       if (!session.prefs.source || !session.prefs.dataType || !session.prefs.format) {
         await sock.sendMessage(jid, { 
           text: '⚠️ Configuration incomplete. Please complete source, type, and format selection first.'
         });
         return;
       }
       
       // Now start the actual scraping job
       const niche = session.pendingNiche;
       const { source, dataType, format, limit } = session.prefs;
       
       // Clear pending niche
       delete session.pendingNiche;
       sessions[jid] = session;
       saveJson(SESSIONS_FILE, sessions);
       
       // Start the scraping job
       console.log(chalk.cyan(`🔍 Job started: "${niche}" (${source}/${dataType}/${format}/${limit})`));

       await sock.sendMessage(jid, { 
         text: `🔍 **Starting scraping job...**\n\n` +
               `📝 Niche: "${niche}"\n` +
               `🎯 Source: ${source}\n` +
               `📋 Data Type: ${dataType}\n` +
               `📄 Format: ${format}\n` +
               `📏 Limit: ${limit}\n\n` +
               `⏱️ This may take several minutes. I'll send progress updates every 15 seconds...`
       });
       
       // Send immediate status update
       setTimeout(async () => {
         try {
           await sock.sendMessage(jid, { 
             text: `🔄 **Status:** Job is initializing and connecting to ${source} scraper...`
           });
         } catch (error) {
           console.error('Failed to send initial status:', error.message);
         }
       }, 2000); // Send after 2 seconds
       
       // Send another update after 5 seconds
       setTimeout(async () => {
         try {
           await sock.sendMessage(jid, { 
             text: `📡 **Connecting:** Establishing connection to ${source} data source...`
           });
         } catch (error) {
           console.error('Failed to send connection status:', error.message);
         }
       }, 5000); // Send after 5 seconds
       
       // Continue with the existing scraping logic...
       // Create abort controller
       const abortController = new AbortController();
       activeJobs.set(jid, {
         abort: abortController,
         status: 'initializing'
       });

       session.status = 'running';
       session.meta.lastNiche = niche;
       sessions[jid] = session;
       saveJson(SESSIONS_FILE, sessions);

       let resultCount = 0;
       let lastProgressUpdate = Date.now();
       const PROGRESS_INTERVAL = 15000; // 15 seconds (more frequent)
       
       // Set up periodic heartbeat to show job is still alive
       const heartbeatInterval = setInterval(async () => {
         try {
           const jobStatus = activeJobs.get(jid);
           if (jobStatus && jobStatus.status !== 'completed') {
             await sock.sendMessage(jid, { 
               text: `💓 **Job Status:** Still running... ${jobStatus.status || 'Processing...'}`
             });
           }
         } catch (error) {
           console.error('Failed to send heartbeat:', error.message);
         }
       }, 60000); // Every 60 seconds

       try {
         const result = await startUnifiedScraper({
           niche,
           source: source, // Use original uppercase values
           dataType: dataType.toLowerCase(), // Convert to lowercase for internal use
           format,
           apiKeys: session.apiKeys,
           options: {
             maxResults: limit,
             abortSignal: abortController.signal,
             debug: false,
             
             onResult: async (item) => {
               resultCount++;
               
               // Send progress updates every 15 seconds or every 10 results
               const now = Date.now();
               if (now - lastProgressUpdate > PROGRESS_INTERVAL || resultCount % 10 === 0) {
                 const jobStatus = activeJobs.get(jid);
                 if (jobStatus) {
                   jobStatus.status = `Processing: ${resultCount} results found`;
                   try {
                     await sock.sendMessage(jid, { 
                       text: `⏱️ **Progress Update:** ${resultCount} results found and processing...`
                     });
                     lastProgressUpdate = now;
                   } catch (error) {
                     console.error('Failed to send progress update:', error.message);
                   }
                 }
               }
             },

             onBatch: async (batch) => {
               // Send batch updates for every batch
               try {
                 await sock.sendMessage(jid, { 
                   text: `📦 Processed batch of ${batch.length} results...`
                 });
               } catch (error) {
                 console.error('Failed to send batch update:', error.message);
               }
             },

             onProgress: async ({ processed, total, phase, message }) => {
               const jobStatus = activeJobs.get(jid);
               if (jobStatus) {
                 jobStatus.status = `${phase}: ${processed}/${total || '?'} processed`;
                 
                 // Send phase updates for all phases
                 try {
                   let phaseText = '';
                   switch (phase) {
                     case 'init':
                       phaseText = '🚀 **Initializing** scraper...';
                       break;
                     case 'querying':
                       phaseText = `🔍 **Querying** phase: ${processed}${total ? `/${total}` : ''} queries processed`;
                       break;
                     case 'scraping':
                       phaseText = `🌐 **Scraping** phase: ${processed}${total ? `/${total}` : ''} websites processed`;
                       break;
                     case 'exporting':
                       phaseText = `💾 **Exporting** phase: ${processed}${total ? `/${total}` : ''} results exported`;
                       break;
                     default:
                       phaseText = `🔄 **${phase.charAt(0).toUpperCase() + phase.slice(1)}** phase: ${processed}${total ? `/${total}` : ''} processed`;
                   }
                   
                   await sock.sendMessage(jid, { text: phaseText });
                 } catch (error) {
                   console.error('Failed to send phase update:', error.message);
                 }
               }
             }
           }
         });

         // Job completed successfully
         clearInterval(heartbeatInterval); // Stop heartbeat
         activeJobs.delete(jid);
         session.status = 'idle';
         session.meta.totalJobs++;
         sessions[jid] = session;
         saveJson(SESSIONS_FILE, sessions);

         // Send results summary
         const summary = formatResultSummary(result.results, result.meta);
         await sendChunkedMessage(sock, jid, summary);

         // Send the file
         if (result.filePath) {
           await sendFile(sock, jid, result.filePath, 
             `📎 ${result.meta.totalResults} results in ${result.meta.format} format`);
         }

         console.log(chalk.green(`✅ Job completed: ${result.meta.totalResults} results`));

       } catch (error) {
         console.error(chalk.red(`❌ Job failed: ${error.message}`));
         
         // Clean up
         clearInterval(heartbeatInterval); // Stop heartbeat
         activeJobs.delete(jid);
         session.status = 'idle';
         sessions[jid] = session;
         saveJson(SESSIONS_FILE, sessions);

         if (error.message.includes('aborted')) {
           await sock.sendMessage(jid, { 
             text: '🛑 **Job was cancelled.** You can send a new search query when ready.'
           });
         } else {
           await sock.sendMessage(jid, { 
             text: `❌ **Error occurred:** ${error.message}\n\n` +
                   `💡 Please try again with a different niche or contact support if the issue persists.`
           });
         }
       }
       
       return;
     }

     // Command: HELP
     if (/^HELP$/i.test(text)) {
       await sendChunkedMessage(sock, jid, getHelpMessage());
       return;
     }

               // Check if user has valid API keys
      if (!session.apiKeys) {
        await sock.sendMessage(jid, { 
          text: '🔐 **Authentication required.** Please send your access code first.\n\n' +
                '💬 **Format:** CODE: your_code_here\n' +
                '💬 **Example:** CODE: user1\n\n' +
                '💡 Contact admin if you don\'t have an access code.'
        });
        return;
      }
      
      // Check if user has completed authentication
      if (!session.code) {
        await sock.sendMessage(jid, { 
          text: '🔐 **Authentication required.** Please send your access code first.\n\n' +
                '💬 **Format:** CODE: your_code_here\n' +
                '💬 **Example:** CODE: user1\n\n' +
                '💡 Contact admin if you don\'t have an access code.'
        });
        return;
      }

         // Check if already running a job
     if (activeJobs.has(jid)) {
       await sock.sendMessage(jid, { 
         text: '⏳ **Job already running.** Send STATUS to check progress or STOP to cancel.'
       });
       return;
     }

           // Treat as search niche - but first we need to get source and data type
      const niche = text;
      
      // Check if this looks like a command (starts with a command word)
      const commandWords = ['SOURCE:', 'TYPE:', 'FORMAT:', 'START', 'CODE:', 'LIMIT:', 'STATUS', 'STOP', 'RESET', 'HELP'];
      const isCommand = commandWords.some(cmd => text.toUpperCase().startsWith(cmd));
      
      if (isCommand) {
        await sock.sendMessage(jid, { 
          text: '⚠️ **Invalid input.** Please send a search query (e.g., "dentist casablanca", "restaurant fes") not a command.\n\n' +
                '💡 **Example queries:**\n' +
                '• "dentist casablanca"\n' +
                '• "restaurant fes"\n' +
                '• "lawyer rabat"\n' +
                '• "hotel marrakech"'
        });
        return;
      }
      
      // Ask user to select source first
      await sock.sendMessage(jid, { 
        text: `🎯 **Select Data Source for "${niche}":**\n\n` +
              `1️⃣ **GOOGLE** - Business websites & contact pages\n` +
              `2️⃣ **LINKEDIN** - Professional profiles & companies\n` +
              `3️⃣ **MAPS** - Business directory & local listings\n` +
              `4️⃣ **ALL** - Combined multi-source scraping\n\n` +
              `💬 **Reply with:** SOURCE: GOOGLE\n` +
              `💬 **Example:** SOURCE: MAPS\n\n` +
              `📝 **Note:** You must type the full command with colon\n\n` +
              `🔄 **Flow:** SOURCE → TYPE → FORMAT → START`
      });
      
      // Store the niche for later use
      session.pendingNiche = niche;
      sessions[jid] = sessions[jid] || {};
      sessions[jid] = session;
      saveJson(SESSIONS_FILE, sessions);
      return;

  } catch (error) {
    console.error('❌ Error handling message:', error.message);
    await sock.sendMessage(jid, { 
      text: '❌ Internal error occurred. Please try again or contact support.'
    });
  }
}

async function startBot() {
  console.log(chalk.cyan.bold('\n🤖 Starting WhatsApp Business Scraper Bot...\n'));

  try {
    // Initialize authentication
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    
    // Create socket
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // We'll handle QR display manually
      browser: ['Business Scraper Bot', 'Chrome', '1.0.0'],
      defaultQueryTimeoutMs: 60000,
      logger: {
        level: 'silent', // Disable verbose Baileys logs
        child: () => ({ 
          level: 'silent',
          error: () => {},
          warn: () => {},
          info: () => {},
          debug: () => {},
          trace: () => {}
        }),
        error: () => {}, // Disable error logging
        warn: () => {},  // Disable warning logging
        info: () => {},  // Disable info logging
        debug: () => {}, // Disable debug logging
        trace: () => {}  // Disable trace logging
      }
    });

    // QR Code handler
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log(chalk.yellow('\n📱 Scan this QR code with WhatsApp:\n'));
        qrcode.generate(qr, { small: true });
        console.log(chalk.blue('\n💡 Instructions:'));
        console.log(chalk.gray('   1. Open WhatsApp → Settings → Linked Devices'));
        console.log(chalk.gray('   2. Tap "Link a Device"'));
        console.log(chalk.gray('   3. Scan the QR code above\n'));
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(chalk.red('\n❌ Connection closed'));
        
        if (shouldReconnect) {
          console.log(chalk.yellow('🔄 Reconnecting in 3 seconds...\n'));
          setTimeout(startBot, 3000);
        } else {
          console.log(chalk.red('🚪 Logged out. Restart bot to reconnect.\n'));
        }
      } else if (connection === 'open') {
        console.log(chalk.green.bold('\n✅ WhatsApp Bot Connected Successfully!'));
        console.log(chalk.green('📱 Ready to receive messages...\n'));
        console.log(chalk.cyan('🛠️  Quick Admin Commands:'));
        console.log(chalk.gray('   npm run admin:list    - List access codes'));
        console.log(chalk.gray('   npm run admin:add     - Add new user'));
        console.log(chalk.gray('   npm run admin:remove  - Remove user\n'));
      }
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const message of messages) {
        if (message.key && message.message) {
          await handleMessage(sock, message);
        }
      }
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n🛑 Shutting down bot...'));
      
      // Cancel all active jobs
      for (const [jid, job] of activeJobs.entries()) {
        if (job.abort) {
          job.abort.abort();
        }
      }
      activeJobs.clear();
      
      console.log(chalk.green('✅ Bot shut down gracefully'));
      process.exit(0);
    });

  } catch (error) {
    console.error(chalk.red('❌ Failed to start bot:'), error.message);
    process.exit(1);
  }
}

// Start the bot
if (import.meta.url === `file://${process.argv[1]}` || 
    import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  startBot();
}

export { startBot };
