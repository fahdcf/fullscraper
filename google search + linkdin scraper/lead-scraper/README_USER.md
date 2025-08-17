# 🚀 Morocco Web Scraper - User Guide

## 📋 Overview

The **Morocco Web Scraper** is a powerful CLI tool that automatically finds and extracts contact information (emails and phone numbers) from business websites and LinkedIn profiles across Morocco. It uses AI-powered search queries to find the most relevant results.

## ✨ Key Features

- 🔍 **AI-Powered Search**: Uses Gemini AI to generate intelligent search queries
- 🌐 **Multiple Sources**: Scrapes from Google Search and LinkedIn
- 📧 **Contact Extraction**: Finds emails and phone numbers from business websites
- 👥 **LinkedIn Profiles**: Extracts professional profiles and company pages
- 🎯 **Morocco-Focused**: Optimized for Moroccan businesses and professionals
- 📊 **Flexible Output**: Exports to CSV, Excel, or clean text files
- 🔄 **Smart Interruption**: Saves partial results if interrupted
- 🔑 **Easy API Management**: Simple tool to manage multiple API keys

## 🚀 Quick Start

### 1. Installation
```bash
# Clone or download the project
cd bot-scraper

# Install dependencies
npm install
```

### 2. Configuration
```bash
# Set up your API keys
npm run keys

# Or manually edit env.config file
```

### 3. Run the Scraper
```bash
npm start
```

## 📋 Prerequisites

### Required API Keys

