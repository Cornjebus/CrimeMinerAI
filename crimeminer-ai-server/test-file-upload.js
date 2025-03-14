// Test script for CrimeMiner AI file upload
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const API_URL = 'http://localhost:4000';

// Create a test text file
const TEST_FILE_PATH = path.join(__dirname, 'test-evidence.txt');
fs.writeFileSync(
  TEST_FILE_PATH,
  'This is a test evidence file for CrimeMiner AI.\n' +
  'It contains information about a suspect named John Doe who was seen at 123 Main St.\n' +
  'The incident occurred on January 15, 2023, at approximately 10:30 PM.\n' +
  'A weapon was reportedly involved, described as a black handgun.'
);

async function testFileUpload() {
  console.log('Testing CrimeMiner AI File Upload...\n');
  
  try {
    // 1. Upload a file
    console.log('1. Testing file upload...');
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE_PATH));
    
    const uploadResponse = await axios.post(`${API_URL}/api/files/upload`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });
    
    console.log('   ✓ File upload successful');
    console.log(`   File ID: ${uploadResponse.data.id}`);
    console.log(`   File Type: ${uploadResponse.data.fileType}`);
    console.log(`   Original Name: ${uploadResponse.data.originalName}`);
    console.log('\n');
    
    const fileId = uploadResponse.data.id;
    
    // 2. List all files
    console.log('2. Testing file listing...');
    const listResponse = await axios.get(`${API_URL}/api/files`);
    console.log('   ✓ File listing successful');
    console.log(`   Total files: ${listResponse.data.length}`);
    console.log('\n');
    
    // 3. Get file metadata
    console.log('3. Testing file metadata retrieval...');
    const metadataResponse = await axios.get(`${API_URL}/api/files/${fileId}/metadata`);
    console.log('   ✓ Metadata retrieval successful');
    console.log(`   File Size: ${metadataResponse.data.size} bytes`);
    console.log('\n');
    
    // 4. Download the file
    console.log('4. Testing file download...');
    const downloadResponse = await axios.get(`${API_URL}/api/files/${fileId}`, {
      responseType: 'arraybuffer',
    });
    console.log('   ✓ File download successful');
    console.log(`   Content Type: ${downloadResponse.headers['content-type']}`);
    console.log('\n');
    
    // 5. Delete the file
    console.log('5. Testing file deletion...');
    await axios.delete(`${API_URL}/api/files/${fileId}`);
    console.log('   ✓ File deletion successful');
    console.log('\n');
    
    // 6. Verify deletion
    console.log('6. Verifying file was deleted...');
    try {
      await axios.get(`${API_URL}/api/files/${fileId}/metadata`);
      console.log('   ❌ File still exists (deletion failed)');
    } catch (error) {
      console.log('   ✓ File no longer exists (deletion confirmed)');
    }
    console.log('\n');
    
    console.log('✓ All file operations tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    // Clean up test file
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
      console.log('\nTest file cleaned up.');
    }
  }
}

testFileUpload(); 