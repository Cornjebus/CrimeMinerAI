const axios = require('axios');

// Configure axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 30000,
});

// Test the root endpoint to check server status
async function testServerStatus() {
  try {
    console.log('Testing server status...');
    const response = await api.get('/');
    console.log('Server status:', response.status);
    console.log('Server message:', response.data.message);
    return true;
  } catch (error) {
    console.error('Server status test failed:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
    return false;
  }
}

// Test the entity extraction endpoint
async function testEntityExtraction() {
  try {
    console.log('\nTesting entity extraction...');
    const text = 'John Smith met with Mary Johnson at Central Park in New York City on January 15, 2024. They discussed the robbery at First National Bank.';
    const response = await api.post('/api/extract-entities', { text });
    console.log('Entity extraction successful');
    console.log('Extracted entities:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('Entity extraction test failed:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== CrimeMiner AI API Test ===\n');
  
  const serverRunning = await testServerStatus();
  if (!serverRunning) {
    console.error('\nServer not running. Please start the server with: cd crimeminer-ai-server && PORT=4000 npm run dev');
    return;
  }
  
  await testEntityExtraction();
  
  console.log('\n=== Test Complete ===');
}

runTests(); 