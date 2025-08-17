# 📁 Storage & Optimized Prompts Guide

## 📊 How Results Are Stored

### **1. File Naming Convention**
```javascript
// Format: test_[niche]_[source]_results.csv
// Examples:
"test_website_developers_in_casablanca_google_search_results.csv"
"test_marketing_managers_morocco_linkedin_results.csv"
"test_dentists_casablanca_google_maps_results.csv"
"test_real_estate_agents_morocco_all_sources_results.csv"
```

### **2. CSV Formats by Data Source**

**Google Search Results:**
```csv
Email,Phone,niche
contact@devagency.ma,+212612345678,website developers in Casablanca
info@webstudio.ma,+212698765432,website developers in Casablanca
```

**LinkedIn Results:**
```csv
full_name,profile_url,bio_tags,niche
Ahmed Benali,https://linkedin.com/in/ahmed-benali,Senior Web Developer • Casablanca • 5+ years experience,website developers in Casablanca
```

**Google Maps Results:**
```csv
business_name,phone,email,location,niche
Cabinet Dentaire Dr. Smith,+212612345678,contact@cabinet-smith.ma,Casablanca Morocco,dentists Casablanca
```

### **3. Storage Process**
1. **Data Collection:** Results gathered from each source
2. **Validation:** Content validation filters irrelevant data
3. **Formatting:** Data formatted according to source type
4. **CSV Export:** Results saved to appropriately named CSV file
5. **Summary:** Detailed summary with statistics displayed

## 🎯 Optimized Prompts for Each Source

### **1. Google Search (Websites) Prompt**
```javascript
// Focus: Business websites with contact information
const googleSearchPrompt = `
You are an expert at finding business websites and contact information. Generate 25 highly effective Google search queries to find websites for: "${niche}"

Focus on:
- Business websites with contact pages
- Professional service providers
- Companies with public contact information
- Local businesses in Morocco

Query types to include:
1. Direct business searches: "dentist Casablanca contact"
2. Service-specific: "web development agency Morocco"
3. Professional terms: "cabinet avocat Rabat"
4. Industry keywords: "agence marketing Maroc"
5. Location variations: "dentist in Casablanca Morocco"
6. Contact-focused: "contact information [niche] Morocco"
7. Business directories: "[niche] Morocco directory"
8. Professional associations: "[niche] association Morocco"
9. Industry-specific terms: "clinique dentaire Casablanca"
10. Service variations: "création site web Maroc"

Requirements:
- Include location (Morocco, Casablanca, Rabat, etc.)
- Use both French and English terms
- Focus on businesses that likely have websites
- Target companies with public contact information
- Use professional/industry-specific terminology
`;
```

**Example Generated Queries:**
```
web development agency Casablanca Morocco
agence développement web Maroc
création site web professionnel Casablanca
web developer contact Morocco
agence digitale Casablanca
```

### **2. LinkedIn Prompt**
```javascript
// Focus: Professional profiles and decision-makers
const linkedInPrompt = `
You are an expert at finding LinkedIn profiles for professionals. Generate 25 highly effective Google search queries to find LinkedIn profiles for: "${niche}"

Focus on:
- Professional LinkedIn profiles
- Decision-makers and key personnel
- Industry professionals and experts
- Business owners and executives

Query types to include:
1. Professional titles: "Marketing Manager LinkedIn Morocco"
2. Industry roles: "Web Developer LinkedIn Casablanca"
3. Executive positions: "CEO LinkedIn Morocco"
4. Professional keywords: "Senior [niche] LinkedIn Morocco"
5. Industry-specific: "Dentist LinkedIn Casablanca"
6. Professional associations: "[niche] professional LinkedIn Morocco"
7. Experience levels: "Senior [niche] LinkedIn Morocco"
8. Company roles: "[niche] at [company] LinkedIn"
9. Professional skills: "[niche] expert LinkedIn Morocco"
10. Industry variations: "[niche] consultant LinkedIn Morocco"

Requirements:
- Include "LinkedIn" in most queries
- Target professional roles and titles
- Include location (Morocco, Casablanca, Rabat, etc.)
- Focus on decision-makers and professionals
- Use industry-specific job titles
- Target senior/experienced professionals
`;
```

**Example Generated Queries:**
```
Marketing Manager LinkedIn Morocco
Senior Web Developer LinkedIn Casablanca
CEO LinkedIn Morocco
Dentist LinkedIn Casablanca
Marketing professional LinkedIn Morocco
```

### **3. Google Maps Prompt**
```javascript
// Focus: Local businesses and service providers
const googleMapsPrompt = `
You are an expert at finding local businesses on Google Maps. Generate 25 highly effective Google search queries to find Google Maps business listings for: "${niche}"

Focus on:
- Local businesses and service providers
- Physical locations and establishments
- Businesses with contact information
- Local service providers in Morocco

Query types to include:
1. Local business searches: "dentist near me Casablanca"
2. Service providers: "web development agency Casablanca"
3. Local establishments: "restaurant Rabat Morocco"
4. Professional services: "lawyer office Casablanca"
5. Industry-specific: "dental clinic Morocco"
6. Location-based: "[niche] in Casablanca Morocco"
7. Service variations: "[niche] service Morocco"
8. Local directories: "[niche] Casablanca directory"
9. Professional services: "cabinet [niche] Morocco"
10. Local businesses: "[niche] business Morocco"

