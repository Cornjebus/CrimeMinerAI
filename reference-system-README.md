# CrimeMiner AI Reference System

The Reference System is a core component of CrimeMiner AI that provides precise references to the original evidence files, allowing investigators to trace analysis results back to their source.

## Overview

When analyzing evidence files, it's crucial to maintain a clear link between the analysis results and the original source material. The Reference System creates and manages these links, enabling:

1. **Traceability**: Every entity, pattern, or insight can be traced back to its exact location in the source file
2. **Verification**: Investigators can verify findings by examining the original context
3. **Court Admissibility**: Provides clear documentation of evidence sources for legal proceedings
4. **Cross-referencing**: Connects related evidence across multiple files

## How It Works

The Reference System works by:

1. Creating unique identifiers for each evidence file
2. Tracking precise locations within files (line numbers, timestamps, coordinates)
3. Storing context around each reference point
4. Maintaining confidence scores for each reference
5. Generating reports that link analysis results to source material

## Supported File Types

The Reference System currently supports:

- **Text Files**: References include line numbers and character positions
- **Audio Files**: References include timestamps (start and end times)

Future support will include:

- **Video Files**: Timestamps and frame numbers
- **Images**: Pixel coordinates and bounding boxes
- **PDF Documents**: Page numbers and text positions

## Proof of Concept

The `reference-system-poc.js` script demonstrates the core functionality of the Reference System:

```
node reference-system-poc.js [audio-file-path] [text-file-path]
```

By default, it will look for:
- `./sample-data/sample-audio.mp3` (optional)
- `./sample-data/sample-interview.txt` (required)

### What the POC Demonstrates

1. **Text File Processing**:
   - Extracts entities from text files
   - Creates references with line numbers and character positions
   - Captures context around each reference

2. **Audio File Processing**:
   - Simulates transcription of audio files
   - Creates references with timestamps
   - Links entities to specific segments in the audio

3. **Report Generation**:
   - Creates an HTML report showing all references
   - Provides a user-friendly way to navigate references
   - Displays context and confidence scores

## Output Files

The proof of concept generates the following output files in the `./reference-output` directory:

1. JSON files for each evidence file with references
2. An HTML report with all references

## Integration with CrimeMiner AI

The Reference System will be integrated with the main CrimeMiner AI application to:

1. Store references in the database
2. Provide UI components for navigating to source references
3. Enable cross-document analysis with reference tracking
4. Support export of references in reports

## Technical Implementation

The Reference System is built using:

- **Class-based architecture**: `EvidenceFile` and `Reference` classes
- **Unique identifiers**: UUID generation for files and references
- **Metadata tracking**: File information, timestamps, and confidence scores
- **HTML report generation**: User-friendly visualization of references

## Getting Started

To try the Reference System proof of concept:

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file based on `.env.example`

3. Prepare sample files:
   - Place a text file at `./sample-data/sample-interview.txt`
   - Optionally, place an audio file at `./sample-data/sample-audio.mp3`

4. Run the proof of concept:
   ```
   npm run reference-poc
   ```

5. Check the output in the `./reference-output` directory

## Next Steps

The next steps for the Reference System include:

1. Database integration for storing references
2. UI components for navigating to source references
3. Support for additional file types
4. Advanced search and filtering of references
5. Integration with the batch processing system

## Contributing

When contributing to the Reference System, please ensure:

1. All references include proper context
2. Confidence scores are calculated and stored
3. File metadata is preserved
4. References are serializable for database storage
5. HTML reports are accessible and user-friendly 