/**
 * FFmpeg Utility Test Script
 * 
 * This script tests the FFmpeg utility module functionality.
 * It requires sample audio and video files in the sample-data directory.
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
    
    const videoFiles = files.filter(file => 
      /\.(mp4|mov|avi|mkv)$/i.test(file)
    );
    
    return { audioFiles, videoFiles };
  } catch (error) {
    console.error('Error finding sample files:', error);
    return { audioFiles: [], videoFiles: [] };
  }
};

// Run a test by importing the FFmpeg module and running the specified function
const runTest = (testName, testFunction) => {
  console.log(`\n🧪 RUNNING TEST: ${testName}`);
  console.log('====================================================================================');
  
  try {
    const result = spawnSync('npx', ['ts-node', '-e', testFunction], {
      stdio: 'inherit',
      cwd: __dirname
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
  console.log('🔍 FFmpeg Utility Module Test Runner');
  console.log('====================================================================================');
  
  // Find sample files
  const { audioFiles, videoFiles } = findSampleFiles();
  
  console.log(`Found ${audioFiles.length} audio files and ${videoFiles.length} video files for testing.`);
  
  if (audioFiles.length === 0 && videoFiles.length === 0) {
    console.error('No sample files found. Please add some audio and video files to the sample-data directory.');
    return;
  }
  
  // Sample selection for tests
  const sampleAudio = audioFiles.length > 0 
    ? path.join(sampleDir, audioFiles[0]) 
    : null;
    
  const sampleVideo = videoFiles.length > 0 
    ? path.join(sampleDir, videoFiles[0]) 
    : null;
  
  console.log('Selected sample audio:', sampleAudio || 'None');
  console.log('Selected sample video:', sampleVideo || 'None');
  
  // Test 1: Format Detection
  if (sampleAudio) {
    const formatDetectionTest = `
      import { detectFormat } from './src/lib/ffmpeg';
      
      async function runDetectionTest() {
        try {
          const metadata = await detectFormat('${sampleAudio.replace(/\\/g, '\\\\')}');
          console.log('Audio Metadata:', metadata);
          return true;
        } catch (error) {
          console.error('Detection failed:', error);
          return false;
        }
      }
      
      runDetectionTest().then(result => process.exit(result ? 0 : 1));
    `;
    
    runTest('Audio Format Detection', formatDetectionTest);
  }
  
  if (sampleVideo) {
    const videoDetectionTest = `
      import { detectFormat } from './src/lib/ffmpeg';
      
      async function runVideoDetectionTest() {
        try {
          const metadata = await detectFormat('${sampleVideo.replace(/\\/g, '\\\\')}');
          console.log('Video Metadata:', metadata);
          return true;
        } catch (error) {
          console.error('Video detection failed:', error);
          return false;
        }
      }
      
      runVideoDetectionTest().then(result => process.exit(result ? 0 : 1));
    `;
    
    runTest('Video Format Detection', videoDetectionTest);
  }
  
  // Test 2: Audio Conversion
  if (sampleAudio) {
    const audioConversionTest = `
      import { convertAudio, AudioFormat } from './src/lib/ffmpeg';
      
      async function runConversionTest() {
        try {
          const outputPath = await convertAudio(
            '${sampleAudio.replace(/\\/g, '\\\\')}', 
            AudioFormat.MP3, 
            {
              sampleRate: 44100,
              channels: 1,
              bitrate: '128k',
              outputDir: '${testOutputDir.replace(/\\/g, '\\\\')}'
            }
          );
          
          console.log('Converted audio saved to:', outputPath);
          return true;
        } catch (error) {
          console.error('Conversion failed:', error);
          return false;
        }
      }
      
      runConversionTest().then(result => process.exit(result ? 0 : 1));
    `;
    
    runTest('Audio Conversion', audioConversionTest);
  }
  
  // Test 3: Audio Extraction from Video
  if (sampleVideo) {
    const audioExtractionTest = `
      import { extractAudioFromVideo, AudioFormat } from './src/lib/ffmpeg';
      
      async function runExtractionTest() {
        try {
          const outputPath = await extractAudioFromVideo(
            '${sampleVideo.replace(/\\/g, '\\\\')}', 
            AudioFormat.MP3,
            {
              sampleRate: 44100,
              channels: 2,
              bitrate: '192k',
              outputDir: '${testOutputDir.replace(/\\/g, '\\\\')}'
            }
          );
          
          console.log('Extracted audio saved to:', outputPath);
          return true;
        } catch (error) {
          console.error('Extraction failed:', error);
          return false;
        }
      }
      
      runExtractionTest().then(result => process.exit(result ? 0 : 1));
    `;
    
    runTest('Audio Extraction from Video', audioExtractionTest);
  }
  
  // Test 4: Audio Standardization
  if (sampleAudio) {
    const standardizationTest = `
      import { standardizeAudio, AudioFormat } from './src/lib/ffmpeg';
      import * as path from 'path';
      
      async function runStandardizationTest() {
        try {
          // First create a copy of the file in the test output directory 
          // since standardizeAudio doesn't accept outputDir directly
          const fs = require('fs');
          const testFilePath = path.join('${testOutputDir.replace(/\\/g, '\\\\')}', 'test-input.mp3');
          fs.copyFileSync('${sampleAudio.replace(/\\/g, '\\\\')}', testFilePath);
          
          const outputPath = await standardizeAudio(
            testFilePath,
            {
              format: AudioFormat.MP3,
              sampleRate: 44100,
              channels: 1,
              bitrate: '128k',
              normalize: true
            }
          );
          
          console.log('Standardized audio saved to:', outputPath);
          return true;
        } catch (error) {
          console.error('Standardization failed:', error);
          return false;
        }
      }
      
      runStandardizationTest().then(result => process.exit(result ? 0 : 1));
    `;
    
    runTest('Audio Standardization', standardizationTest);
  }
  
  // Test 5: Audio Splitting
  if (sampleAudio) {
    const splittingTest = `
      import { splitAudioFile } from './src/lib/ffmpeg';
      
      async function runSplittingTest() {
        try {
          const segmentPaths = await splitAudioFile(
            '${sampleAudio.replace(/\\/g, '\\\\')}',
            30, // 30 second segments
            {
              outputDir: '${testOutputDir.replace(/\\/g, '\\\\')}'
            }
          );
          
          console.log('Created segments:', segmentPaths);
          return segmentPaths.length > 0;
        } catch (error) {
          console.error('Splitting failed:', error);
          return false;
        }
      }
      
      runSplittingTest().then(result => process.exit(result ? 0 : 1));
    `;
    
    runTest('Audio Splitting', splittingTest);
  }
  
  console.log('All tests completed!');
};

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
}); 