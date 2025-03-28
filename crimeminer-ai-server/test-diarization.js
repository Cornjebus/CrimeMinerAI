/**
 * Speaker Diarization Test Script
 * 
 * This script tests the speaker diarization functionality by transcribing
 * an audio file and applying speaker identification.
 * 
 * It demonstrates how to:
 * 1. Transcribe an audio file using Whisper
 * 2. Apply speaker diarization to identify different speakers
 * 3. Output the results with speaker labels
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { transcribeAudioWithDiarization, prepareAudioForTranscription } = require('./src/lib/whisper');

// Configuration
const SAMPLE_AUDIO = path.join(__dirname, '../sample-data/sample-audio.mp3');
const OUTPUT_DIR = path.join(__dirname, 'test-output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper function to format time in MM:SS format
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

async function runTest() {
  try {
    console.log('Starting speaker diarization test...');
    console.log(`Using sample audio: ${SAMPLE_AUDIO}`);
    
    // Step 1: Prepare the audio file (normalize, reduce noise)
    console.log('Preparing audio for transcription...');
    const preparedAudioPath = await prepareAudioForTranscription(SAMPLE_AUDIO, {
      normalize: true,
      noiseReduction: true,
      outputDir: OUTPUT_DIR
    });
    console.log(`Prepared audio saved to: ${preparedAudioPath}`);
    
    // Step 2: Transcribe with speaker diarization
    console.log('Transcribing audio with speaker diarization...');
    const result = await transcribeAudioWithDiarization(preparedAudioPath, {
      speakerDiarization: true,
      format: 'verbose_json',
      temperature: 0.2,
      timestampGranularities: ['segment'],
      outputDir: OUTPUT_DIR
    });
    
    // Step 3: Output the results
    console.log('\n=== Transcription with Speaker Diarization ===\n');
    console.log(`Total duration: ${result.duration.toFixed(2)} seconds`);
    console.log(`Processing time: ${result.processingTime.toFixed(2)} seconds`);
    console.log(`Detected language: ${result.language}`);
    console.log('\n=== Transcript with Speakers ===\n');
    
    // Count unique speakers
    const speakers = new Set();
    result.segments.forEach(segment => {
      if (segment.speaker) {
        speakers.add(segment.speaker);
      }
    });
    console.log(`Detected ${speakers.size} unique speakers\n`);
    
    // Print transcript with speaker labels
    result.segments.forEach(segment => {
      const timeLabel = `[${formatTime(segment.start)}-${formatTime(segment.end)}]`;
      const speakerLabel = segment.speaker ? segment.speaker : 'Unknown Speaker';
      console.log(`${timeLabel} ${speakerLabel}: ${segment.text}`);
    });
    
    // Save the result to a JSON file
    const outputPath = path.join(OUTPUT_DIR, `diarization_result_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\nSaved detailed results to: ${outputPath}`);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest().catch(console.error); 