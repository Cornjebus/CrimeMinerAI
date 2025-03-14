const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_URL = 'http://localhost:4000';
const TEST_FILE_PATH = path.join(__dirname, 'test-file.txt');
const TEST_FILE_CONTENT = `
Case Number: 2025-0611
Date: June 11, 2025
Location: Central Police Station, 123 Main Street

INTERVIEW TRANSCRIPT

Detective Sarah Johnson: This is Detective Sarah Johnson, interviewing Michael Rodriguez regarding the incident on June 8, 2025. The time is 14:30. Also present is Officer David Chen.

Michael Rodriguez: I already told you guys, I wasn't anywhere near Westside Pawn that night.

Detective Johnson: Mr. Rodriguez, we have security footage showing someone matching your description entering Westside Pawn Shop at approximately 11:20 PM on June 8. Can you explain that?

Michael Rodriguez: That's not possible. I was at The Blue Note Bar until about 10:30, then I went straight home.

Detective Johnson: Can anyone verify that?

Michael Rodriguez: Yeah, my buddy Jake Thompson was with me at the bar. And I'm pretty sure the bartender would remember me.

Detective Johnson: We'll need Jake's contact information. What about after you left The Blue Note?

Michael Rodriguez: Like I said, I went straight home. Got there around 10:50, watched some TV, and went to bed.

Detective Johnson: And no one can verify you were home?

Michael Rodriguez: I live alone, so no. But I ordered food delivery around 11:00. The delivery guy from Eastside Pizza saw me.

Detective Johnson: Mr. Rodriguez, the security footage shows someone entering Westside Pawn at 11:20 PM, and the alarm was triggered at 11:36 PM. The suspect took approximately $5,000 in jewelry and electronics.

Michael Rodriguez: Well, it wasn't me. I've never even been to that pawn shop. You should be looking at Lisa Martinez's boyfriend. He's always hanging around that area.

Detective Johnson: We'll follow up on all leads. For now, I need you to provide contact information for Jake Thompson and details about the food delivery.

Michael Rodriguez: Fine, whatever it takes to clear this up.

Detective Johnson: This concludes the interview. The time is 15:15.
`;

// Create a test file
fs.writeFileSync(TEST_FILE_PATH, TEST_FILE_CONTENT);

async function runTest() {
  try {
    console.log('Starting reference system integration test...');
    
    // Step 1: Upload a test file
    console.log('\nStep 1: Uploading test file...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_PATH), {
      filename: 'interview-transcript.txt',
      contentType: 'text/plain',
    });
    
    const uploadResponse = await axios.post(`${API_URL}/api/files/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    
    const fileId = uploadResponse.data.id;
    console.log(`File uploaded successfully with ID: ${fileId}`);
    
    // Step 2: Extract entities and create references
    console.log('\nStep 2: Extracting entities and creating references...');
    const extractResponse = await axios.post(`${API_URL}/api/references/extract/${fileId}`);
    
    console.log(`Created ${extractResponse.data.referencesCreated} references`);
    console.log('Entity types found:');
    const entityTypes = new Set();
    extractResponse.data.references.forEach(ref => {
      entityTypes.add(ref.context.type);
    });
    console.log([...entityTypes]);
    
    // Step 3: Get references for the file
    console.log('\nStep 3: Getting references for the file...');
    const fileReferencesResponse = await axios.get(`${API_URL}/api/references/file/${fileId}`);
    
    console.log(`Retrieved ${fileReferencesResponse.data.length} references for the file`);
    
    // Step 4: Get references for a specific entity
    console.log('\nStep 4: Getting references for a specific entity...');
    const entityText = 'Michael Rodriguez';
    const entityType = 'PERSON';
    const entityReferencesResponse = await axios.get(`${API_URL}/api/references/entity?entityText=${encodeURIComponent(entityText)}&entityType=${entityType}`);
    
    console.log(`Retrieved ${entityReferencesResponse.data.length} references for entity "${entityText}" (${entityType})`);
    
    // Step 5: Generate a reference report
    console.log('\nStep 5: Generating a reference report...');
    const caseId = '2025-0611'; // Using the case number from the test file
    const reportResponse = await axios.get(`${API_URL}/api/references/report/${caseId}`, {
      responseType: 'text',
    });
    
    console.log(`Generated reference report with length: ${reportResponse.data.length} characters`);
    
    // Save the report to a file
    const reportPath = path.join(__dirname, 'test-report.html');
    fs.writeFileSync(reportPath, reportResponse.data);
    console.log(`Report saved to: ${reportPath}`);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  } finally {
    // Clean up the test file
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
      console.log(`\nTest file deleted: ${TEST_FILE_PATH}`);
    }
  }
}

runTest(); 