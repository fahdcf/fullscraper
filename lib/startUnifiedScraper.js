import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { SourceManager } from '../core/source-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Programmatic API for the Unified Business Scraper
 * Used by WhatsApp bot and other integrations
 */

/**
 * Start unified scraper with streaming callbacks
 * @param {Object} params - Scraper parameters
 * @param {string} params.niche - Search niche (e.g., "dentist casablanca")
 * @param {string} params.source - Data source: "GOOGLE" | "LINKEDIN" | "MAPS" | "ALL"
 * @param {string} params.dataType - Data type: "emails" | "phones" | "contacts" | "profiles" | "complete" | "both" (default: "both")
 * @param {string} params.format - Output format: "XLSX" | "CSV" | "JSON" | "TXT"
 * @param {Object} params.apiKeys - API keys object
 * @param {string[]} params.apiKeys.googleSearchKeys - Google Custom Search API keys
 * @param {string} params.apiKeys.geminiKey - Gemini AI API key
 * @param {Object} params.options - Optional configuration
 * @param {Function} params.options.onResult - Callback for each result: (result) => void
 * @param {Function} params.options.onBatch - Callback for batch of results: (results[]) => void
 * @param {Function} params.options.onProgress - Progress callback: ({processed, total, phase, message}) => void
 * @param {number} params.options.maxResults - Maximum results (default: 300)
 * @param {AbortSignal} params.options.abortSignal - Abort signal for cancellation
 * @param {boolean} params.options.debug - Enable debug logging (default: false)
 * @returns {Promise<{results: Array, meta: Object, filePath: string}>}
 */
