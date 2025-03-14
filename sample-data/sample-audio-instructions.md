# Sample Audio Files for CrimeMiner AI Testing

Due to file size limitations and copyright considerations, actual audio files are not included in this repository. This document provides instructions for obtaining sample audio files to test the audio transcription and reference system features.

## Option 1: Use Public Domain Audio Samples

### LibriVox Samples
[LibriVox](https://librivox.org/) provides free public domain audiobooks. These can be useful for testing general transcription capabilities.

1. Visit [LibriVox](https://librivox.org/)
2. Download a short audio clip (preferably under 10 minutes)
3. Convert to MP3 format if necessary
4. Place the file in this directory and rename it to `sample-audio.mp3`

### Common Voice Dataset
Mozilla's [Common Voice](https://commonvoice.mozilla.org/en/datasets) project offers voice recordings in multiple languages that can be used for testing.

1. Visit [Common Voice Datasets](https://commonvoice.mozilla.org/en/datasets)
2. Download a small subset of the dataset
3. Extract individual MP3 files for testing

## Option 2: Create Your Own Sample Audio

### Mock Interview Recording
For the most relevant testing, create a mock interview based on the `sample-interview.txt` file:

1. Use text-to-speech software or record yourself reading the interview transcript
2. Include at least two distinct voices for the interviewer and subject
3. Save as MP3 format
4. Aim for a 3-5 minute recording that covers key portions of the interview

Recommended free text-to-speech options:
- [Natural Reader](https://www.naturalreaders.com/) (online)
- [Balabolka](http://www.cross-plus-a.com/balabolka.htm) (Windows)
- macOS built-in text-to-speech (System Settings > Accessibility > Spoken Content)

### Recording Tips
- Use different voices for different speakers
- Include some background noise for realism
- Speak clearly but naturally
- Include pauses and verbal fillers (um, uh) for realism
- Vary the speaking pace and tone

## Option 3: Use Sample Files from Speech Recognition Services

Several speech recognition services provide sample audio files for testing:

### OpenAI Whisper Samples
OpenAI provides [sample audio files](https://github.com/openai/whisper/tree/main/samples) that work well with their Whisper API.

### Mozilla DeepSpeech Test Files
The [DeepSpeech repository](https://github.com/mozilla/DeepSpeech/tree/master/data/smoke_test) contains small test audio files.

## Preparing Audio Files for Testing

1. Ensure the audio file is in MP3 or WAV format
2. Keep the file size under 25MB for optimal performance
3. Place the file in this directory
4. Update the `AUDIO_FILE_PATH` in the reference system script to point to your file

## Testing with Multiple Files

To test batch processing capabilities:

1. Create a directory called `audio-samples` in this directory
2. Place multiple audio files in the directory
3. Update the batch processing script to point to this directory

## Legal Considerations

When creating or using audio files for testing:

1. Do not use copyrighted material without permission
2. Do not include sensitive or personal information
3. If recording real people, obtain their consent
4. Consider using fictional scenarios rather than real cases

---

Remember that the quality of transcription and entity extraction will depend on the clarity and quality of the audio files used for testing. 