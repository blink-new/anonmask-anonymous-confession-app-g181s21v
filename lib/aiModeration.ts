import { blink } from './blink';

export interface ModerationResult {
  isApproved: boolean;
  flags: string[];
  severity: 'low' | 'medium' | 'high';
  reason?: string;
  suggestedAction: 'approve' | 'review' | 'reject';
}

export class AIContentModerator {
  private static instance: AIContentModerator;

  public static getInstance(): AIContentModerator {
    if (!AIContentModerator.instance) {
      AIContentModerator.instance = new AIContentModerator();
    }
    return AIContentModerator.instance;
  }

  async moderateContent(content: string, category?: string): Promise<ModerationResult> {
    try {
      const moderationPrompt = `
        You are an AI content moderator for an anonymous confession app. Analyze this confession for:
        
        1. Harmful content (violence, self-harm, illegal activities)
        2. Personal information that could identify someone
        3. Spam or promotional content
        4. Hate speech or harassment
        5. Inappropriate sexual content
        
        Content to moderate: "${content}"
        Category: ${category || 'general'}
        
        Consider that this is an anonymous confession app where people share personal struggles, regrets, and emotions. Be understanding of mental health discussions while flagging genuinely harmful content.
        
        Respond with JSON format:
        {
          "isApproved": boolean,
          "flags": ["flag1", "flag2"],
          "severity": "low" | "medium" | "high",
          "reason": "brief explanation",
          "suggestedAction": "approve" | "review" | "reject"
        }
      `;

      const { object: result } = await blink.ai.generateObject({
        prompt: moderationPrompt,
        schema: {
          type: 'object',
          properties: {
            isApproved: { type: 'boolean' },
            flags: { 
              type: 'array',
              items: { type: 'string' }
            },
            severity: { 
              type: 'string',
              enum: ['low', 'medium', 'high']
            },
            reason: { type: 'string' },
            suggestedAction: {
              type: 'string',
              enum: ['approve', 'review', 'reject']
            }
          },
          required: ['isApproved', 'flags', 'severity', 'suggestedAction']
        }
      });

      return result as ModerationResult;
    } catch (error) {
      console.error('AI moderation failed:', error);
      
      // Fallback: basic keyword filtering
      return this.basicModerationFallback(content);
    }
  }

  private basicModerationFallback(content: string): ModerationResult {
    const harmfulKeywords = [
      'kill myself', 'suicide', 'end my life', 'hurt myself',
      'bomb', 'terrorist', 'murder', 'illegal drugs',
      'phone number', 'email', 'address', 'full name'
    ];

    const flags: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const keyword of harmfulKeywords) {
      if (lowerContent.includes(keyword)) {
        if (keyword.includes('kill') || keyword.includes('suicide') || keyword.includes('hurt')) {
          flags.push('self-harm');
        } else if (keyword.includes('bomb') || keyword.includes('terrorist') || keyword.includes('murder')) {
          flags.push('violence');
        } else if (keyword.includes('phone') || keyword.includes('email') || keyword.includes('address')) {
          flags.push('personal-info');
        }
      }
    }

    const severity = flags.length > 2 ? 'high' : flags.length > 0 ? 'medium' : 'low';
    const isApproved = flags.length === 0;
    const suggestedAction = flags.length > 2 ? 'reject' : flags.length > 0 ? 'review' : 'approve';

    return {
      isApproved,
      flags,
      severity,
      reason: flags.length > 0 ? 'Content flagged by basic keyword filter' : 'Content appears safe',
      suggestedAction
    };
  }

  async generateSentimentAnalysis(content: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    emotionalImpact: number;
    themes: string[];
    supportLevel: 'low' | 'medium' | 'high';
  }> {
    try {
      const sentimentPrompt = `
        Analyze the emotional content and themes of this anonymous confession:
        
        "${content}"
        
        Provide analysis for:
        1. Overall sentiment (positive, neutral, negative)
        2. Emotional impact score (1-10, how much this might resonate with others)
        3. Main themes present (max 3)
        4. Support level needed (how much support/empathy this person might need)
        
        Respond with JSON format:
        {
          "sentiment": "positive" | "neutral" | "negative",
          "emotionalImpact": number (1-10),
          "themes": ["theme1", "theme2", "theme3"],
          "supportLevel": "low" | "medium" | "high"
        }
      `;

      const { object: analysis } = await blink.ai.generateObject({
        prompt: sentimentPrompt,
        schema: {
          type: 'object',
          properties: {
            sentiment: {
              type: 'string',
              enum: ['positive', 'neutral', 'negative']
            },
            emotionalImpact: {
              type: 'number',
              minimum: 1,
              maximum: 10
            },
            themes: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 3
            },
            supportLevel: {
              type: 'string',
              enum: ['low', 'medium', 'high']
            }
          },
          required: ['sentiment', 'emotionalImpact', 'themes', 'supportLevel']
        }
      });

      return analysis as any;
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      
      // Fallback analysis
      return {
        sentiment: 'neutral',
        emotionalImpact: 5,
        themes: ['general'],
        supportLevel: 'medium'
      };
    }
  }

  async generateSupportiveResponse(content: string, sentiment: string): Promise<string> {
    try {
      const responsePrompt = `
        Generate a brief, supportive, anonymous response to this confession:
        
        "${content}"
        
        Sentiment: ${sentiment}
        
        Guidelines:
        - Be empathetic and non-judgmental
        - Keep it under 100 words
        - Don't give medical advice
        - Focus on validation and hope
        - Use inclusive, supportive language
        
        Generate a caring response that shows the person they're not alone.
      `;

      const { text } = await blink.ai.generateText({
        prompt: responsePrompt,
        maxTokens: 150
      });

      return text.trim();
    } catch (error) {
      console.error('Failed to generate supportive response:', error);
      return "Thank you for sharing. Your feelings are valid, and you're not alone in this experience. 💙";
    }
  }
}

export const aiModerator = AIContentModerator.getInstance();