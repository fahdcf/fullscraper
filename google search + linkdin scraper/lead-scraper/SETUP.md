# 🚀 Morocco Dentist Scraper - Setup Guide

## 📋 Quick Start

### 1. **One-Command Execution (Recommended)**
```bash
npm start
```
This runs all 20 queries and scrapes all found URLs automatically.

### 2. **Test Mode (3 queries only)**
```bash
npm test
```
This runs only 3 queries to test the system without hitting API limits.

## 🔑 API Key Setup

### **Step 1: Get Google Custom Search API Keys**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select existing one
3. **Enable Custom Search API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Custom Search API"
   - Click "Enable"
4. **Create API Keys**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Repeat for multiple keys (recommended: 3-5 keys)

### **Step 2: Get Google Custom Search Engine ID**

1. **Go to Custom Search**: https://cse.google.com/
2. **Create a new search engine**:
   - Enter any website (e.g., google.com)
   - Get your Search Engine ID (cx parameter)

### **Step 3: Configure API Keys**

Edit `env.config` file:
```bash
# Google Custom Search API Keys (Primary + Fallbacks)
GOOGLE_API_KEY_1=YOUR_PRIMARY_API_KEY_HERE
GOOGLE_API_KEY_2=YOUR_SECOND_API_KEY_HERE
GOOGLE_API_KEY_3=YOUR_THIRD_API_KEY_HERE
GOOGLE_API_KEY_4=YOUR_FOURTH_API_KEY_HERE
GOOGLE_API_KEY_5=YOUR_FIFTH_API_KEY_HERE

# Google Custom Search Engine ID
GOOGLE_SEARCH_ENGINE_ID=YOUR_SEARCH_ENGINE_ID_HERE

# Request Configuration
REQUEST_DELAY=2000
REQUEST_TIMEOUT=20000
```

## 🧪 Testing

### **Test with 3 Queries (Safe)**
```bash
npm test
```

### **Test with Single Query**
```bash
npm run test-single
```

### **Full Scraping (20 Queries)**
```bash
npm start
```

## 📊 Expected Results

### **With 1 API Key (Free Tier)**
- **Daily Limit**: ~100 queries
- **Recommended**: Use test mode or add more API keys

### **With 3-5 API Keys**
- **Daily Limit**: ~300-500 queries
- **Full Scraping**: Can complete all 20 queries multiple times

### **Sample Output**
```
🚀 Morocco Dentist Scraper Starting...

📋 Configuration:
   • API Keys: 3 available
   • Search Queries: 20 configured
   • Request Delay: 2000ms
   • Max Results per Query: 10

🔍 Starting scraping of 20 queries...

📊 Query 1/20: "dentiste+Casablanca"
────────────────────────────────────────────────────────────
   ✅ Found 8 relevant URLs
   ✅ Completed query "dentiste+Casablanca" - Scraped 8 URLs
   🔑 Using API key 1/3

📈 Final Scraping Summary:
   • Queries Processed: 20/20
   • Failed Queries: 0
   • Total URLs Found: 156
   • Total URLs Scraped: 142
   • URLs with Data: 89
   • Unique Emails Found: 45
   • Unique Phones Found: 67
   • Final Results: 67 rows

✅ Morocco Dentist Scraping completed successfully!
📁 Results saved to: morocco-dentists-results.csv
```

## 🔧 Troubleshooting

### **API Rate Limit (429 Error)**
**Solution**: Add more API keys to `env.config`
```bash
GOOGLE_API_KEY_1=YOUR_KEY_1
GOOGLE_API_KEY_2=YOUR_KEY_2
GOOGLE_API_KEY_3=YOUR_KEY_3
```

### **Invalid API Key Error**
**Solution**: Verify your API keys are correct and have Custom Search API enabled

### **Search Engine ID Error**
**Solution**: Verify your Search Engine ID from https://cse.google.com/

### **Network Errors**
**Solution**: Check internet connection and firewall settings

## 📁 Output Files

### **CSV Output** (`morocco-dentists-results.csv`)
```csv
Email,Phone
contact@example.com,+212612345678
info@company.com,+212712345678
```

### **Excel Output** (`morocco-dentists-results.xlsx`)
Same data in Excel format

## 🎯 Usage Scenarios

### **Scenario 1: Testing**
```bash
npm test
```

### **Scenario 2: Production (with multiple API keys)**
```bash
npm start
```

### **Scenario 3: Custom Queries**
```bash
node index.js --queries "dentiste+Marrakech,clinique+Rabat"
```

### **Scenario 4: Direct URLs**
```bash
node index-direct-urls.js --input your-urls.json
```

## ⚡ Performance Tips

1. **Use Multiple API Keys**: 3-5 keys recommended
2. **Monitor Quotas**: Check Google Cloud Console for usage
3. **Adjust Delays**: Increase `REQUEST_DELAY` if hitting rate limits
4. **Run During Off-Peak**: Better success rates during low-traffic hours

## 🔄 Fallback System

The scraper automatically:
- Rotates between API keys when quota is exceeded
- Continues processing with next available key
- Logs key rotation for monitoring
- Handles errors gracefully without stopping

## 📈 Monitoring

Watch for these indicators:
- `🔑 Using API key X/Y` - Shows current key usage
- `🔄 Rotating to API key X/Y` - Shows key rotation
- `⚠️ API quota exceeded` - Indicates need for more keys

## 🎉 Success!

Once configured, you can run:
```bash
npm start
```

And get comprehensive dentist contact data from across Morocco! 