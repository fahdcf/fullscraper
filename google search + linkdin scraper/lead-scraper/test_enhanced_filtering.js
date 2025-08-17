#!/usr/bin/env node

import chalk from 'chalk';
import { extractEmails } from './helpers/extractEmails.js';
import { ContentValidator } from './helpers/contentValidator.js';

console.log(chalk.blue.bold('🧪 ENHANCED FILTERING TEST'));
console.log(chalk.gray('─'.repeat(50)));

// Test data with various types of emails
const testEmails = [
  // Legitimate business emails (should pass)
  'contact@dentalclinic.ma',
  'info@webagency.ma',
  'stephane.roochard@gmail.com',
  'business@company.com',
  
  // Institutional emails (should be rejected)
  'contact@ofppt.ma',
  'info@um6p.ma',
  'admin@ens.ma',
  'student@university.edu',
  'faculty@college.ac',
  'department@institute.org',
  'service@ministry.gov',
  'bureau@administration.ma',
  
  // Fake/example emails (should be rejected)
  'test@test.com',
  'demo@demo.com',
  'example@example.com',
  'fake@fake.com',
  'admin@admin.com',
  'root@root.com',
  'webmaster@webmaster.com',
  'info@info.com',
  'contact@contact.com',
  'hello@hello.com',
  
  // Suspicious patterns (should be rejected)
  '123@domain.com',
  'test@123.com',
  'email@domain.a',
  'email@domain.com.org'
];

async function testEnhancedFiltering() {
  try {
    console.log(chalk.gray('1. Testing email extraction filtering...'));
    
    // Test email extraction filtering
    const testHtml = testEmails.map(email => `<p>Contact us at ${email}</p>`).join('');
    const extractedEmails = extractEmails(testHtml);
    
    console.log(chalk.green(`✅ Extracted ${extractedEmails.length} emails after filtering`));
    console.log(chalk.gray('   Original count would have been:', testEmails.length));
    
    // Show which emails were filtered out
    const filteredOut = testEmails.filter(email => !extractedEmails.includes(email));
    if (filteredOut.length > 0) {
      console.log(chalk.yellow(`   Filtered out ${filteredOut.length} emails:`));
      filteredOut.forEach(email => console.log(chalk.gray(`     - ${email}`)));
    }
    
    console.log(chalk.gray('\n2. Testing content validator email filtering...'));
    
    // Test content validator
    const validator = new ContentValidator('dentist in casablanca');
    
    const validationResults = [];
    for (const email of extractedEmails) {
      const result = validator.validateEmailSmart(email, 'https://example.com');
      validationResults.push({ email, result });
    }
    
    const passedValidation = validationResults.filter(r => r.result.isValid);
    const failedValidation = validationResults.filter(r => !r.result.isValid);
    
    console.log(chalk.green(`✅ ${passedValidation.length} emails passed validation`));
    if (failedValidation.length > 0) {
      console.log(chalk.yellow(`   ${failedValidation.length} emails failed validation:`));
      failedValidation.forEach(({ email, result }) => {
        console.log(chalk.gray(`     - ${email}: ${result.reason}`));
      });
    }
    
    console.log(chalk.gray('\n3. Testing institutional pattern detection...'));
    
    // Test institutional pattern detection
    const institutionalTests = [
      'This is a university campus with faculty members',
      'The ministry of education provides services',
      'Government administration bureau',
      'Training institute for students',
      'Academic department of research',
      'Business consulting services',
      'Dental clinic in Casablanca'
    ];
    
    for (const test of institutionalTests) {
      const validation = validator.validateContent(test, 'https://test.com');
      const isInstitutional = validation.score < 0;
      console.log(chalk.gray(`   "${test.substring(0, 40)}..." - Score: ${validation.score} ${isInstitutional ? '❌' : '✅'}`));
    }
    
    console.log(chalk.green.bold('\n✅ Enhanced filtering test completed!'));
    console.log(chalk.gray('The scraper should now be much more aggressive in filtering out institutional and fake emails.'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Test failed: ${error.message}`));
    console.error(chalk.gray('Error details:', error.stack));
    process.exit(1);
  }
}

testEnhancedFiltering();
