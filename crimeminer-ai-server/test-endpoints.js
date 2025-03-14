// Test script for CrimeMiner AI endpoints
const axios = require('axios');

const API_URL = 'http://localhost:4000';
const SAMPLE_TEXT = `
On January 15, 2023, at approximately 10:30 PM, John Smith was seen entering the convenience store
at 123 Main Street. According to the store clerk, James Johnson, the suspect was wearing a black hoodie 
and appeared nervous. The suspect left in a blue Honda Civic with license plate ABC-123. The store's 
security camera captured the suspect handling what appeared to be a 9mm handgun. 
The First National Bank across the street was robbed 20 minutes later using a similar weapon.
`;

async function testEndpoints() {
  console.log('Testing CrimeMiner AI Endpoints...\n');
  
  try {
    // Test health check
    console.log('1. Testing health check endpoint...');
    const healthCheck = await axios.get(`${API_URL}/`);
    console.log('   ✓ Health check successful\n');
    
    // Test entity extraction
    console.log('2. Testing entity extraction...');
    const entities = await axios.post(`${API_URL}/api/extract-entities`, { text: SAMPLE_TEXT });
    console.log('   ✓ Entity extraction successful');
    console.log('   Entities found:');
    if (entities.data.people) {
      console.log(`   - People: ${entities.data.people.length}`);
    }
    if (entities.data.locations) {
      console.log(`   - Locations: ${entities.data.locations.length}`);
    }
    console.log('\n');
    
    // Test summarization
    console.log('3. Testing evidence summarization...');
    const summary = await axios.post(`${API_URL}/api/summarize`, { text: SAMPLE_TEXT });
    console.log('   ✓ Summarization successful');
    console.log(`   Summary: ${summary.data.summary}`);
    console.log('\n');
    
    // Test sentiment analysis
    console.log('4. Testing sentiment and intent analysis...');
    const sentiment = await axios.post(`${API_URL}/api/analyze-sentiment`, { text: SAMPLE_TEXT });
    console.log('   ✓ Sentiment analysis successful');
    console.log(`   Overall sentiment: ${sentiment.data.overallSentiment}`);
    console.log(`   Threat level: ${sentiment.data.threatAssessment?.threatLevel}`);
    console.log('\n');
    
    // Test pattern identification
    console.log('5. Testing pattern identification...');
    const patterns = await axios.post(`${API_URL}/api/identify-patterns`, { text: SAMPLE_TEXT });
    console.log('   ✓ Pattern identification successful');
    if (patterns.data.identifiedPatterns) {
      console.log(`   Patterns found: ${patterns.data.identifiedPatterns.length}`);
    }
    if (patterns.data.suggestedLeads) {
      console.log(`   Suggested leads: ${patterns.data.suggestedLeads.length}`);
    }
    console.log('\n');
    
    console.log('✓ All endpoint tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testEndpoints(); 