async function startUnifiedScraper({
  niche,
  source,
  dataType = 'both',
  format,
  apiKeys,
  options = {}
}) {
  // Validate inputs
  if (!niche || typeof niche !== 'string') {
    throw new Error('Niche is required and must be a string');
  }

  const validSources = ['GOOGLE', 'LINKEDIN', 'MAPS', 'ALL'];
  if (!validSources.includes(source)) {
    throw new Error(`Source must be one of: ${validSources.join(', ')}`);
  }

  const validFormats = ['XLSX', 'CSV', 'JSON', 'TXT'];
  if (!validFormats.includes(format)) {
    throw new Error(`Format must be one of: ${validFormats.join(', ')}`);
  }

  if (!apiKeys || typeof apiKeys !== 'object') {
    throw new Error('API keys object is required');
  }

  // Set default options
  const {
    onResult = () => {},
    onBatch = () => {},
    onProgress = () => {},
    maxResults = 300,
    abortSignal = null,
    debug = false
  } = options;

  // Validate max results
  if (maxResults < 1 || maxResults > 500) {
    throw new Error('Max results must be between 1 and 500');
  }

  // Progress tracking
  let processedCount = 0;
  let totalEstimate = 0;
  let currentPhase = 'init';
  
  // Store original environment for restoration
  const originalEnv = { ...process.env };
  
  // Initialize results array
  let allResults = [];
  
  const updateProgress = (phase, message = '', processed = processedCount, total = totalEstimate) => {
    currentPhase = phase;
    processedCount = processed;
    totalEstimate = total;
    onProgress({ processed, total, phase, message });
  };

  try {
    updateProgress('init', 'Initializing scraper...');

    // Check for abortion
    if (abortSignal?.aborted) {
      throw new Error('Operation was aborted');
    }

    // Temporarily inject API keys into environment for existing scrapers
    
    // Set Google Search API keys for Google Search and LinkedIn scrapers
    if (apiKeys.googleSearchKeys && apiKeys.googleSearchKeys.length > 0) {
      process.env.GOOGLE_API_KEY_1 = apiKeys.googleSearchKeys[0];
      process.env.GOOGLE_API_KEY_2 = apiKeys.googleSearchKeys[1] || apiKeys.googleSearchKeys[0];
      process.env.GOOGLE_API_KEY_3 = apiKeys.googleSearchKeys[2] || apiKeys.googleSearchKeys[0];
      process.env.GOOGLE_API_KEY_4 = apiKeys.googleSearchKeys[3] || apiKeys.googleSearchKeys[0];
    }

    // Set Gemini API key for Google Maps scraper
    if (apiKeys.geminiKey) {
      process.env.GEMINI_API_KEY = apiKeys.geminiKey;
      
      // Also update maps_scraper config file temporarily
      const configPath = path.join(__dirname, '../maps_scraper/config.js');
      try {
        const configContent = await fs.readFile(configPath, 'utf8');
        const updatedConfig = configContent.replace(
          /apiKey:\s*['"][^'"]*['"]/,
          `apiKey: '${apiKeys.geminiKey}'`
        );
        await fs.writeFile(configPath, updatedConfig);
      } catch (error) {
        if (debug) console.log('Warning: Could not update maps config:', error.message);
      }
    }

    updateProgress('querying', 'Setting up data source...');

    // Convert source to the format expected by existing scrapers
    const sourceMapping = {
      'GOOGLE': 'google_search',
      'LINKEDIN': 'linkedin', 
      'MAPS': 'google_maps',
      'ALL': 'all_sources'
    };
    
    const scraperSource = sourceMapping[source];

    // Determine the appropriate format based on source (respect native formats)
    let scraperFormat;
    switch (source) {
      case 'GOOGLE':
        scraperFormat = 'txt'; // Google Search creates TXT files
        break;
      case 'LINKEDIN':
        scraperFormat = 'xlsx'; // LinkedIn creates XLSX files
        break;
      case 'MAPS':
        scraperFormat = format.toLowerCase(); // Maps can use JSON/CSV as requested
        break;
      case 'ALL':
        scraperFormat = format.toLowerCase(); // ALL sources use requested format
        break;
      default:
        scraperFormat = format.toLowerCase();
    }
    
    // Convert dataType to the format expected by ResultProcessor
    const dataTypeMapping = {
      'emails': 'emails',
      'phones': 'phones', 
      'contacts': 'contacts',
      'profiles': 'profiles',
      'complete': 'complete',
      'both': 'contacts'
    };
    
    const processorDataType = dataTypeMapping[dataType] || 'contacts';

      // Initialize source manager
  const sourceManager = new SourceManager();
  
  // Create results collector
  let batchBuffer = [];
  const batchSize = 15;

    // Wrap the scraper execution to capture results
    const originalProcess = sourceManager.processAndSaveResults;
    sourceManager.processAndSaveResults = async function(results, source, dataType, niche, format) {
      // Don't save to file yet, just process and return
      updateProgress('scraping', `Processing ${results.length} results...`, processedCount, results.length);
      
      // Process each result through callbacks
      for (let i = 0; i < results.length; i++) {
        if (abortSignal?.aborted) {
          throw new Error('Operation was aborted');
        }

        const result = results[i];
        processedCount++;
        
        // Add to batch buffer
        batchBuffer.push(result);
        allResults.push(result);

        // Call onResult callback
        try {
          await onResult(result);
        } catch (error) {
          if (debug) console.log('onResult callback error:', error.message);
        }

        // Call onBatch when buffer is full
        if (batchBuffer.length >= batchSize) {
          try {
            await onBatch([...batchBuffer]);
          } catch (error) {
            if (debug) console.log('onBatch callback error:', error.message);
          }
          batchBuffer = [];
        }

        // Stop if we've reached max results
        if (processedCount >= maxResults) {
          updateProgress('scraping', `Reached max results limit (${maxResults})`);
          break;
        }
      }

      // Process remaining batch
      if (batchBuffer.length > 0) {
        try {
          await onBatch([...batchBuffer]);
        } catch (error) {
          if (debug) console.log('onBatch callback error:', error.message);
        }
      }

      // Trim results to max limit
      if (allResults.length > maxResults) {
        allResults = allResults.slice(0, maxResults);
      }

      return allResults;
    };

    updateProgress('scraping', 'Starting data extraction...');

    // Execute the scraper with callbacks to collect results
    console.log(`🔍 Debug: Starting sourceManager.run with callbacks`);
    console.log(`🔍 Debug: onResult callback exists: ${!!onResult}`);
    console.log(`🔍 Debug: onBatch callback exists: ${!!onBatch}`);
    console.log(`🔍 Debug: onProgress callback exists: ${!!onProgress}`);
    
    const results = await sourceManager.run(niche, scraperSource, dataType, scraperFormat, {
      onResult,
      onBatch,
      onProgress,
      apiKeys // Pass the user's API keys to the source manager
    });
    
    // The results are collected via the callbacks and stored in allResults
    console.log(`🔍 Debug: sourceManager.run completed`);
    console.log(`🔍 Debug: allResults length: ${allResults.length}`);
    console.log(`🔍 Debug: sourceManager.run returned ${results.length} results`);
    
    // If sourceManager.run returned results, use them instead of the callback-collected ones
    if (results && results.length > 0) {
      allResults = results;
      console.log(`🔍 Debug: Using results from sourceManager.run: ${allResults.length}`);
    }

    updateProgress('exporting', 'Generating output file...');

    // Create output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const cleanNiche = niche.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase();
    
    let sourceLabel = source.toLowerCase();
    if (source === 'ALL') {
      sourceLabel = 'all_sources';
    } else if (source === 'GOOGLE') {
      sourceLabel = 'google_search';
    }
    
    const filename = `${cleanNiche}_${sourceLabel}_${timestamp}.${scraperFormat}`;
    const filePath = path.join(__dirname, '../results', filename);

    // Ensure results directory exists
    const resultsDir = path.dirname(filePath);
    await fs.mkdir(resultsDir, { recursive: true });

    let finalFilePath;
    
    // For LinkedIn we can reuse the file it generates; for Google we export fresh to ensure counts match
    if (source === 'LINKEDIN') {
      // Find the most recent file created by the individual scraper
      const scraperDir = source === 'GOOGLE' 
        ? './google search + linkdin scraper/lead-scraper'
        : './google search + linkdin scraper/lead-scraper';
      
      try {
        const files = await fs.readdir(scraperDir);
        const nicheNormalized = niche.replace(/\s+/g, '_').toLowerCase();
        
        // Look for the most recent results file for this niche
        const resultFiles = files.filter(f => 
          f.includes(nicheNormalized) && 
          (f.includes('_results_') || f.includes('_autosave_'))
        );
        
        if (resultFiles.length > 0) {
          // Get the most recent file with async stat
          const fileStats = await Promise.all(
            resultFiles.map(async (f) => {
              const stat = await fs.stat(path.join(scraperDir, f));
              return { name: f, time: stat.mtime };
            })
          );
          
          const mostRecent = fileStats.sort((a, b) => b.time - a.time)[0];
          
          finalFilePath = path.join(scraperDir, mostRecent.name);
          console.log(`📁 Using existing ${source} file: ${mostRecent.name}`);
        } else {
          throw new Error(`No results file found for ${source} scraper`);
        }
      } catch (error) {
        console.log(`⚠️ Could not find existing ${source} file, will export new one: ${error.message}`);
        // Fall back to exporting
        finalFilePath = await exportResults();
      }
    } else {
      // For Google, Maps and ALL sources, export using ResultProcessor to ensure file matches returned results
      finalFilePath = await exportResults();
    }
    
    // Helper function to export results
    async function exportResults() {
      const { ResultProcessor } = await import('../core/result-processor.js');
      const processor = new ResultProcessor();
      
      const exportedPath = await processor.exportResults(
        allResults || [],
        scraperSource,
        processorDataType,
        scraperFormat,
        niche
      );
      
      return path.join(__dirname, '../results', exportedPath);
    }

    updateProgress('done', `Completed successfully! Generated ${allResults.length} results.`);

    // Create metadata
    const meta = {
      niche,
      source,
      dataType,
      format: scraperFormat.toUpperCase(), // Use the actual format being sent
      totalResults: allResults.length,
      processedAt: new Date().toISOString(),
      maxResultsLimit: maxResults,
      phase: 'completed'
    };

    // Restore original environment
    Object.assign(process.env, originalEnv);
    
    return {
      results: allResults,
      meta,
      filePath: finalFilePath
    };

  } catch (error) {
    // Restore original environment on error
    // originalEnv is already declared above
    Object.assign(process.env, originalEnv);
    
    updateProgress('error', `Error: ${error.message}`);
    
    // If we have partial results, still return them
    if (allResults.length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const cleanNiche = niche.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').toLowerCase();
      const filename = `${cleanNiche}_partial_${timestamp}.json`;
      const filePath = path.join(__dirname, '../results', filename);
      
      try {
        await fs.writeFile(filePath, JSON.stringify({
          meta: {
            niche,
            source,
            dataType,
            format,
            totalResults: allResults.length,
            processedAt: new Date().toISOString(),
            isPartial: true,
            error: error.message
          },
          results: allResults
        }, null, 2));

        return {
          results: allResults,
          meta: {
            niche,
            source,
            dataType,
            format,
            totalResults: allResults.length,
            isPartial: true,
            error: error.message
          },
          filePath
        };
      } catch (saveError) {
        // If we can't save, just throw the original error
        throw error;
      }
    }
    
    throw error;
  }
}

export { startUnifiedScraper };