1. **Google Custom Search API Key(s)**
   - Get from: [Google Cloud Console](https://console.cloud.google.com/)
   - Enable: Custom Search API
   - Add to: `env.config` file

2. **Gemini AI API Key**
   - Get from: [Google AI Studio](https://aistudio.google.com/)
   - Add to: `env.config` file

### How to Get API Keys

#### Google Custom Search API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Custom Search API"
4. Create credentials (API Key)
5. Copy the key to your `env.config` file

#### Gemini AI API
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the key to your `env.config` file

## 🎯 How to Use

### Basic Usage

1. **Start the scraper**:
   ```bash
   npm start
   ```

2. **Enter your niche** (e.g., "dentist casablanca", "web agency fes")

3. **Choose data source**:
   - **Google Search**: Business websites with contact info
   - **LinkedIn**: Professional profiles and company pages
   - **All Sources**: Combined results

4. **For Google Search, choose data type**:
   - **Emails Only**: Extract only email addresses
   - **Phone Numbers Only**: Extract only phone numbers
   - **Both**: Extract emails and phone numbers

5. **Wait for results** - The scraper will:
   - Generate AI-powered search queries
   - Search multiple pages
   - Extract and validate contact information
   - Save results to files

### Advanced Usage

#### Managing API Keys
```bash
# List all API keys
npm run keys

# Add new API key
npm run keys
# Choose option 2

# Replace expired key
npm run keys
# Choose option 3
```

#### Running Tests
```bash
# Test with sample data
npm run test

# Test specific queries
npm run test-single
```

## 📊 Understanding Results

### Google Search Results
- **Format**: Text file (`.txt`)
- **Content**: Clean list of emails and/or phone numbers
- **Header**: Descriptive information about the search
- **Location**: `[niche]_results.txt`

### LinkedIn Results
- **Format**: Excel file (`.xlsx`)
- **Content**: Profile name, link, bio, and company info
- **Columns**: Name, Profile Link, Bio, Company
- **Location**: `[niche]_linkedin_results.xlsx`

### Partial Results
If the scraper is interrupted (Ctrl+C), it saves partial results with timestamp:
- `[niche]_results_partial_[timestamp].txt`
- `[niche]_linkedin_results_partial_[timestamp].xlsx`

## 🎯 Getting Best Results

### 1. **Use Specific Niches**
✅ **Good**: "dentist casablanca", "web agency fes", "restaurant rabat"
❌ **Avoid**: "business", "company", "service"

### 2. **Include Location**
✅ **Good**: "dentist casablanca", "lawyer rabat", "agency fes"
❌ **Avoid**: "dentist", "lawyer", "agency" (too broad)

### 3. **Use Business-Specific Terms**
✅ **Good**: "dentist", "lawyer", "web agency", "restaurant", "hotel"
✅ **Good**: "cabinet dentaire", "avocat", "agence web", "restaurant"

### 4. **Choose the Right Data Source**
- **Google Search**: For contact information from business websites
- **LinkedIn**: For professional profiles and company information
- **All Sources**: For comprehensive results

### 5. **Manage API Keys**
- Add multiple Google API keys for better quota management
- Use `npm run keys` to easily manage your keys
- The system automatically rotates keys when quotas are hit

## 📈 Performance Tips

### For Better Google Search Results
1. **Use specific business types**: "dentist", "lawyer", "web agency"
2. **Include location**: "casablanca", "rabat", "fes"
3. **Use French terms**: "dentiste", "avocat", "agence"
4. **Choose "Both" data type** for comprehensive results

### For Better LinkedIn Results
1. **Use professional terms**: "web developer", "lawyer", "dentist"
2. **Include location**: "casablanca", "rabat", "fes"
3. **Use both French and English**: "développeur web", "web developer"

### API Key Management
1. **Add multiple keys**: More keys = more quota = more results
2. **Monitor usage**: Check Google Cloud Console for quota usage
3. **Rotate keys**: Replace expired keys using `npm run keys`

## 🔧 Troubleshooting

### Common Issues

#### "No API keys found"
```bash
# Check your env.config file
npm run keys
# Choose option 1 to list keys
```

#### "API quota exceeded"
```bash
# Add more API keys
npm run keys
# Choose option 2 to add new key
```

#### "No results found"
- Try more specific niche terms
- Include location in your search
- Use French terms for Moroccan businesses
- Check that your API keys are valid

#### "Invalid API key"
- Verify your Google API key has Custom Search API enabled
- Check that your Gemini API key is valid
- Ensure keys are properly formatted in `env.config`

### Performance Issues

#### Slow Results
- Add more API keys for parallel processing
- Use more specific niche terms
- Check your internet connection

#### Low Quality Results
- Use more specific business terms
- Include location information
- Try different data sources (Google vs LinkedIn)

## 📁 Output Files

### File Naming Convention
- **Google Search**: `[niche]_results.txt`
- **LinkedIn**: `[niche]_linkedin_results.xlsx`
- **Partial Results**: `[niche]_results_partial_[timestamp].txt`

### File Locations
- All files are saved in the project root directory
- Check the console output for exact filenames
- Files are overwritten on each run (except partial results)

## 🔒 Privacy and Ethics

### Responsible Usage
- Only scrape publicly available information
- Respect robots.txt files
- Don't overload servers with requests
- Use the tool for legitimate business purposes

### Rate Limiting
- The scraper includes built-in delays between requests
- API keys are rotated to avoid quota limits
- Respects Google's and LinkedIn's terms of service

## 📞 Support

### Getting Help
1. **Check the logs**: Console output shows detailed progress
2. **Verify API keys**: Use `npm run keys` to check your setup
3. **Test with simple terms**: Try "dentist casablanca" first
4. **Check file permissions**: Ensure the tool can write files

### Common Commands
```bash
# Start scraper
npm start

# Manage API keys
npm run keys

# Test functionality
npm run test

# Check current setup
npm run keys
# Choose option 1 to list keys
```

## 🎉 Success Tips

1. **Start Simple**: Use "dentist casablanca" to test
2. **Be Specific**: Include business type and location
3. **Use French Terms**: Better results for Moroccan businesses
4. **Add Multiple API Keys**: More keys = more results
5. **Check Results**: Always verify the output files
6. **Monitor Quotas**: Keep track of your API usage

---

**Happy Scraping! 🚀**

For technical details and development information, see `README_DEVELOPER.md` 