import { config } from '../config.js';

/**
 * Smart content validator to ensure scraped data matches the target niche
 * Only filters out platform/support contacts, allows legitimate business contacts
 */
export class ContentValidator {
  constructor(targetNiche) {
    this.targetNiche = targetNiche.toLowerCase();
    this.nicheKeywords = this.extractNicheKeywords();
    this.businessType = this.detectBusinessType();
    this.platformPatterns = this.getPlatformPatterns();
  }

  /**
   * Extract relevant keywords from the target niche
   */
  extractNicheKeywords() {
    const keywords = [];
    
    // Extract business type keywords
    const businessTypes = [
      'dentist', 'lawyer', 'architect', 'developer', 'designer', 'consultant',
      'restaurant', 'hotel', 'cafe', 'salon', 'spa', 'gym', 'clinic', 'pharmacy',
      'accountant', 'engineer', 'contractor', 'plumber', 'electrician', 'mechanic',
      'photographer', 'translator', 'interpreter', 'tutor', 'trainer', 'coach',
      'agency', 'company', 'firm', 'studio', 'bureau', 'office'
    ];

    // Extract location keywords
    const locations = [
      'casablanca', 'rabat', 'marrakech', 'fes', 'agadir', 'tanger', 'meknes',
      'oujda', 'tetouan', 'eljadida', 'safi', 'kenitra', 'temara', 'morocco', 'maroc'
    ];

    // Check if target niche contains any of these keywords
    for (const type of businessTypes) {
      if (this.targetNiche.includes(type)) {
        keywords.push(type);
      }
    }

    for (const location of locations) {
      if (this.targetNiche.includes(location)) {
        keywords.push(location);
      }
    }

    return keywords;
  }

  /**
   * Detect the type of business being targeted
   */
  detectBusinessType() {
    const businessTypes = {
      'healthcare': ['dentist', 'doctor', 'pharmacy', 'clinic', 'hospital', 'medical'],
      'professional': ['lawyer', 'accountant', 'architect', 'consultant', 'engineer'],
      'technology': ['developer', 'programmer', 'designer', 'it', 'software', 'web', 'agency'],
      'hospitality': ['restaurant', 'hotel', 'cafe', 'catering'],
      'retail': ['shop', 'store', 'boutique', 'salon', 'spa'],
      'services': ['plumber', 'electrician', 'mechanic', 'cleaner', 'photographer']
    };

    for (const [type, keywords] of Object.entries(businessTypes)) {
      for (const keyword of keywords) {
        if (this.targetNiche.includes(keyword)) {
          return type;
        }
      }
    }

    return 'general';
  }

  /**
   * Get patterns that indicate platform/support contacts (not business contacts)
   * Only filters out obvious platform support, allows legitimate business contacts
   */
  getPlatformPatterns() {
    return {
      // Platform support contacts (only very obvious ones)
      platform_support: [
        /support@linkedin\.com/i, /help@facebook\.com/i, /support@twitter\.com/i,
        /support@instagram\.com/i, /support@youtube\.com/i, /support@google\.com/i,
        /support@microsoft\.com/i, /support@apple\.com/i, /support@amazon\.com/i,
        /help@linkedin\.com/i, /help@facebook\.com/i, /help@twitter\.com/i,
        /help@instagram\.com/i, /help@youtube\.com/i, /help@google\.com/i,
        /noreply@linkedin\.com/i, /noreply@facebook\.com/i, /noreply@twitter\.com/i,
        /no-reply@linkedin\.com/i, /no-reply@facebook\.com/i, /no-reply@twitter\.com/i
      ],

      // Platform domains (only major social platforms, not business websites)
      platform_domains: [
        /linkedin\.com/i, /facebook\.com/i, /twitter\.com/i, /instagram\.com/i,
        /youtube\.com/i, /tiktok\.com/i, /snapchat\.com/i, /pinterest\.com/i
      ],

      // Platform-specific content (only obvious support pages)
      platform_content: [
        /help center|support center|contact us|help desk/i,
        /how to use|tutorial|guide|faq|frequently asked/i,
        /terms of service|privacy policy|cookie policy/i,
        /sign up|sign in|login|register|create account/i
      ],

      // Institutional/Educational content that should be filtered out
      institutional_patterns: [
        /universit[ée]/i, /facult[ée]/i, /école/i, /institut/i, /académie/i,
        /centre de formation/i, /formation professionnelle/i, /enseignement/i,
        /étudiant/i, /professeur/i, /chercheur/i, /thèse/i, /mémoire/i,
        /concours/i, /admission/i, /inscription/i, /scolarité/i,
        /campus/i, /département/i, /division/i, /bureau/i, /service/i,
        /agence/i, /autorité/i, /conseil/i, /fondation/i, /association/i,
        /société/i, /organisation/i, /corporation/i, /ministère/i,
        /administration/i, /fonctionnaire/i, /mairie/i, /préfecture/i,
        /commune/i, /wilaya/i, /province/i, /gouvernement/i, /état/i
      ],
      
      // Government/Administrative content
      government_patterns: [
        /ministère/i, /administration/i, /service public/i, /fonctionnaire/i,
        /mairie/i, /préfecture/i, /commune/i, /wilaya/i, /province/i,
        /gouvernement/i, /état/i, /république/i, /royaume/i, /constitution/i,
        /loi/i, /décret/i, /arrêté/i, /règlement/i, /procédure/i,
        /bureaucratie/i, /appareil d'état/i, /institution publique/i
      ],

      // Educational content (only obvious educational institutions)
      educational: [
        /university|college|school|academy|institute|education/i,
        /course|training|learning|student|teacher|professor/i,
        /curriculum|syllabus|lesson|assignment|homework/i
      ],

      // Recruitment content (only obvious job boards)
      recruitment: [
        /job board|career site|employment|hiring|recruitment/i,
        /apply now|job application|resume|cv|career opportunity/i,
        /job posting|vacancy|position|opening|opportunity/i
      ]
    };
  }

