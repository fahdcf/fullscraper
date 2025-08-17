# 🔑 API Key Management Guide

## Easy API Key Management

The scraper now supports **unlimited API keys** and makes it super easy to add, replace, and manage them without touching any code!

## 🚀 Quick Start

### Method 1: Interactive Tool (Recommended)
```bash
npm run keys
```
This opens an interactive menu where you can:
- ✅ List all current API keys
- ✅ Add new API keys
- ✅ Replace existing API keys
- ✅ Remove API keys

### Method 2: Manual Editing
Simply edit the `env.config` file:
```bash
# Add your API keys here
GOOGLE_API_KEY_1=YOUR_FIRST_API_KEY
GOOGLE_API_KEY_2=YOUR_SECOND_API_KEY
GOOGLE_API_KEY_3=YOUR_THIRD_API_KEY
# ... add as many as you want!
```

## 📋 Supported Naming Patterns

The system automatically detects API keys with these patterns:

### Numbered Keys (Unlimited)
```
GOOGLE_API_KEY_1=your_key_here
GOOGLE_API_KEY_2=your_key_here
GOOGLE_API_KEY_3=your_key_here
...
GOOGLE_API_KEY_100=your_key_here  # No limit!
```

### Named Keys (Alternative)
```
GOOGLE_API_KEY_A=your_key_here
GOOGLE_API_KEY_B=your_key_here
GOOGLE_API_KEY_C=your_key_here
GOOGLE_API_KEY_PRIMARY=your_key_here
GOOGLE_API_KEY_SECONDARY=your_key_here
GOOGLE_API_KEY_BACKUP=your_key_here
GOOGLE_API_KEY_MAIN=your_key_here
GOOGLE_API_KEY_ALT1=your_key_here
GOOGLE_API_KEY_ALT2=your_key_here
```

## 🔄 How It Works

1. **Automatic Detection**: The system automatically finds all valid API keys
2. **Smart Rotation**: When one key hits its quota limit, it automatically switches to the next
3. **No Code Changes**: Just add/remove keys in `env.config` and restart the scraper
4. **Validation**: Only valid keys (longer than 20 characters) are used

## 💡 Pro Tips

### Adding Multiple Keys
```bash
# Run the management tool
npm run keys

# Choose option 2 to add keys
# The system will automatically find the next available slot
```

### Replacing Expired Keys
```bash
# Run the management tool
npm run keys

# Choose option 3 to replace keys
# Select the key to replace and enter the new one
```

### Checking Current Keys
```bash
# Run the management tool
npm run keys

# Choose option 1 to list all keys
# Shows how many keys are loaded and their status
```

## 🎯 Benefits

- ✅ **No Code Changes**: Just edit `env.config` or use the tool
- ✅ **Unlimited Keys**: Add as many as you need
- ✅ **Automatic Rotation**: Keys rotate when quotas are hit
- ✅ **Easy Management**: Interactive tool for all operations
- ✅ **Flexible Naming**: Use numbered or named keys
- ✅ **Validation**: Only valid keys are used

## 🚨 Important Notes

- **API Key Format**: Keys should be at least 20 characters long
- **Placeholder Keys**: Keys containing "YOUR_" or "PLACEHOLDER" are ignored
- **File Format**: Use the `env.config` file (not `.env`)
- **Restart Required**: After adding/removing keys, restart the scraper

## 🔧 Troubleshooting

### "No API keys found"
- Check that your `env.config` file exists
- Ensure keys are properly formatted: `GOOGLE_API_KEY_1=your_key_here`
- Make sure keys are at least 20 characters long

### "API quota exceeded"
- Add more API keys using `npm run keys`
- The system will automatically use the next available key

### "Invalid API key"
- Check that your Google API key is valid
- Ensure it has Custom Search API enabled
- Verify the key format is correct

## 📞 Support

If you need help with API key management:
1. Run `npm run keys` and use the interactive tool
2. Check the `env.config` file format
3. Ensure your Google API keys are valid and have Custom Search API enabled 