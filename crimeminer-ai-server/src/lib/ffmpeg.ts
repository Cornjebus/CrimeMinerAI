/**
 * FFmpeg Utility Module
 * 
 * This module provides functions for audio and video processing using FFmpeg.
 * It handles format conversion, metadata extraction, and standardization.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Define supported formats
export enum AudioFormat {
  MP3 = 'mp3',
  WAV = 'wav',
  AAC = 'aac',
  FLAC = 'flac',
  OGG = 'ogg'
}

export enum VideoFormat {
  MP4 = 'mp4',
  MOV = 'mov',
  AVI = 'avi',
  MKV = 'mkv'
}

// Define error types
export class FFmpegError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FFmpegError';
  }
}

export class FormatDetectionError extends FFmpegError {
  constructor(message: string) {
    super(message);
    this.name = 'FormatDetectionError';
  }
}

export class ConversionError extends FFmpegError {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionError';
  }
}

// Interfaces
export interface AudioMetadata {
  format: string;
  duration: number;
  bitrate: number;
  channels: number;
  sampleRate: number;
  codec: string;
}

export interface VideoMetadata {
  format: string;
  duration: number;
  bitrate: number;
  width: number;
  height: number;
  frameRate: number;
  hasAudio: boolean;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
}

export interface ConversionOptions {
  sampleRate?: number; // e.g., 44100, 48000
  channels?: number;   // 1 (mono) or 2 (stereo)
  bitrate?: string;    // e.g., '128k', '320k'
  normalize?: boolean; // normalize audio levels
  noiseReduction?: boolean;
  outputDir?: string;  // directory to save the converted file
}

/**
 * Detects the format and metadata of an audio or video file
 * @param filePath Path to the media file
 * @returns Promise with metadata
 */
