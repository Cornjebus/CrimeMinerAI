import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import dotenv from 'dotenv';
import { AIMessage, BaseMessage } from '@langchain/core/messages';

dotenv.config();

// Check if we have a valid API key (not starting with "sk-mock")
const hasValidApiKey = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-mock');
const useMockResponses = !hasValidApiKey;

console.log(`Using ${useMockResponses ? 'MOCK' : 'ACTUAL'} OpenAI responses`);

// Base OpenAI chat model with moderate temperature for general use
let openai: ChatOpenAI | null = null;
let preciseOpenAI: ChatOpenAI | null = null;

if (!useMockResponses) {
  openai = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.2,
    modelName: "gpt-4", // Using GPT-4 as requested
    timeout: 180000, // 180 second timeout (3 minutes)
  });

  // Specialized instance for entity extraction with lower temperature
  preciseOpenAI = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.1,
    modelName: "gpt-4", // Using GPT-4 as requested
    timeout: 180000, // 180 second timeout (3 minutes)
  });
}

// Helper function to get text content from an AI message
const getMessageText = (message: BaseMessage | string): string => {
  if (typeof message === 'string') return message;
  if (message instanceof AIMessage) return message.content.toString();
  return typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
};

// Mock implementation when no valid API key is provided
const mockInvoke = async (promptText: string) => {
  console.log("MOCK AI: Received prompt:", promptText.substring(0, 100) + "...");
  return "This is a mock response because no valid OpenAI API key was provided. Configure OPENAI_API_KEY in your .env file for actual responses.";
};

// Basic text analysis - original function, maintained for backward compatibility
export async function analyzeText(prompt: string) {
  if (useMockResponses) {
    return mockInvoke(prompt);
  }
  
  const result = await openai!.invoke(prompt);
  return getMessageText(result);
}

