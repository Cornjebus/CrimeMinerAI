/**
 * Whisper API Client Module
 * 
 * This module provides functions for audio transcription using OpenAI's Whisper API.
 * It handles full transcription as well as chunked processing for long audio files.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import { 
  detectFormat, 
  splitAudioFile, 
  standardizeAudio, 
  AudioFormat, 
  AudioMetadata 
} from './ffmpeg';

// Environment configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_FILE_SIZE_MB = 25; // Whisper API limit
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Transcription options
export interface TranscriptionOptions {
  language?: string;         // ISO-639-1 language code
  prompt?: string;           // Optional prompt for better transcription
  temperature?: number;      // 0-1 temperature for generation
  format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  timestampGranularities?: ('segment' | 'word')[];
  outputDir?: string;        // Directory to save transcription files
  chunkSize?: number;        // Size of chunks in seconds for long audio
  model?: string;            // Whisper model to use ('whisper-1' is default)
  speakerDiarization?: boolean; // Attempt to identify different speakers (if supported)
}

// Transcription result interface
export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  confidence: number;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
  processingTime: number;
  audioFile: string;
}

// Define error types
export class WhisperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WhisperError';
  }
}

export class TranscriptionError extends WhisperError {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

/**
 * Transcribes an audio file using the OpenAI Whisper API
 * @param audioFilePath Path to the audio file
 * @param options Transcription options
 * @returns The transcription result
 */