export async function detectFormat(filePath: string): Promise<AudioMetadata | VideoMetadata> {
  try {
    // Use FFprobe to get file information in JSON format
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
    );
    
    const info = JSON.parse(stdout);
    
    // Check if file has streams
    if (!info.streams || info.streams.length === 0) {
      throw new FormatDetectionError('No streams found in the file');
    }
    
    const format = info.format;
    const duration = parseFloat(format.duration || '0');
    const bitrate = parseInt(format.bit_rate || '0', 10) / 1000; // kbps
    
    // Check if file has video stream
    const videoStream = info.streams.find((stream: any) => stream.codec_type === 'video');
    
    if (videoStream) {
      // This is a video file
      return {
        format: path.extname(filePath).substring(1).toLowerCase(),
        duration,
        bitrate,
        width: videoStream.width,
        height: videoStream.height,
        frameRate: eval(videoStream.r_frame_rate || '0'),
        hasAudio: !!info.streams.find((stream: any) => stream.codec_type === 'audio'),
        audioCodec: info.streams.find((stream: any) => stream.codec_type === 'audio')?.codec_name,
        audioChannels: info.streams.find((stream: any) => stream.codec_type === 'audio')?.channels,
        audioSampleRate: parseInt(info.streams.find((stream: any) => stream.codec_type === 'audio')?.sample_rate || '0', 10)
      };
    } else {
      // This is an audio file
      const audioStream = info.streams.find((stream: any) => stream.codec_type === 'audio');
      
      if (!audioStream) {
        throw new FormatDetectionError('No audio stream found in the file');
      }
      
      return {
        format: path.extname(filePath).substring(1).toLowerCase(),
        duration,
        bitrate,
        channels: audioStream.channels,
        sampleRate: parseInt(audioStream.sample_rate, 10),
        codec: audioStream.codec_name
      };
    }
  } catch (error) {
    console.error('Error detecting format:', error);
    throw new FormatDetectionError(`Failed to detect format: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Converts an audio file to the specified format
 * @param inputPath Path to the input audio file
 * @param outputFormat Desired output format
 * @param options Additional conversion options
 * @returns Path to the converted file
 */
export async function convertAudio(
  inputPath: string,
  outputFormat: AudioFormat,
  options: ConversionOptions = {}
): Promise<string> {
  try {
    // Validate input file exists
    if (!fs.existsSync(inputPath)) {
      throw new ConversionError(`Input file not found: ${inputPath}`);
    }
    
    // Prepare output path
    const outputDir = options.outputDir || path.dirname(inputPath);
    const uniqueId = uuidv4().substring(0, 8);
    const outputFileName = `${path.basename(inputPath, path.extname(inputPath))}_${uniqueId}.${outputFormat}`;
    const outputPath = path.join(outputDir, outputFileName);
    
    // Prepare FFmpeg command
    let ffmpegCmd = `ffmpeg -i "${inputPath}" `;
    
    // Add options
    if (options.sampleRate) {
      ffmpegCmd += `-ar ${options.sampleRate} `;
    }
    
    if (options.channels) {
      ffmpegCmd += `-ac ${options.channels} `;
    }
    
    if (options.bitrate) {
      ffmpegCmd += `-b:a ${options.bitrate} `;
    }
    
    if (options.normalize) {
      // Normalize audio with loudnorm filter
      ffmpegCmd += `-filter:a loudnorm `;
    }
    
    if (options.noiseReduction) {
      // Apply noise reduction filter
      ffmpegCmd += `-af "afftdn=nf=-20" `;
    }
    
    // Add codec based on format
    switch (outputFormat) {
      case AudioFormat.MP3:
        ffmpegCmd += `-codec:a libmp3lame `;
        break;
      case AudioFormat.AAC:
        ffmpegCmd += `-codec:a aac `;
        break;
      case AudioFormat.FLAC:
        ffmpegCmd += `-codec:a flac `;
        break;
      case AudioFormat.OGG:
        ffmpegCmd += `-codec:a libvorbis `;
        break;
      case AudioFormat.WAV:
        ffmpegCmd += `-codec:a pcm_s16le `;
        break;
    }
    
    // Add output path and overwrite flag
    ffmpegCmd += `-y "${outputPath}"`;
    
    console.log(`Executing FFmpeg command: ${ffmpegCmd}`);
    
    // Execute FFmpeg command
    const { stdout, stderr } = await execAsync(ffmpegCmd);
    
    // Check if output file was created
    if (!fs.existsSync(outputPath)) {
      throw new ConversionError(`Failed to create output file: ${outputPath}`);
    }
    
    return outputPath;
  } catch (error) {
    console.error('Audio conversion error:', error);
    throw new ConversionError(`Failed to convert audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extracts audio from a video file
 * @param videoPath Path to the video file
 * @param outputFormat Desired output audio format
 * @param options Additional extraction options
 * @returns Path to the extracted audio file
 */
export async function extractAudioFromVideo(
  videoPath: string,
  outputFormat: AudioFormat = AudioFormat.MP3,
  options: ConversionOptions = {}
): Promise<string> {
  try {
    // Validate input file exists
    if (!fs.existsSync(videoPath)) {
      throw new ConversionError(`Input video file not found: ${videoPath}`);
    }
    
    // Check if it's actually a video
    const metadata = await detectFormat(videoPath);
    if (!('width' in metadata)) {
      throw new ConversionError(`File is not a video: ${videoPath}`);
    }
    
    // Prepare output path
    const outputDir = options.outputDir || path.dirname(videoPath);
    const uniqueId = uuidv4().substring(0, 8);
    const outputFileName = `${path.basename(videoPath, path.extname(videoPath))}_audio_${uniqueId}.${outputFormat}`;
    const outputPath = path.join(outputDir, outputFileName);
    
    // Prepare FFmpeg command for extracting audio
    let ffmpegCmd = `ffmpeg -i "${videoPath}" -vn `; // -vn means "no video"
    
    // Add audio options
    if (options.sampleRate) {
      ffmpegCmd += `-ar ${options.sampleRate} `;
    }
    
    if (options.channels) {
      ffmpegCmd += `-ac ${options.channels} `;
    }
    
    if (options.bitrate) {
      ffmpegCmd += `-b:a ${options.bitrate} `;
    }
    
    // Add codec based on format
    switch (outputFormat) {
      case AudioFormat.MP3:
        ffmpegCmd += `-codec:a libmp3lame `;
        break;
      case AudioFormat.AAC:
        ffmpegCmd += `-codec:a aac `;
        break;
      case AudioFormat.FLAC:
        ffmpegCmd += `-codec:a flac `;
        break;
      case AudioFormat.OGG:
        ffmpegCmd += `-codec:a libvorbis `;
        break;
      case AudioFormat.WAV:
        ffmpegCmd += `-codec:a pcm_s16le `;
        break;
    }
    
    // Add output path and overwrite flag
    ffmpegCmd += `-y "${outputPath}"`;
    
    console.log(`Executing FFmpeg command: ${ffmpegCmd}`);
    
    // Execute FFmpeg command
    const { stdout, stderr } = await execAsync(ffmpegCmd);
    
    // Check if output file was created
    if (!fs.existsSync(outputPath)) {
      throw new ConversionError(`Failed to extract audio: ${outputPath}`);
    }
    
    return outputPath;
  } catch (error) {
    console.error('Audio extraction error:', error);
    throw new ConversionError(`Failed to extract audio from video: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Standardizes an audio file to consistent format
 * @param inputPath Path to the input audio file
 * @param options Standardization options
 * @returns Path to the standardized file
 */
export async function standardizeAudio(
  inputPath: string,
  options: {
    format?: AudioFormat;
    sampleRate?: number;
    channels?: number;
    bitrate?: string;
    normalize?: boolean;
  } = {}
): Promise<string> {
  // Default standardization options
  const standardOptions: ConversionOptions = {
    sampleRate: options.sampleRate || 44100,      // CD quality
    channels: options.channels || 1,              // Mono (better for speech)
    bitrate: options.bitrate || '128k',           // Reasonable quality
    normalize: options.normalize !== undefined ? options.normalize : true,
    noiseReduction: true
  };
  
  // Convert to standard format
  return await convertAudio(
    inputPath,
    options.format || AudioFormat.MP3,
    standardOptions
  );
}

/**
 * Splits a long audio file into smaller segments
 * @param inputPath Path to the input audio file
 * @param segmentDuration Duration of each segment in seconds
 * @param options Additional options for the segments
 * @returns Array of paths to the segment files
 */
export async function splitAudioFile(
  inputPath: string,
  segmentDuration: number = 600, // 10 minutes by default
  options: ConversionOptions = {}
): Promise<string[]> {
  try {
    // Validate input file exists
    if (!fs.existsSync(inputPath)) {
      throw new ConversionError(`Input file not found: ${inputPath}`);
    }
    
    // Get metadata
    const metadata = await detectFormat(inputPath);
    if (!('channels' in metadata)) {
      throw new ConversionError(`File is not an audio file: ${inputPath}`);
    }
    
    // Prepare output directory
    const outputDir = options.outputDir || path.dirname(inputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputFormat = path.extname(inputPath).substring(1) as AudioFormat;
    
    // Calculate number of segments
    const totalDuration = metadata.duration;
    const numSegments = Math.ceil(totalDuration / segmentDuration);
    
    const segmentPaths: string[] = [];
    
    // Create segments
    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const segment = `${baseName}_segment_${i + 1}_${uuidv4().substring(0, 8)}.${outputFormat}`;
      const segmentPath = path.join(outputDir, segment);
      
      // FFmpeg command for splitting
      let ffmpegCmd = `ffmpeg -i "${inputPath}" -ss ${startTime} -t ${segmentDuration} `;
      
      // Add options
      if (options.sampleRate) {
        ffmpegCmd += `-ar ${options.sampleRate} `;
      }
      
      if (options.channels) {
        ffmpegCmd += `-ac ${options.channels} `;
      }
      
      if (options.bitrate) {
        ffmpegCmd += `-b:a ${options.bitrate} `;
      }
      
      // Add output path and overwrite flag
      ffmpegCmd += `-y "${segmentPath}"`;
      
      console.log(`Creating segment ${i + 1}/${numSegments}: ${ffmpegCmd}`);
      
      // Execute FFmpeg command
      await execAsync(ffmpegCmd);
      
      // Check if segment file was created
      if (fs.existsSync(segmentPath)) {
        segmentPaths.push(segmentPath);
      }
    }
    
    return segmentPaths;
  } catch (error) {
    console.error('Audio splitting error:', error);
    throw new ConversionError(`Failed to split audio file: ${error instanceof Error ? error.message : String(error)}`);
  }
} 