// Entity extraction with structured output
export async function extractEntities(text: string) {
  if (useMockResponses) {
    return {
      people: [
        { name: "John Doe", role: "Suspect", confidence: 0.9 }
      ],
      locations: [
        { name: "Central Park", details: "Crime scene", confidence: 0.85 }
      ],
      organizations: [],
      dates: [
        { date: "2023-01-15", event: "Incident date", confidence: 0.95 }
      ],
      weapons: [],
      vehicles: []
    };
  }

  // Check if the text contains timestamps in the format [HH:MM:SS - HH:MM:SS]
  const hasTimestamps = /\[\d{2}:\d{2}:\d{2} - \d{2}:\d{2}:\d{2}\]/.test(text);
  
  const entityParser = StructuredOutputParser.fromZodSchema(
    z.object({
      people: z.array(z.object({
        name: z.string().describe("Full name of the person"),
        importance: z.string().describe("Role or importance in the text"),
        confidence: z.number().describe("Confidence score 0-1"),
        timestamp: hasTimestamps ? z.string().optional().describe("Timestamp when the person was mentioned") : z.string().optional()
      })).describe("People mentioned in the text"),
      locations: z.array(z.object({
        name: z.string().describe("Name of the location"),
        type: z.string().describe("Type of location (city, building, etc.)"),
        confidence: z.number().describe("Confidence score 0-1"),
        timestamp: hasTimestamps ? z.string().optional().describe("Timestamp when the location was mentioned") : z.string().optional()
      })).describe("Locations mentioned in the text"),
      organizations: z.array(z.object({
        name: z.string().describe("Name of the organization"),
        type: z.string().describe("Type of organization"),
        confidence: z.number().describe("Confidence score 0-1"),
        timestamp: hasTimestamps ? z.string().optional().describe("Timestamp when the organization was mentioned") : z.string().optional()
      })).describe("Organizations mentioned in the text"),
      dates: z.array(z.object({
        date: z.string().describe("Date mentioned"),
        context: z.string().describe("Context of the date"),
        confidence: z.number().describe("Confidence score 0-1"),
        timestamp: hasTimestamps ? z.string().optional().describe("Timestamp when the date was mentioned") : z.string().optional()
      })).describe("Dates mentioned in the text"),
      weapons: z.array(z.object({
        type: z.string().describe("Type of weapon"),
        details: z.string().describe("Details about the weapon"),
        confidence: z.number().describe("Confidence score 0-1"),
        timestamp: hasTimestamps ? z.string().optional().describe("Timestamp when the weapon was mentioned") : z.string().optional()
      })).optional().describe("Weapons mentioned in the text"),
      vehicles: z.array(z.object({
        type: z.string().describe("Type of vehicle"),
        details: z.string().describe("Details about the vehicle"),
        confidence: z.number().describe("Confidence score 0-1"),
        timestamp: hasTimestamps ? z.string().optional().describe("Timestamp when the vehicle was mentioned") : z.string().optional()
      })).optional().describe("Vehicles mentioned in the text"),
    })
  );

  const formatInstructions = entityParser.getFormatInstructions();

  const promptTemplate = hasTimestamps ? 
    `You are a forensic analyst specializing in entity extraction for law enforcement.
    Extract all relevant entities from the following text. Focus on people, locations, organizations, dates, and any mentions of weapons or vehicles.
    Only extract entities that are explicitly mentioned in the text.
    Assign confidence scores based on how clearly the entity is mentioned.
    
    IMPORTANT: This text contains timestamps in the format [HH:MM:SS - HH:MM:SS]. For each entity, include the timestamp of when it was first mentioned.
    
    TEXT: {text}
    
    {format_instructions}` :
    `You are a forensic analyst specializing in entity extraction for law enforcement.
    Extract all relevant entities from the following text. Focus on people, locations, organizations, dates, and any mentions of weapons or vehicles.
    Only extract entities that are explicitly mentioned in the text.
    Assign confidence scores based on how clearly the entity is mentioned.
    
    TEXT: {text}
    
    {format_instructions}`;

  const prompt = new PromptTemplate({
    template: promptTemplate,
    inputVariables: ["text"],
    partialVariables: { format_instructions: formatInstructions },
  });

  const input = await prompt.format({ text });
  const response = await preciseOpenAI!.invoke(input);
  const responseText = getMessageText(response);
  
  try {
    return entityParser.parse(responseText);
  } catch (error) {
    console.error("Error parsing entity extraction response:", error);
    return { error: "Failed to parse entities", rawResponse: responseText };
  }
}

// Evidence summarization
export async function summarizeEvidence(text: string, maxLength: number = 200) {
  if (useMockResponses) {
    return {
      summary: "This is a mock summary of the evidence.",
      keyFindings: ["Mock finding 1", "Mock finding 2"],
      relevanceScore: 8,
      reliabilityAssessment: "Moderate reliability based on available information."
    };
  }
  
  const summaryParser = StructuredOutputParser.fromZodSchema(
    z.object({
      summary: z.string().describe("Concise summary of the key points"),
      keyFindings: z.array(z.string()).describe("List of key findings"),
      relevanceScore: z.number().min(0).max(10).describe("Relevance to investigation (0-10)"),
      reliabilityAssessment: z.string().describe("Assessment of reliability of the information"),
    })
  );

  const formatInstructions = summaryParser.getFormatInstructions();

  const prompt = new PromptTemplate({
    template: 
      `You are an investigative analyst summarizing evidence for law enforcement.
      Provide a concise, factual summary of the following text, focusing on elements relevant to an investigation.
      Highlight key findings that may need follow-up.
      Assess the reliability of the information based on internal consistency and specificity.
      The summary should be approximately {maxLength} characters or less.
      
      TEXT: {text}
      
      {format_instructions}`,
    inputVariables: ["text", "maxLength"],
    partialVariables: { format_instructions: formatInstructions },
  });

  const input = await prompt.format({ text, maxLength });
  const response = await openai!.invoke(input);
  const responseText = getMessageText(response);
  
  try {
    return summaryParser.parse(responseText);
  } catch (error) {
    console.error("Error parsing summary response:", error);
    return { error: "Failed to parse summary", rawResponse: responseText };
  }
}

