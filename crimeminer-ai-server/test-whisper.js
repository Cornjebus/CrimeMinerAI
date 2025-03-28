/**
 * Whisper API Client Test Script
 * 
 * This script tests the Whisper API client module functionality.
 * It requires sample audio files in the sample-data directory.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Use ts-node to run TypeScript directly
const { spawnSync } = require('child_process');

const sampleDir = path.join(__dirname, '..', 'sample-data');
const testOutputDir = path.join(__dirname, 'test-output');

// Create test output directory if it doesn't exist
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir, { recursive: true });
}

// Find sample files
const findSampleFiles = () => {
  console.log('Looking for sample files in:', sampleDir);
  
  try {
    const files = fs.readdirSync(sampleDir);
    
    const audioFiles = files.filter(file => 
      /\.(mp3|wav|aac|flac|ogg)$/i.test(file)
    );
    
    return audioFiles;
  } catch (error) {
    console.error('Error finding sample files:', error);
    return [];
  }
};

// Run a test by importing the Whisper module and running the specified function
const runTest = (testName, testFunction) => {
  console.log(`\n🧪 RUNNING TEST: ${testName}`);
  console.log('====================================================================================');
  
  try {
    const result = spawnSync('npx', ['ts-node', '-e', testFunction], {
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env }
    });
    
    if (result.status === 0) {
      console.log(`✅ TEST PASSED: ${testName}`);
    } else {
      console.error(`❌ TEST FAILED: ${testName} with exit code ${result.status}`);
    }
  } catch (error) {
    console.error(`❌ TEST ERROR: ${error.message}`);
  }
  
  console.log('====================================================================================\n');
};

// Main test runner
const runTests = async () => {
  console.log('🔍 Whisper API Client Module Test Runner');
  console.log('====================================================================================');
  
  // Find sample files
  const audioFiles = findSampleFiles();
  
  console.log(`Found ${audioFiles.length} audio files for testing.`);
  
  if (audioFiles.length === 0) {
    console.error('No sample audio files found. Please add some audio files to the sample-data directory.');
    return;
  }
  
  // Sample selection for tests
  const shortAudio = audioFiles.find(file => {
    const filePath = path.join(sampleDir, file);
    const stats = fs.statSync(filePath);
    return stats.size < 10 * 1024 * 1024; // Less than 10MB
  });
  
  const anyAudio = audioFiles[0];
  const sampleAudio = shortAudio || anyAudio;
  const samplePath = path.join(sampleDir, sampleAudio);
  
  console.log('Selected sample audio:', sampleAudio);
  
  // Test 1: Audio preparation
  const audioPreparationTest = `
    import { prepareAudioForTranscription } from './src/lib/whisper';
    
    async function runPreparationTest() {
      try {
        const processedPath = await prepareAudioForTranscription(
          '${samplePath.replace(/\\/g, '\\\\')}',
          {
            normalize: true,
            noiseReduction: true,
            outputDir: '${testOutputDir.replace(/\\/g, '\\\\')}'
          }
        );
        
        console.log('Processed audio saved to:', processedPath);
        return true;
      } catch (error) {
        console.error('Audio preparation failed:', error);
        return false;
      }
    }
    
    runPreparationTest().then(result => process.exit(result ? 0 : 1));
  `;
  
  runTest('Audio Preparation for Transcription', audioPreparationTest);
  
  // Test 2: Audio transcription (if API key is available)
  if (process.env.OPENAI_API_KEY) {
    const transcriptionTest = `
      import { transcribeAudio } from './src/lib/whisper';
      
      async function runTranscriptionTest() {
        try {
          // Use the processed audio file from the previous test if available
          const processedDir = '${testOutputDir.replace(/\\/g, '\\\\')}';
          const files = require('fs').readdirSync(processedDir);
          const processedAudio = files.find((f: string) => f.endsWith('.mp3'));
          
          const audioPath = processedAudio 
            ? require('path').join(processedDir, processedAudio)
            : '${samplePath.replace(/\\/g, '\\\\')}';
          
          console.log('Transcribing:', audioPath);
          
          const result = await transcribeAudio(
            audioPath,
            {
              language: 'en',
              format: 'verbose_json',
              outputDir: '${testOutputDir.replace(/\\/g, '\\\\')}',
              timestampGranularities: ['segment']
            }
          );
          
          console.log('Transcription result:', result.text.substring(0, 100) + '...');
          console.log('Found', result.segments.length, 'segments');
          return true;
        } catch (error) {
          console.error('Transcription failed:', error);
          return false;
        }
      }
      
      runTranscriptionTest().then(result => process.exit(result ? 0 : 1));
    `;
    
    runTest('Audio Transcription', transcriptionTest);
  } else {
    console.log('⚠️ Skipping transcription test - No OpenAI API key found in environment variables');
  }
  
  // Test 3: Chunked transcription (mock version to not consume API quota)
  const chunkedTranscriptionMockTest = `
    import { 
      splitAudioFile,
      detectFormat, 
      AudioFormat 
    } from './src/lib/ffmpeg';
    
    async function runChunkedTest() {
      try {
        // First split the audio into chunks
        const chunks = await splitAudioFile(
          '${samplePath.replace(/\\/g, '\\\\')}',
          30, // 30 second chunks
          {
            outputDir: '${testOutputDir.replace(/\\/g, '\\\\')}'
          }
        );
        
        console.log('Split audio into', chunks.length, 'chunks');
        
        // In real usage, each chunk would be transcribed
        // but we'll just verify the chunks were created correctly
        
        return chunks.length > 0;
      } catch (error) {
        console.error('Chunked processing test failed:', error);
        return false;
      }
    }
    
    runChunkedTest().then(result => process.exit(result ? 0 : 1));
  `;
  
  runTest('Chunked Audio Processing (Mock)', chunkedTranscriptionMockTest);
  
  console.log('All tests completed!');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('\n⚠️ Note: Some tests were skipped because no OpenAI API key was found in your environment.');
    console.log('Set the OPENAI_API_KEY environment variable to run all tests.');
  }
};

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
}); 