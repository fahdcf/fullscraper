# 🚀 Morocco Web Scraper - Clean & Simple

A streamlined Node.js CLI application that extracts contact information (emails and phone numbers) from business websites and LinkedIn profiles across Morocco using AI-powered query generation.

## ✨ Features

- **AI-Powered Query Generation**: Uses Gemini AI to generate context-aware search queries
- **Multi-Source Search**: Google Search for business websites + LinkedIn for professional profiles
- **Enhanced Deduplication**: Intelligent removal of duplicate emails and phone numbers
- **Content Validation**: Smart filtering to ensure relevant results
- **Multiple Export Formats**: CSV, Excel, and Text file support
- **Interruption Handling**: Saves partial results if process is interrupted

## 🏗️ Project Structure

```
bot-scraper/
├── scraper.js                    # Main CLI application
├── config.js                     # Configuration & API keys
├── manage_api_keys.js            # Interactive API key management
├── helpers/
│   ├── geminiAI.js              # AI query generation
│   ├── googleSearch.js          # Google Custom Search API
│   ├── multiSourceSearch.js     # Multi-source orchestration
│   ├── contentValidator.js      # Content filtering
│   ├── exportToCsv.js          # Data export (CSV/Excel/TXT)
│   ├── extractEmails.js        # Email extraction
│   ├── extractPhones.js        # Phone extraction
│   └── fetchPage.js            # HTTP requests
```

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure API keys**:
   ```bash
   npm run keys
   ```
   Or manually edit `env.config` file.

3. **Run the scraper**:
```bash
npm start
```

## 📊 Data Sources

### Google Search (Business Websites)
- Extracts emails and phone numbers from business websites
- Uses AI-generated queries for better targeting
- Content validation ensures relevant results
- Enhanced deduplication removes duplicates

### LinkedIn (Professional Profiles)
- Finds professional profiles and company pages
- Exports to Excel format with clickable links
- Smart deduplication based on name and URL
- Preserves profile completeness information

## 🔧 Configuration

### Required API Keys
- **Google Custom Search API**: For web search functionality
- **Gemini AI API**: For intelligent query generation

### Environment Variables (`env.config`)
```
GOOGLE_API_KEY_1=your_google_api_key_1
GOOGLE_API_KEY_2=your_google_api_key_2
GEMINI_API_KEY=your_gemini_api_key
```

## 📈 Enhanced Deduplication

The scraper now includes intelligent deduplication:

### Email Deduplication
- Normalizes email addresses (lowercase, removes +tags)
- Filters out disposable email domains
- Removes exact duplicates

### Phone Number Deduplication
- Standardizes Moroccan phone numbers to +212 format
- Handles various input formats (06, 07, 212, etc.)
- Removes duplicate numbers

### LinkedIn Profile Deduplication
- Removes duplicate URLs
- Keeps profiles with more complete information
- Handles name variations

## 📁 Output Files

### Google Search Results
- **Format**: Text file (.txt)
- **Content**: Emails and phone numbers
- **Naming**: `{niche}_results.txt`

### LinkedIn Results
- **Format**: Excel file (.xlsx)
- **Content**: Profile information with clickable links
- **Naming**: `{niche}_linkedin_results.xlsx`

## 🎯 Usage Examples

```bash
# Scrape website developers in Casablanca
npm start
# Enter: "website developers in Casablanca"
# Select: Google Search
# Select: Both emails and phones

# Scrape LinkedIn profiles for dentists
npm start
# Enter: "dentists in Morocco"
# Select: LinkedIn
```

## 🔍 Content Validation

The scraper uses intelligent content validation:
- **Keyword Matching**: Ensures content matches target niche
- **Business Indicators**: Identifies business-related content
- **Platform Filtering**: Excludes social media and support pages
- **Contact Validation**: Verifies extracted contact information

## 🛠️ Development

### Scripts
- `npm start` - Run the main scraper
- `npm run keys` - Manage API keys
- `npm run dev` - Run with file watching

### Adding New Features
1. The project is modular - add new helpers in the `helpers/` directory
2. Update `scraper.js` to integrate new functionality
3. Test with `npm start`

## 📝 Notes

- **Rate Limiting**: Built-in delays respect server resources
- **Error Handling**: Graceful failure recovery
- **Memory Management**: Efficient processing for large datasets
- **Security**: Only scrapes publicly available information

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Note**: This is a cleaned version of the original project with advanced features removed and enhanced deduplication added. The scraper focuses on simplicity, reliability, and data quality. 