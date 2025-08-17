# Google Maps Business Scraper (Enhanced)

This Node.js application is an advanced scraper designed to extract comprehensive business information from Google Maps search results, including names, phone numbers, websites, emails, and addresses. It leverages the **Gemini AI API** for intelligent query generation and precise address selection.

## Features

- **Intelligent Query Generation**: Uses Gemini AI to generate diverse main and sub-queries for broader and more targeted search results.
- **Advanced Data Extraction**: Scrapes Google Maps for business names, phone numbers, and potential website URLs.
- **Deep Website Scraping**: Visits individual business websites to collect email addresses, including a fallback to contact pages.
- **Smart Address Selection**: Employs Gemini AI to analyze multiple address candidates and select the most accurate postal address.
- **Robust Data Processing**: Filters, deduplicates, and combines all extracted information into structured results.
- **Concurrency Control**: Manages multiple concurrent scraping tasks efficiently.
- **Configurable**: Easily adjust request settings, email blacklists, social media filters, and Gemini API settings.
- **Output**: Saves structured results to a JSON file and provides a detailed console summary with statistics.

## Installation

1.  Install dependencies:

    ```bash
    npm install
    ```

## Usage

### Enhanced Business Scraper (Recommended)

Run the `run.js` script with your business type and location query. You can also specify the maximum number of results per sub-query.

```bash
# Search for any business type in any city (e.g., "dentist in fes")
node run.js "dentiste fes"
node run.js "restaurant casablanca" 5   # Max 5 results per sub-query
node run.js "avocat rabat" 15           # Max 15 results per sub-query
node run.js "Concepteur de sites web fes"
node run.js "plombier marrakech" 10
```

**Parameters:**

-   `query` - A general query including business type and location (required, e.g., "dentiste fes")
-   `max_results_per_subquery` - Maximum number of businesses to find per generated sub-query (optional, default: 100)

### Basic Usage (Legacy)

```bash
npm start
```

This will run `index.js` with a default query. This mode does not utilize the Gemini AI enhancements.

### Programmatic Usage

You can also integrate the `FlexibleBusinessScraper` class into your own Node.js applications:

```javascript
const FlexibleBusinessScraper = require("./run.js");

const scraper = new FlexibleBusinessScraper();
scraper.scrapeBusinesses("dentiste", "fes", 20).then((results) => {
  console.log(results);
});
```

## How it Works

The scraper follows this enhanced workflow:

1.  **Query Orchestration**: The `run.js` script takes the initial query.
2.  **Main Query Generation**: Gemini AI generates 5 diverse main search queries.
3.  **Sub-Query Generation**: For each main query, Gemini AI generates 10 specific sub-queries (e.g., targeting neighborhoods).
4.  **Google Maps Scraping (Per Sub-Query)**: For each sub-query, the `MapsScraper` fetches search results from Google Maps.
5.  **Data Extraction**: Extracts business names, phone numbers, and website URLs from Google Maps data.
6.  **Website Scraping**: Visits each extracted website to find email addresses.
7.  **Address Selection (Batch with Gemini)**: Raw address candidates from Google Maps are sent in batches to Gemini AI for intelligent selection of the most accurate postal address.
8.  **Data Processing**: Filters, deduplicates, and combines all information from various stages.
9.  **Output**: Returns structured data with names, phone numbers, websites, emails, and selected addresses.

## Output Format

The scraper returns an array of business objects, which are also saved to `scraping_results.json`:

```javascript
[
  {
    name: "Business Name",
    phone: "+212 6XX XXX XXX",
    website: "https://www.business-website.com",
    emails: ["contact@business.com", "info@business.com"],
    location: "123 Main St, City, Postal Code, Country"
  },
  // ... more business objects
];
```

## Configuration

The `config.js` file allows you to customize various settings:

-   `requestSettings`: Adjust `timeout`, `delayBetweenRequests`, and `userAgent`.
-   `emailBlacklist`: Add or remove email patterns to be filtered out.
-   `socialMediaFilters`: Define patterns for social media URLs to ignore.
-   `phoneRegex`: Configure regular expressions for phone number extraction.
-   `output`: Control saving results to file.
-   `gemini`: Set your Gemini API key and endpoint.

## Notes

-   The scraper includes delays between requests to be respectful to servers and avoid rate limiting.
-   Email extraction filters out common non-business emails (no-reply, sentry, etc.) based on `emailBlacklist`.
-   Phone number regex is configured for Moroccan phone numbers by default but can be extended.
-   Results are automatically saved to `scraping_results.json`.
-   Concurrency is used for individual business searches to speed up the process.

## Legal Notice

Please ensure you comply with Google's Terms of Service and robots.txt when using this scraper. Use responsibly and consider rate limiting for large-scale operations.