// Sentiment and intent analysis
export async function analyzeSentimentAndIntent(text: string) {
  if (useMockResponses) {
    return {
      overallSentiment: "Neutral",
      sentimentScore: 0,
      emotionalTone: [
        { emotion: "Neutral", confidence: 0.8 }
      ],
      possibleIntents: [
        { 
          intent: "Information sharing", 
          description: "Providing factual information",
          confidence: 0.9,
          textEvidence: "Mock text evidence",
          location: {
            approximatePosition: 0,
            lineNumber: 1,
            charPosition: 0,
            context: "Mock context"
          }
        }
      ],
      threatAssessment: {
        threatLevel: "None",
        explanation: "No threats detected in the text",
        uncertaintyFactors: ["Mock data"]
      }
    };
  }
  
  const sentimentParser = StructuredOutputParser.fromZodSchema(
    z.object({
      overallSentiment: z.string().describe("Overall sentiment of the text"),
      sentimentScore: z.number().min(-1).max(1).describe("Sentiment score from -1 (very negative) to 1 (very positive)"),
      emotionalTone: z.array(z.object({
        emotion: z.string().describe("Identified emotion"),
        confidence: z.number().describe("Confidence score 0-1")
      })).describe("Emotional tones detected"),
      possibleIntents: z.array(z.object({
        intent: z.string().describe("Possible intent"),
        description: z.string().describe("Description of the intent"),
        confidence: z.number().describe("Confidence score 0-1"),
        textEvidence: z.string().describe("The exact text that indicates this intent"),
        location: z.object({
          approximatePosition: z.number().optional().describe("Approximate character position in the text where this intent is evident"),
          exactPosition: z.number().optional().describe("Exact character position in the text where this intent is evident"),
          lineNumber: z.number().optional().describe("Line number in the text where this intent is evident"),
          charPosition: z.number().optional().describe("Character position in the text where this intent is evident"),
          context: z.string().optional().describe("Context surrounding the intent evidence")
        }).describe("Location information for the intent")
      })).describe("Possible intents detected in the text"),
      threatAssessment: z.object({
        threatLevel: z.string().describe("None, Low, Medium, High, or Critical"),
        explanation: z.string().describe("Explanation of threat assessment"),
        uncertaintyFactors: z.array(z.string()).optional().describe("Factors creating uncertainty in the assessment")
      }).describe("Assessment of potential threats in the text"),
    })
  );

  const formatInstructions = sentimentParser.getFormatInstructions();

  const prompt = new PromptTemplate({
    template: 
      `You are a behavioral analyst for law enforcement analyzing text evidence.
      Analyze the sentiment, emotional tone, and possible intents in the following text.
      Provide a threat assessment based on language, sentiment, and expressed intents.
      Be conservative in threat assessments - only elevate threat levels when there is clear evidence.
      
      For each intent you identify, you MUST:
      1. Include the exact text evidence that indicates this intent
      2. Provide the approximate character position in the text where this intent is evident
      
      TEXT: {text}
      
      {format_instructions}`,
    inputVariables: ["text"],
    partialVariables: { format_instructions: formatInstructions },
  });

  const input = await prompt.format({ text });
  const response = await openai!.invoke(input);
  const responseText = getMessageText(response);
  
  try {
    const result = await sentimentParser.parse(responseText);
    
    // Post-process to find exact locations for each intent
    if (result.possibleIntents && Array.isArray(result.possibleIntents)) {
      for (const intent of result.possibleIntents) {
        if (intent.textEvidence) {
          // Find the exact position of the evidence in the text
          const position = text.indexOf(intent.textEvidence);
          if (position !== -1) {
            intent.location.exactPosition = position;
            
            // Calculate line number and character position
            const textBeforeEvidence = text.substring(0, position);
            const lineNumber = (textBeforeEvidence.match(/\n/g) || []).length + 1;
            
            // Find the start of the line
            const lastNewlineBeforeEvidence = textBeforeEvidence.lastIndexOf('\n');
            const charPosition = position - (lastNewlineBeforeEvidence === -1 ? 0 : lastNewlineBeforeEvidence + 1);
            
            intent.location.lineNumber = lineNumber;
            intent.location.charPosition = charPosition;
            
            // Extract surrounding context
            const lines = text.split('\n');
            const contextSize = 2; // Number of lines before and after
            const startLine = Math.max(0, lineNumber - 1 - contextSize);
            const endLine = Math.min(lines.length - 1, lineNumber - 1 + contextSize);
            
            intent.location.context = lines.slice(startLine, endLine + 1).join('\n');
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error parsing sentiment analysis response:", error);
    return { error: "Failed to parse sentiment analysis", rawResponse: responseText };
  }
}

// Criminal pattern identification
export async function identifyPatterns(text: string) {
  if (useMockResponses) {
    return {
      identifiedPatterns: [
        { 
          pattern: "Mock pattern", 
          description: "This is a mock pattern",
          confidence: 0.8,
          evidencePoints: ["Mock evidence 1", "Mock evidence 2"]
        }
      ],
      suggestedLeads: [
        {
          description: "Mock lead 1",
          priority: "High",
          rationale: "Mock rationale"
        }
      ],
      modusOperandi: {
        description: "Mock modus operandi",
        confidence: 0.75,
        characteristics: ["Mock characteristic 1"]
      },
      similarCaseIndicators: ["Mock indicator 1"]
    };
  }
  
  // Limit text length to prevent timeouts
  const truncatedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
  
  const patternParser = StructuredOutputParser.fromZodSchema(
    z.object({
      identifiedPatterns: z.array(z.object({
        patternType: z.string().describe("Type of pattern identified"),
        description: z.string().describe("Description of the pattern"),
        relevantExcerpts: z.array(z.string()).describe("Relevant excerpts from the text"),
        confidence: z.number().describe("Confidence score 0-1")
      })).describe("Criminal patterns identified in the text - be comprehensive and identify as many patterns as possible"),
      modusOperandi: z.object({
        description: z.string().describe("Description of the modus operandi if applicable"),
        confidence: z.number().describe("Confidence score 0-1")
      }).optional().nullable().describe("Identified modus operandi"),
      suggestedLeads: z.array(z.object({
        description: z.string().describe("Description of a potential lead to follow"),
        priority: z.string().describe("Priority level (Low, Medium, High)"),
        rationale: z.string().describe("Rationale for following this lead")
      })).describe("Suggested investigative leads based on patterns - be thorough and identify at least 8-10 potential leads if possible"),
      similarCaseIndicators: z.array(z.string()).optional().describe("Indicators that might connect to similar cases")
    })
  );

  const formatInstructions = patternParser.getFormatInstructions();

  const prompt = new PromptTemplate({
    template: 
      `You are a criminal intelligence analyst specializing in pattern recognition.
      Analyze the following text to identify potential criminal patterns, modus operandi, and connections.
      
      IMPORTANT INSTRUCTIONS:
      1. Be comprehensive - identify as many patterns as possible, even subtle ones
      2. Suggest at least 8-10 investigative leads based on your analysis, ranging from high to low priority
      3. Be factual and avoid speculation - clearly indicate confidence levels for all findings
      4. If there's not enough information to identify patterns, state this clearly
      5. If there is no clear modus operandi, set modusOperandi to null
      
      TEXT: {text}
      
      {format_instructions}`,
    inputVariables: ["text"],
    partialVariables: { format_instructions: formatInstructions },
  });

  const input = await prompt.format({ text: truncatedText });
  
  try {
    const response = await openai!.invoke(input);
    const responseText = getMessageText(response);
    
    return patternParser.parse(responseText);
  } catch (error: any) {
    console.error("Error in pattern identification:", error);
    return { 
      error: "Failed to analyze patterns", 
      details: error.message,
      identifiedPatterns: [],
      suggestedLeads: [],
      modusOperandi: null,
      similarCaseIndicators: []
    };
  }
}
