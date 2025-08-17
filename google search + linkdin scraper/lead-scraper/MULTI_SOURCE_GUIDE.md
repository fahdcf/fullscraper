# 🎯 Multi-Source Web Scraper Guide

## Overview

Your web scraper now supports **multiple data sources** for comprehensive lead generation:

1. **🌐 Google Search** - Business websites and contact information
2. **👥 LinkedIn** - Professional profiles and networking data  
3. **🔄 All Sources** - Combined comprehensive search

## 🚀 Quick Start

### Run Test Mode
```bash
npm run test
```

### Available Data Sources

When you run the test, you'll see these options:

```
📊 Available Data Sources:
────────────────────────────────────────────────────────────
1. Google Search (Business Websites)
   • Scrapes business websites
   • Extracts emails and phone numbers
   • Content validation enabled

2. LinkedIn (Professional Profiles)
   • Searches LinkedIn profiles
   • Extracts: Full Name, Profile URL, Bio
   • Professional networking data

3. All Sources (Combined)
   • Runs both Google Search and LinkedIn
   • Comprehensive lead generation
   • Multiple data formats
```

## 📊 Data Source Details

### 1. Google Search (Websites)
**Best for:** General business contact information
- **Extracts:** Email addresses, Phone numbers
- **Format:** CSV with Email, Phone columns
- **Validation:** Content validation to filter irrelevant data
- **Use case:** Finding business contact information from websites

### 2. LinkedIn Profiles
**Best for:** Professional networking and decision-makers
- **Extracts:** Full Name, Profile URL, Bio
- **Format:** CSV with Full Name, Profile URL, Bio columns
- **Validation:** Professional relevance and location matching
- **Use case:** Finding key decision-makers and professionals in your niche

### 3. All Sources (Combined)
**Best for:** Comprehensive lead generation
- **Extracts:** All data from above sources
- **Format:** CSV with combined results
- **Validation:** Source-specific validation rules
- **Use case:** Maximum coverage and diverse lead types

## 🎯 Usage Examples

### Example 1: Website Developers
```bash
npm run test
# Enter niche: "website developers in Casablanca"
# Select: 1 (Google Search)
# Result: CSV with emails and phones from developer websites
```

### Example 2: LinkedIn Professionals
```bash
npm run test
# Enter niche: "marketing managers Morocco"
# Select: 2 (LinkedIn)
# Result: CSV with professional profiles and contact info
```

### Example 3: Comprehensive Search
```bash
npm run test
# Enter niche: "dentists Casablanca"
# Select: 3 (All Sources)
# Result: Combined results from websites and LinkedIn profiles
```

## 🔧 Advanced Configuration

### Data Source Selection
The test scraper allows you to choose your data source:

1. **Google Search**: Best for finding business contact information
2. **LinkedIn**: Best for finding professional decision-makers
3. **All Sources**: Best for comprehensive lead generation

### Query Generation
Each data source uses AI-powered query generation:
- **Google Search**: Generates queries to find business websites
- **LinkedIn**: Generates queries to find professional profiles
- **All Sources**: Generates queries for both sources

## 📈 Results Format

### Google Search Results
```csv
Email,Phone
contact@example.com,+212612345678
info@company.com,+212712345678
```

### LinkedIn Results
```csv
full_name,profile_url,bio
John Doe,https://linkedin.com/in/johndoe,Marketing Manager at ABC Company
Jane Smith,https://linkedin.com/in/janesmith,Web Developer specializing in React
```

### All Sources Results
Combined CSV with source identification:
```csv
Email,Phone,Source
contact@example.com,+212612345678,Google Search
,https://linkedin.com/in/johndoe,LinkedIn
```

## 🎯 Best Practices

### Choosing the Right Data Source

1. **Use Google Search when:**
   - You need business contact information
   - You're targeting companies and agencies
   - You want email addresses and phone numbers

2. **Use LinkedIn when:**
   - You need to find decision-makers
   - You're targeting individual professionals
   - You want professional networking data

3. **Use All Sources when:**
   - You want maximum coverage
   - You're doing comprehensive lead generation
   - You need both business and professional data

### Query Optimization

- **Be specific**: "web developers Casablanca" vs "developers"
- **Include location**: Always specify the city or region
- **Use industry terms**: "digital marketing agency" vs "marketing"
- **Test different sources**: Try both Google Search and LinkedIn for the same niche

## 🚀 Performance Tips

1. **Start with test mode**: Use `npm run test` to test with limited queries
2. **Choose the right source**: Match your data source to your target audience
3. **Validate results**: Check the output quality and adjust queries if needed
4. **Use content validation**: The system automatically filters irrelevant results

## 📊 Success Metrics

### Google Search Success Indicators
- High number of valid email addresses
- Moroccan phone numbers (+212 format)
- Business-relevant websites

### LinkedIn Success Indicators
- Professional profile matches
- Relevant job titles and companies
- Location-specific results

### All Sources Success Indicators
- Diverse lead types (business + professional)
- High coverage of your target market
- Quality contact information from multiple sources

## 🔧 Troubleshooting

### Common Issues

1. **No results from Google Search**
   - Try more specific queries
   - Check if your niche has online presence
   - Verify API key quotas

2. **No LinkedIn profiles found**
   - LinkedIn profiles may be private
   - Try different professional titles
   - Check location specificity

3. **Low quality results**
   - Enable content validation
   - Use more specific niche terms
   - Filter results manually

### Getting Better Results

1. **Refine your niche**: Be more specific about your target
2. **Test different sources**: Try both Google Search and LinkedIn
3. **Use location**: Always include city or region
4. **Validate manually**: Check a sample of results for quality

## 📈 Advanced Usage

### Custom Query Testing
```bash
# Test specific queries
node test-scraper.js
# Enter your niche
# Select data source
# Review generated queries
```

### Batch Processing
```bash
# Run multiple niches
npm run test  # Niche 1
npm run test  # Niche 2
npm run test  # Niche 3
```

### Data Analysis
- Export results to CSV
- Analyze source effectiveness
- Track conversion rates
- Refine your approach

## 🎯 Conclusion

The multi-source scraper provides comprehensive lead generation capabilities:

- **Google Search**: Business contact information
- **LinkedIn**: Professional networking data
- **All Sources**: Maximum coverage and diversity

Choose the right data source for your specific needs and use the test mode to validate your approach before running full-scale scraping operations. 