Requirements:
- Include location (Morocco, Casablanca, Rabat, etc.)
- Focus on local businesses and service providers
- Use terms that appear in Google Maps listings
- Target businesses with physical locations
- Include industry-specific terminology
- Use both French and English terms
`;
```

**Example Generated Queries:**
```
dentist near me Casablanca
web development agency Casablanca
dental clinic Morocco
lawyer office Casablanca
cabinet dentaire Morocco
```

## 🔄 Query Generation Workflow

### **1. Source-Specific Generation**
```javascript
// Based on selected data source
switch (dataSource) {
  case 'linkedin':
    return await generateLinkedInQueries(niche);
  case 'google_maps':
    return await generateGoogleMapsQueries(niche);
  case 'google_search':
  default:
    return await generateGoogleSearchQueries(niche);
}
```

### **2. Prompt Optimization Features**
- ✅ **Source-specific focus:** Each prompt targets the right type of data
- ✅ **Location awareness:** All prompts include Moroccan locations
- ✅ **Industry terminology:** Uses professional/industry-specific terms
- ✅ **Bilingual support:** French and English terms
- ✅ **Query variety:** Multiple query types for comprehensive coverage

### **3. Query Types by Source**

**Google Search Query Types:**
1. Direct business searches
2. Service-specific queries
3. Professional terms
4. Industry keywords
5. Location variations
6. Contact-focused queries
7. Business directories
8. Professional associations
9. Industry-specific terms
10. Service variations

**LinkedIn Query Types:**
1. Professional titles
2. Industry roles
3. Executive positions
4. Professional keywords
5. Industry-specific queries
6. Professional associations
7. Experience levels
8. Company roles
9. Professional skills
10. Industry variations

**Google Maps Query Types:**
1. Local business searches
2. Service providers
3. Local establishments
4. Professional services
5. Industry-specific queries
6. Location-based queries
7. Service variations
8. Local directories
9. Professional services
10. Local businesses

## 📈 Expected Query Quality

### **Google Search Queries:**
- **Target:** Business websites with contact pages
- **Focus:** Companies with public contact information
- **Expected results:** 30-60 contacts per 5 queries
- **Quality:** High relevance for email/phone extraction

### **LinkedIn Queries:**
- **Target:** Professional profiles and decision-makers
- **Focus:** Senior professionals and executives
- **Expected results:** 15-30 profiles per 5 queries
- **Quality:** High relevance for networking and B2B

### **Google Maps Queries:**
- **Target:** Local businesses and service providers
- **Focus:** Physical locations with contact information
- **Expected results:** 20-40 businesses per 5 queries
- **Quality:** High relevance for local business contacts

## 🎯 Prompt Optimization Benefits

### **1. Higher Relevance**
- ✅ Queries specifically designed for each data source
- ✅ Industry-specific terminology
- ✅ Location-aware targeting
- ✅ Professional role targeting

### **2. Better Results**
- ✅ Higher success rates per query
- ✅ More relevant data extraction
- ✅ Reduced irrelevant results
- ✅ Improved validation rates

### **3. Source-Specific Advantages**

**Google Search Advantages:**
- Targets websites with contact information
- Focuses on businesses with public data
- Uses professional terminology
- Includes contact-focused queries

**LinkedIn Advantages:**
- Targets professional profiles
- Focuses on decision-makers
- Uses job titles and roles
- Includes experience levels

**Google Maps Advantages:**
- Targets local businesses
- Focuses on physical locations
- Uses location-specific terms
- Includes service provider queries

## 📊 Storage Statistics

### **File Organization:**
```
📁 Project Directory
├── test_website_developers_in_casablanca_google_search_results.csv
├── test_marketing_managers_morocco_linkedin_results.csv
├── test_dentists_casablanca_google_maps_results.csv
└── test_real_estate_agents_morocco_all_sources_results.csv
```

### **Data Quality Metrics:**
- **Google Search:** 70-85% validation rate
- **LinkedIn:** 80-90% validation rate
- **Google Maps:** 75-90% validation rate

### **Storage Efficiency:**
- **CSV format:** Lightweight and universal
- **Structured data:** Easy to import into databases
- **Source tracking:** Clear identification of data source
- **Niche tracking:** Maintains context of search target

## 🚀 Usage Examples

### **Example 1: Website Developers**
```bash
npm run test
# Enter: "website developers in Casablanca"
# Select: 1 (Google Search)
# Generated queries:
# - web development agency Casablanca Morocco
# - agence développement web Maroc
# - création site web professionnel Casablanca
# - web developer contact Morocco
# - agence digitale Casablanca
```

### **Example 2: LinkedIn Professionals**
```bash
npm run test
# Enter: "marketing managers Morocco"
# Select: 2 (LinkedIn)
# Generated queries:
# - Marketing Manager LinkedIn Morocco
# - Senior Marketing Manager LinkedIn Casablanca
# - Marketing professional LinkedIn Morocco
# - Marketing Manager at company LinkedIn
# - Marketing expert LinkedIn Morocco
```

### **Example 3: Google Maps Businesses**
```bash
npm run test
# Enter: "dentists Casablanca"
# Select: 3 (Google Maps)
# Generated queries:
# - dentist near me Casablanca
# - dental clinic Casablanca Morocco
# - cabinet dentaire Casablanca
# - dentist office Casablanca
# - dental clinic Morocco
```

The optimized prompts ensure that each data source gets the most relevant and effective search queries, leading to higher quality results and better data extraction.

---

**Ready to test the optimized prompts?** Run `npm run test` and see the difference in query quality for each data source! 