export async function transcribeAudio(
  audioFilePath: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    if (!OPENAI_API_KEY) {
      throw new WhisperError('OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.');
    }

    // Ensure the file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new TranscriptionError(`Audio file not found: ${audioFilePath}`);
    }

    // Get file size
    const stats = fs.statSync(audioFilePath);
    console.log(`Audio file size: ${stats.size / (1024 * 1024)} MB`);

    // Check if we need to split the file due to size or duration
    const metadata = await detectFormat(audioFilePath) as AudioMetadata;
    const needsChunking = stats.size > MAX_FILE_SIZE_BYTES || metadata.duration > 600; // 10 minutes

    if (needsChunking) {
      console.log(`Audio file too large or too long (${metadata.duration}s). Processing in chunks.`);
      return await transcribeAudioInChunks(audioFilePath, options);
    }

    // Start timing the transcription
    const startTime = Date.now();

    // Prepare form data for the API request
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFilePath));
    formData.append('model', options.model || 'whisper-1');
    
    if (options.language) {
      formData.append('language', options.language);
    }
    
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }
    
    formData.append('temperature', String(options.temperature || 0.2));
    formData.append('response_format', options.format || 'verbose_json');

    if (options.timestampGranularities) {
      options.timestampGranularities.forEach(granularity => {
        formData.append('timestamp_granularities[]', granularity);
      });
    }

    console.log(`Sending request to Whisper API for ${path.basename(audioFilePath)}`);

    // Make the API request
    const response = await axios.post(WHISPER_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      maxBodyLength: Infinity,
    });

    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000; // seconds

    console.log(`Transcription completed in ${processingTime.toFixed(2)} seconds`);

    // Process the result based on the chosen format
    if (options.format === 'text') {
      // Simple text output
      return {
        text: response.data,
        segments: [{
          id: 0,
          start: 0,
          end: metadata.duration,
          text: response.data,
          confidence: 1
        }],
        language: options.language || 'en',
        duration: metadata.duration,
        processingTime,
        audioFile: audioFilePath
      };
    } else {
      // JSON output with segments
      const result = response.data;
      
      // Convert the segments to our standard format
      const segments: TranscriptionSegment[] = result.segments.map((seg: any, index: number) => ({
        id: index,
        start: seg.start,
        end: seg.end,
        text: seg.text,
        confidence: seg.confidence || 0.9 // Default if not provided
      }));

      // Save the transcription to a file if outputDir is specified
      if (options.outputDir) {
        await saveTranscription(result, audioFilePath, options);
      }

      return {
        text: result.text,
        segments,
        language: result.language || options.language || 'en',
        duration: metadata.duration,
        processingTime,
        audioFile: audioFilePath
      };
    }
  } catch (error) {
    console.error('Transcription error:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', error.response.data);
      throw new TranscriptionError(`API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    }
    
    throw new TranscriptionError(`Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Transcribes a long audio file by splitting it into chunks and transcribing each chunk
 * @param audioFilePath Path to the audio file
 * @param options Transcription options
 * @returns Combined transcription result from all chunks
 */
export async function transcribeAudioInChunks(
  audioFilePath: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    console.log(`Starting chunked transcription for ${audioFilePath}`);
    const startTime = Date.now();

    // Get audio metadata
    const metadata = await detectFormat(audioFilePath) as AudioMetadata;
    const chunkSize = options.chunkSize || 300; // Default 5 minutes

    // Split the audio file into chunks
    console.log(`Splitting audio into ${chunkSize} second chunks...`);
    const audioChunks = await splitAudioFile(
      audioFilePath,
      chunkSize,
      { outputDir: options.outputDir }
    );

    if (audioChunks.length === 0) {
      throw new TranscriptionError('Failed to split audio into chunks');
    }

    console.log(`Split audio into ${audioChunks.length} chunks`);

    // Transcribe each chunk
    const chunkResults: TranscriptionResult[] = [];
    for (let i = 0; i < audioChunks.length; i++) {
      console.log(`Transcribing chunk ${i + 1}/${audioChunks.length}`);
      
      try {
        // Use same options for each chunk but with some adjustments
        const chunkOptions = { 
          ...options,
          // If it's not the first chunk, use the end of the previous chunk as context
          prompt: i > 0 && chunkResults[i-1] 
            ? `${chunkResults[i-1].text.slice(-100)}` 
            : options.prompt
        };
        
        const result = await transcribeAudio(audioChunks[i], chunkOptions);
        chunkResults.push(result);
        
        // Add a small delay between chunks to avoid rate limiting
        if (i < audioChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error transcribing chunk ${i + 1}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    // Merge the chunks
    const combinedResult = mergeTranscriptionChunks(chunkResults, metadata);
    
    const endTime = Date.now();
    combinedResult.processingTime = (endTime - startTime) / 1000; // seconds
    
    console.log(`Completed chunked transcription in ${combinedResult.processingTime.toFixed(2)} seconds`);
    
    // Save the combined transcription
    if (options.outputDir) {
      await saveTranscription(
        { 
          text: combinedResult.text,
          segments: combinedResult.segments,
          language: combinedResult.language
        }, 
        audioFilePath, 
        options
      );
    }

    return combinedResult;
  } catch (error) {
    console.error('Chunked transcription error:', error);
    throw new TranscriptionError(`Failed to transcribe audio in chunks: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Merges multiple transcription chunks into a single result
 * @param chunks Array of transcription results from individual chunks
 * @param metadata Original audio file metadata
 * @returns Combined transcription result
 */
function mergeTranscriptionChunks(
  chunks: TranscriptionResult[],
  metadata: AudioMetadata
): TranscriptionResult {
  if (chunks.length === 0) {
    return {
      text: '',
      segments: [],
      language: 'en',
      duration: 0,
      processingTime: 0,
      audioFile: ''
    };
  }

  if (chunks.length === 1) {
    return chunks[0];
  }

  // Combine all texts
  const combinedText = chunks.map(chunk => chunk.text).join(' ');
  
  // Merge and adjust segments
  let lastEndTime = 0;
  let lastId = 0;
  const combinedSegments: TranscriptionSegment[] = [];
  
  for (const chunk of chunks) {
    // Adjust segment times based on their position in the overall audio
    const adjustedSegments = chunk.segments.map(segment => ({
      ...segment,
      id: lastId++,
      start: segment.start + lastEndTime,
      end: segment.end + lastEndTime
    }));
    
    combinedSegments.push(...adjustedSegments);
    
    // Update the last end time for the next chunk
    const chunkDuration = chunk.duration;
    lastEndTime += chunkDuration;
  }

  return {
    text: combinedText,
    segments: combinedSegments,
    language: chunks[0].language, // Use the language from the first chunk
    duration: metadata.duration,
    processingTime: chunks.reduce((total, chunk) => total + chunk.processingTime, 0),
    audioFile: chunks[0].audioFile.replace(/_segment.*$/, '') // Remove segment suffixes
  };
}

/**
 * Saves a transcription result to a file
 * @param result Transcription result to save
 * @param sourceFile Original audio file path
 * @param options Transcription options
 */
async function saveTranscription(
  result: any,
  sourceFile: string,
  options: TranscriptionOptions
): Promise<string> {
  try {
    const outputDir = options.outputDir || path.dirname(sourceFile);
    const baseName = path.basename(sourceFile, path.extname(sourceFile));
    const uniqueId = uuidv4().substring(0, 8);
    
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const format = options.format || 'json';
    const outputFileName = `${baseName}_transcript_${uniqueId}.${format === 'verbose_json' ? 'json' : format}`;
    const outputPath = path.join(outputDir, outputFileName);
    
    // Write the transcription to a file
    if (format === 'text' || typeof result === 'string') {
      fs.writeFileSync(outputPath, result);
    } else {
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    }
    
    console.log(`Saved transcription to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error saving transcription:', error);
    throw new WhisperError(`Failed to save transcription: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Pre-processes an audio file to optimize it for transcription
 * @param audioFilePath Path to the original audio file
 * @param options Processing options
 * @returns Path to the processed audio file
 */
export async function prepareAudioForTranscription(
  audioFilePath: string,
  options: {
    normalize?: boolean;
    noiseReduction?: boolean;
    outputDir?: string;
  } = {}
): Promise<string> {
  try {
    console.log(`Preparing audio for transcription: ${audioFilePath}`);
    
    // Standard options for transcription-optimized audio
    const standardizationOptions = {
      format: AudioFormat.MP3,
      sampleRate: 44100,   // 44.1 kHz is well supported
      channels: 1,         // Mono is better for speech recognition
      bitrate: '128k',     // Good quality for speech
      normalize: options.normalize !== undefined ? options.normalize : true,
      noiseReduction: options.noiseReduction !== undefined ? options.noiseReduction : true,
      outputDir: options.outputDir
    };
    
    // Process the audio
    const processedPath = await standardizeAudio(audioFilePath, standardizationOptions);
    console.log(`Audio prepared for transcription: ${processedPath}`);
    
    return processedPath;
  } catch (error) {
    console.error('Audio preparation error:', error);
    throw new WhisperError(`Failed to prepare audio for transcription: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Implements speaker diarization by post-processing the transcript
 * using GPT-4 to identify different speakers in the audio.
 * @param transcription The transcription result without speaker information
 * @param options Additional options for diarization
 * @returns The transcription result with speaker information added
 */
export async function performSpeakerDiarization(
  transcription: TranscriptionResult,
  options: {
    apiKey?: string; // OpenAI API key, defaults to env variable
    speakerCount?: number; // Hint for number of speakers
    useGPT4?: boolean; // Whether to use GPT-4 (more accurate) or GPT-3.5
  } = {}
): Promise<TranscriptionResult> {
  try {
    const apiKey = options.apiKey || OPENAI_API_KEY;
    if (!apiKey) {
      throw new WhisperError('OpenAI API key not found for speaker diarization');
    }

    console.log('Performing speaker diarization with AI...');

    // Prepare the prompt with transcription data
    let prompt = `You are an audio transcription specialist. The following is a transcript of an audio recording.\n\n`;
    prompt += `Full Transcript:\n${transcription.text}\n\n`;
    prompt += `Now I want you to analyze this transcript and identify different speakers. `;
    
    if (options.speakerCount) {
      prompt += `There are approximately ${options.speakerCount} speakers in this recording. `;
    } else {
      prompt += `I don't know how many speakers there are, so please identify them based on context. `;
    }
    
    prompt += `Format each segment with the speaker label at the beginning of each line like "Speaker 1:", "Speaker 2:", etc.\n\n`;
    prompt += `Here are the individual segments with timestamps (start-end in seconds):\n\n`;
    
    transcription.segments.forEach(segment => {
      prompt += `[${segment.start.toFixed(2)}-${segment.end.toFixed(2)}]: ${segment.text}\n`;
    });
    
    prompt += `\nPlease analyze the content, speaking patterns, and context to assign consistent speaker labels to each segment.`;
    prompt += `Remember to maintain consistency - if "Speaker 1" is identified as the host in one segment, they should be labeled as "Speaker 1" throughout.`;

    // Make the API request to GPT
    const response = await axios.post(
      options.useGPT4 ? 'https://api.openai.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions',
      {
        model: options.useGPT4 ? 'gpt-4' : 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert audio transcription assistant skilled in speaker diarization.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract the content from the response
    const result = response.data.choices[0].message.content;
    
    // Parse the response to update the transcript with speaker information
    return parseDiarizationResult(result, transcription);
  } catch (error) {
    console.error('Speaker diarization error:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      console.error('API error details:', error.response.data);
    }
    
    // Return the original transcription without speaker information
    console.log('Continuing without speaker diarization');
    return transcription;
  }
}

/**
 * Parses the AI response to extract speaker information
 * @param aiResponse The text response from the AI
 * @param originalTranscription The original transcription result
 * @returns Updated transcription with speaker information
 */
function parseDiarizationResult(
  aiResponse: string,
  originalTranscription: TranscriptionResult
): TranscriptionResult {
  try {
    // Extract segments with speaker labels from the AI response
    const speakerPattern = /(?:Speaker\s*\d+|Unknown\s*Speaker|Interviewer|Respondent|Host|Guest):\s*(.*?)(?=(?:\n\s*(?:Speaker\s*\d+|Unknown\s*Speaker|Interviewer|Respondent|Host|Guest):)|$)/gis;
    const timePattern = /\[(\d+\.\d+)-(\d+\.\d+)\]:\s*(.*?)(?=\n|$)/gs;
    
    // Create a map of text to potential speakers
    const textToSpeakerMap = new Map<string, string>();
    
    // First try to match based on timestamps if they're in the response
    let timeMatch;
    while ((timeMatch = timePattern.exec(aiResponse)) !== null) {
      const [_, startTime, endTime, text] = timeMatch;
      const speakerMatch = /(?:Speaker\s*\d+|Unknown\s*Speaker|Interviewer|Respondent|Host|Guest)/i.exec(text);
      if (speakerMatch) {
        const speaker = speakerMatch[0].trim();
        const cleanText = text.replace(speakerMatch[0] + ':', '').trim();
        
        // Find the closest matching segment in the original transcription
        const start = parseFloat(startTime);
        const end = parseFloat(endTime);
        for (const segment of originalTranscription.segments) {
          if (Math.abs(segment.start - start) < 1 && Math.abs(segment.end - end) < 1) {
            textToSpeakerMap.set(segment.text, speaker);
            break;
          }
        }
      }
    }
    
    // If timestamp matching failed, try matching based on the speaker pattern
    let speakerMatch;
    while ((speakerMatch = speakerPattern.exec(aiResponse)) !== null) {
      const [fullMatch, text] = speakerMatch;
      const speaker = fullMatch.split(':')[0].trim();
      
      if (text && speaker) {
        // Try to find matching text in the original transcription
        for (const segment of originalTranscription.segments) {
          if (segment.text.includes(text.trim().substring(0, 20))) {
            textToSpeakerMap.set(segment.text, speaker);
          }
        }
      }
    }
    
    // Update the original transcription with speaker information
    const updatedSegments = originalTranscription.segments.map(segment => {
      const speaker = textToSpeakerMap.get(segment.text);
      return {
        ...segment,
        speaker: speaker // This will be undefined if no speaker was found, matching the interface
      };
    });
    
    return {
      ...originalTranscription,
      segments: updatedSegments
    };
  } catch (error) {
    console.error('Error parsing diarization result:', error);
    return originalTranscription;
  }
}

/**
 * Transcribes an audio file with speaker diarization
 * @param audioFilePath Path to the audio file
 * @param options Transcription options
 * @returns The transcription result with speaker information
 */
export async function transcribeAudioWithDiarization(
  audioFilePath: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  // First perform the standard transcription
  const result = await transcribeAudio(audioFilePath, options);
  
  // Then apply speaker diarization if requested
  if (options.speakerDiarization) {
    console.log('Applying speaker diarization to the transcript...');
    return await performSpeakerDiarization(result, {
      useGPT4: true, // For best results
    });
  }
  
  return result;
} 