  /**
   * Smart content validation - only rejects obvious platform/support contacts
   */
  validateContent(html, url) {
    const content = (html + ' ' + url).toLowerCase();
    let score = 0;
    let reasons = [];
    let warnings = [];

    // 1. Check for target niche keywords (positive scoring)
    for (const keyword of this.nicheKeywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += matches.length * 2;
        reasons.push(`Found target keyword: "${keyword}" (${matches.length} times)`);
      }
    }

    // 2. Check for business indicators (positive scoring)
    const businessIndicators = [
      /cabinet/i, /clinique/i, /centre/i, /bureau/i, /office/i, /société/i,
      /entreprise/i, /company/i, /business/i, /professionnel/i, /expert/i,
      /consultation/i, /services/i, /nos services/i, /nos prestations/i,
      /contact/i, /about/i, /team/i, /équipe/i, /staff/i, /agency/i, /studio/i
    ];

    for (const indicator of businessIndicators) {
      if (indicator.test(content)) {
        score += 3;
        reasons.push('Found business indicator');
        break;
      }
    }

    // 3. Check for obvious platform/support patterns (negative scoring)
    for (const [category, patterns] of Object.entries(this.platformPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          score -= 2; // Very small penalty for platform contacts
          reasons.push(`Excluded: ${category} pattern detected`);
          warnings.push(`Platform/support contact detected`);
          break;
        }
      }
    }

    // 4. Check for institutional/government patterns (stronger negative scoring)
    const institutionalPatterns = this.platformPatterns.institutional_patterns || [];
    const governmentPatterns = this.platformPatterns.government_patterns || [];
    
    for (const pattern of institutionalPatterns) {
      if (pattern.test(content)) {
        score -= 5; // Stronger penalty for institutional content
        reasons.push('Excluded: Institutional/educational content detected');
        warnings.push('Institutional contact detected');
        break;
      }
    }
    
    for (const pattern of governmentPatterns) {
      if (pattern.test(content)) {
        score -= 5; // Stronger penalty for government content
        reasons.push('Excluded: Government/administrative content detected');
        warnings.push('Government contact detected');
        break;
      }
    }

    // 5. Business type specific validation (gentle)
    const businessTypeValidation = this.validateBusinessTypeMatch(content);
    if (businessTypeValidation.score !== 0) {
      score += businessTypeValidation.score;
      reasons.push(...businessTypeValidation.reasons);
    }

    // 6. URL-specific validation (gentle)
    const urlValidation = this.validateUrl(url);
    if (urlValidation.score !== 0) {
      score += urlValidation.score;
      reasons.push(...urlValidation.reasons);
    }

    // Very permissive threshold - allow almost all content except obvious spam
    const isRelevant = score >= -20; // Allow most content, only reject very obvious spam/platform contacts
    const confidence = Math.max(0, Math.min(100, score + 50));

    return {
      isRelevant,
      score,
      confidence,
      reasons,
      warnings,
      targetKeywords: this.nicheKeywords,
      businessType: this.businessType
    };
  }

  /**
   * Validate LinkedIn profile relevance
   * @param {Object} profile - LinkedIn profile object
   * @param {string} niche - Target niche
   * @returns {Object} Validation result
   */
  validateLinkedInProfile(profile, niche) {
    const content = (profile.fullName + ' ' + profile.bioTags + ' ' + profile.title + ' ' + profile.snippet).toLowerCase();
    let score = 0;
    let reasons = [];

    // Check for target niche keywords
    for (const keyword of this.nicheKeywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += matches.length * 3;
        reasons.push(`Found target keyword: "${keyword}" (${matches.length} times)`);
      }
    }

    // Check for professional indicators
    const professionalIndicators = [
      /ceo|director|manager|founder|owner|president|executive/i,
      /senior|lead|principal|head of|chief/i,
      /experience|expert|specialist|consultant/i,
      /years|experience|background|skills/i
    ];

    for (const indicator of professionalIndicators) {
      if (indicator.test(content)) {
        score += 2;
        reasons.push('Found professional indicator');
        break;
      }
    }

    // Check for business type match
    const businessTypeValidation = this.validateBusinessTypeMatch(content);
    if (businessTypeValidation.score !== 0) {
      score += businessTypeValidation.score;
      reasons.push(...businessTypeValidation.reasons);
    }

    // Check for location relevance
    const locationKeywords = [
      'casablanca', 'rabat', 'marrakech', 'fes', 'agadir', 'tanger', 'meknes',
      'oujda', 'tetouan', 'eljadida', 'safi', 'kenitra', 'temara', 'morocco', 'maroc'
    ];

    for (const location of locationKeywords) {
      if (content.includes(location)) {
        score += 2;
        reasons.push(`Found location: ${location}`);
        break;
      }
    }

    const isRelevant = score >= 2; // Require at least some relevance for LinkedIn
    const confidence = Math.max(0, Math.min(100, score + 50));

    return {
      isRelevant,
      score,
      confidence,
      reasons,
      targetKeywords: this.nicheKeywords
    };
  }

  /**
   * Validate Google Maps business relevance
   * @param {Object} business - Google Maps business object
   * @param {string} niche - Target niche
   * @returns {Object} Validation result
   */
  validateGoogleMapsBusiness(business, niche) {
    const content = (business.name + ' ' + business.title + ' ' + business.snippet).toLowerCase();
    let score = 0;
    let reasons = [];

    // Check for target niche keywords
    for (const keyword of this.nicheKeywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += matches.length * 3;
        reasons.push(`Found target keyword: "${keyword}" (${matches.length} times)`);
      }
    }

    // Check for business indicators
    const businessIndicators = [
      /cabinet|clinique|centre|bureau|office|société|entreprise|company|business/i,
      /services|consultation|expert|professionnel|specialist/i,
      /contact|about|team|équipe|staff|agency|studio/i
    ];

    for (const indicator of businessIndicators) {
      if (indicator.test(content)) {
        score += 2;
        reasons.push('Found business indicator');
        break;
      }
    }

    // Check for business type match
    const businessTypeValidation = this.validateBusinessTypeMatch(content);
    if (businessTypeValidation.score !== 0) {
      score += businessTypeValidation.score;
      reasons.push(...businessTypeValidation.reasons);
    }

    // Check for location relevance
    const locationKeywords = [
      'casablanca', 'rabat', 'marrakech', 'fes', 'agadir', 'tanger', 'meknes',
      'oujda', 'tetouan', 'eljadida', 'safi', 'kenitra', 'temara', 'morocco', 'maroc'
    ];

    for (const location of locationKeywords) {
      if (content.includes(location)) {
        score += 2;
        reasons.push(`Found location: ${location}`);
        break;
      }
    }

    // Bonus for having contact information
    if (business.phone || business.email) {
      score += 1;
      reasons.push('Has contact information');
    }

    const isRelevant = score >= 1; // Require at least some relevance for Google Maps
    const confidence = Math.max(0, Math.min(100, score + 50));

    return {
      isRelevant,
      score,
      confidence,
      reasons,
      targetKeywords: this.nicheKeywords
    };
  }

  /**
   * Gentle business type validation
   */
  validateBusinessTypeMatch(content) {
    let score = 0;
    let reasons = [];

    switch (this.businessType) {
      case 'healthcare':
        if (/dentist|dental|orthodontist|endodontist|periodontist/i.test(content)) {
          score += 5;
          reasons.push('Healthcare business type confirmed');
        }
        break;

      case 'professional':
        if (/lawyer|attorney|legal|law firm|avocat/i.test(content)) {
          score += 5;
          reasons.push('Professional services confirmed');
        }
        break;

      case 'technology':
        if (/developer|programmer|software|web|it|technology|agency|studio/i.test(content)) {
          score += 5;
          reasons.push('Technology business type confirmed');
        }
        break;

      case 'hospitality':
        if (/restaurant|hotel|cafe|catering|food|dining/i.test(content)) {
          score += 5;
          reasons.push('Hospitality business type confirmed');
        }
        break;
    }

    return { score, reasons };
  }

  /**
   * Gentle URL validation
   */
  validateUrl(url) {
    let score = 0;
    let reasons = [];

    const urlLower = url.toLowerCase();

    // Only check for obvious social platform domains (not business websites)
    const platformDomains = [
      'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
      'youtube.com', 'tiktok.com', 'snapchat.com', 'pinterest.com'
    ];

    for (const domain of platformDomains) {
      if (urlLower.includes(domain)) {
        score -= 3; // Very light penalty for social platform domains
        reasons.push(`Platform domain detected: ${domain}`);
        break;
      }
    }

    // Check for business indicators in URL (positive)
    const businessUrlPatterns = [
      /contact/i, /about/i, /services/i, /cabinet/i, /clinique/i,
      /centre/i, /bureau/i, /office/i, /société/i, /entreprise/i, /agency/i
    ];

    for (const pattern of businessUrlPatterns) {
      if (pattern.test(urlLower)) {
        score += 3;
        reasons.push('Business indicator found in URL');
        break;
      }
    }

    return { score, reasons };
  }

  /**
   * Smart contact data validation - only reject obvious platform contacts
   */
  validateContactData(emails, phones, url) {
    const validEmails = [];
    const validPhones = [];
    const rejectedEmails = [];
    const rejectedPhones = [];

    // Validate emails with gentle filtering
    for (const email of emails) {
      const emailValidation = this.validateEmailSmart(email, url);
      if (emailValidation.isValid) {
        validEmails.push(email);
      } else {
        rejectedEmails.push({ email, reason: emailValidation.reason });
      }
    }

    // Validate phones with gentle filtering
    for (const phone of phones) {
      const phoneValidation = this.validatePhoneSmart(phone, url);
      if (phoneValidation.isValid) {
        validPhones.push(phone);
      } else {
        rejectedPhones.push({ phone, reason: phoneValidation.reason });
      }
    }

    return {
      validEmails,
      validPhones,
      rejectedEmails,
      rejectedPhones,
      totalValid: validEmails.length + validPhones.length,
      totalRejected: rejectedEmails.length + rejectedPhones.length
    };
  }

  /**
   * Smart email validation - reject platform contacts, institutional, and fake emails
   */
  validateEmailSmart(email, url) {
    if (!email || !email.includes('@')) {
      return { isValid: false, reason: 'Invalid email format - missing @ symbol' };
    }
    
    const domain = email.split('@')[1];
    if (!domain) {
      return { isValid: false, reason: 'Invalid email format - no domain found' };
    }
    
    // Reject obvious platform/support domains
    const platformDomains = [
      'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
      'youtube.com', 'google.com', 'microsoft.com', 'apple.com',
      'amazon.com', 'ebay.com', 'shopify.com', 'wordpress.com'
    ];

    for (const platformDomain of platformDomains) {
      if (domain.includes(platformDomain)) {
        return { isValid: false, reason: `Platform domain detected: ${platformDomain}` };
      }
    }

    // Reject obvious support emails from platforms
    const supportPatterns = [
      /^support@linkedin\.com/i, /^help@facebook\.com/i, /^support@twitter\.com/i,
      /^support@instagram\.com/i, /^support@youtube\.com/i, /^support@google\.com/i,
      /^noreply@linkedin\.com/i, /^noreply@facebook\.com/i, /^noreply@twitter\.com/i
    ];

    for (const pattern of supportPatterns) {
      if (pattern.test(email)) {
        return { isValid: false, reason: 'Platform support email detected' };
      }
    }

    // Reject fake/example email domains
    const fakeDomains = [
      'example.com', 'domain.com', 'email.com', 'hosting.com',
      'test.com', 'demo.com', 'sample.com', 'placeholder.com', 'temporary.com',
      'fake.com', 'dummy.com', 'invalid.com', 'nonexistent.com'
    ];

    for (const fakeDomain of fakeDomains) {
      if (domain === fakeDomain) {
        return { isValid: false, reason: `Fake/example domain detected: ${fakeDomain}` };
      }
    }

    // Reject institutional/educational domains (Morocco and common ones)
    const institutionalDomains = [
      'um6p.ma', 'um6ss.ma', 'um5.ma', 'um6.ma', 'um7.ma', 'um8.ma',
      'ofppt.ma', 'ens.ma', 'enam.ma', 'ena.ma', 'inpt.ma', 'emi.ma',
      'esith.ma', 'esca.ma', 'escaa.ma', 'uca.ma', 'ucam.ma', 'ucd.ma',
      'ucm.ma', 'ucf.ma', 'ucg.ma', 'edu.ma', 'ac.ma', 'gov.ma',
      'gouv.ma', 'ma.ma', 'ma.gov.ma', 'ma.gouv.ma'
    ];

    for (const institutionalDomain of institutionalDomains) {
      if (domain === institutionalDomain) {
        return { isValid: false, reason: `Institutional domain detected: ${institutionalDomain}` };
      }
    }

    // Reject common educational/institutional patterns worldwide
    const institutionalPatterns = [
      'edu', 'ac', 'school', 'college', 'university', 'institute', 'academy',
      'campus', 'faculty', 'department', 'division', 'bureau', 'office',
      'ministry', 'administration', 'service', 'agency', 'authority', 'council',
      'foundation', 'association', 'society', 'organization', 'corporation'
    ];

    for (const pattern of institutionalPatterns) {
      // Check if the domain contains the pattern as a whole word or part
      // This is more precise than just includes() to avoid false positives
      const domainParts = domain.split('.');
      const hasInstitutionalPattern = domainParts.some(part => 
        part.toLowerCase() === pattern.toLowerCase() || 
        part.toLowerCase().startsWith(pattern.toLowerCase())
      );
      
      if (hasInstitutionalPattern) {
        return { isValid: false, reason: `Institutional pattern detected: ${pattern}` };
      }
    }

    // Reject suspicious email patterns
    const suspiciousPatterns = [
      /^[0-9]+@/, // Email starting with numbers only
      /@[0-9]+\.[a-zA-Z]+$/, // Domain with only numbers
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{1}$/, // Single letter TLD
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\.[a-zA-Z]{2,}$/, // Double TLD
      /^test@/, /^demo@/, /^sample@/, /^example@/, /^fake@/, /^dummy@/,
      /^admin@/, /^root@/, /^webmaster@/, /^info@/, /^contact@/, /^hello@/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        return { isValid: false, reason: `Suspicious email pattern detected: ${email}` };
      }
    }

    // Allow most business emails
    return { isValid: true, reason: 'Valid business email' };
  }

  /**
   * Smart phone validation - be more permissive
   */
  validatePhoneSmart(phone, url) {
    // Accept various Moroccan formats
    const moroccanPatterns = [
      /^\+212[67]\d{8}$/, // +2126XXXXXXXX or +2127XXXXXXXX
      /^0[67]\d{8}$/, // 06XXXXXXXX or 07XXXXXXXX
      /^212[67]\d{8}$/ // 2126XXXXXXXX or 2127XXXXXXXX
    ];

    for (const pattern of moroccanPatterns) {
      if (pattern.test(phone)) {
        return { isValid: true, reason: 'Valid Moroccan phone number' };
      }
    }

    // Check for suspicious patterns (only obvious ones)
    const suspiciousPatterns = [
      /0000000000/, /1111111111/, /1234567890/, /9999999999/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(phone)) {
        return { isValid: false, reason: 'Suspicious phone pattern detected' };
      }
    }

    // Be more permissive - accept most phone numbers
    return { isValid: true, reason: 'Valid phone number' };
  }
} 