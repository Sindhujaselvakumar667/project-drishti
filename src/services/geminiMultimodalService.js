/**
 * Enhanced Gemini Multimodal AI Service for Project Drishti
 * Provides advanced AI capabilities including:
 * - Multimodal crowd analysis (video + audio + text)
 * - Sentiment analysis from social media
 * - Anomaly detection (fire, smoke, panic)
 * - Lost & Found face matching
 * - Natural language situational summaries
 */

import axios from 'axios';

class GeminiMultimodalService {
  constructor() {
    this.isInitialized = false;
    this.apiKey = process.env.REACT_APP_GOOGLE_CLOUD_API_KEY;
    this.projectId = process.env.REACT_APP_GOOGLE_CLOUD_PROJECT_ID;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    
    // Service configuration
    this.config = {
      model: 'gemini-1.5-pro',
      maxTokens: 2048,
      temperature: 0.3,
      topP: 0.8,
      topK: 40,
      
      // Analysis intervals
      videoAnalysisInterval: 10000, // 10 seconds
      sentimentAnalysisInterval: 30000, // 30 seconds
      anomalyDetectionInterval: 5000, // 5 seconds
      
      // Confidence thresholds
      anomalyThreshold: 0.7,
      sentimentThreshold: 0.6,
      faceMatchThreshold: 0.8,
    };

    // Analysis state
    this.analysisState = {
      lastVideoAnalysis: null,
      lastSentimentAnalysis: null,
      lastAnomalyDetection: null,
      activeAlerts: [],
      crowdSentiment: 'neutral',
      detectedAnomalies: [],
    };

    // Event callbacks
    this.callbacks = {
      onAnomalyDetected: null,
      onSentimentChange: null,
      onSituationalSummary: null,
      onFaceMatch: null,
      onError: null,
    };
  }

  /**
   * Initialize the Gemini service
   */
  async initialize(callbacks = {}) {
    try {
      this.callbacks = { ...this.callbacks, ...callbacks };
      
      if (!this.apiKey) {
        throw new Error('Google Cloud API key not configured');
      }

      // Test API connection
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('Gemini Multimodal Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Initialization failed', error);
      }
      return false;
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    const response = await axios.get(
      `${this.baseUrl}/models?key=${this.apiKey}`
    );
    return response.status === 200;
  }

  /**
   * Analyze video frame for crowd behavior and anomalies
   */
  async analyzeVideoFrame(imageData, context = {}) {
    try {
      const prompt = `
        Analyze this crowd surveillance image for:
        1. Crowd density and behavior patterns
        2. Signs of panic, distress, or unusual movement
        3. Potential safety hazards (fire, smoke, structural issues)
        4. Emergency situations requiring immediate attention
        5. Overall crowd sentiment and mood
        
        Context: ${JSON.stringify(context)}
        
        Provide a JSON response with:
        - crowdDensity: (low/medium/high/critical)
        - behaviorAnalysis: detailed description
        - anomalies: array of detected anomalies with confidence scores
        - sentimentScore: (-1 to 1, negative to positive)
        - urgencyLevel: (low/medium/high/critical)
        - recommendations: array of suggested actions
      `;

      const response = await this.callGeminiAPI(prompt, imageData);
      const analysis = this.parseAnalysisResponse(response);
      
      this.analysisState.lastVideoAnalysis = {
        timestamp: new Date().toISOString(),
        analysis,
        context
      };

      // Check for anomalies
      if (analysis.anomalies && analysis.anomalies.length > 0) {
        this.handleAnomalyDetection(analysis.anomalies);
      }

      // Check for sentiment changes
      if (analysis.sentimentScore !== undefined) {
        this.handleSentimentChange(analysis.sentimentScore);
      }

      return analysis;
    } catch (error) {
      console.error('Video analysis failed:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Video analysis failed', error);
      }
      return null;
    }
  }

  /**
   * Generate natural language situational summary
   */
  async generateSituationalSummary(zone, timeRange = '15min') {
    try {
      const prompt = `
        Generate a concise situational summary for security command:
        
        Zone: ${zone}
        Time Range: Last ${timeRange}
        Current Data: ${JSON.stringify(this.analysisState)}
        
        Provide a professional briefing including:
        1. Current crowd status and density
        2. Any active alerts or concerns
        3. Trend analysis (improving/stable/deteriorating)
        4. Recommended actions
        5. Resource allocation suggestions
        
        Keep it under 200 words, professional tone.
      `;

      const response = await this.callGeminiAPI(prompt);
      const summary = response.candidates[0].content.parts[0].text;
      
      if (this.callbacks.onSituationalSummary) {
        this.callbacks.onSituationalSummary({
          zone,
          timeRange,
          summary,
          timestamp: new Date().toISOString()
        });
      }

      return summary;
    } catch (error) {
      console.error('Situational summary generation failed:', error);
      return 'Unable to generate summary at this time.';
    }
  }

  /**
   * Analyze social media sentiment for crowd mood
   */
  async analyzeSocialSentiment(posts) {
    try {
      const prompt = `
        Analyze these social media posts from event attendees for crowd sentiment:
        
        Posts: ${JSON.stringify(posts)}
        
        Provide analysis including:
        - Overall sentiment score (-1 to 1)
        - Key themes and concerns
        - Potential safety issues mentioned
        - Crowd mood indicators
        - Early warning signs of problems
        
        Return as JSON.
      `;

      const response = await this.callGeminiAPI(prompt);
      const sentimentAnalysis = this.parseAnalysisResponse(response);
      
      this.analysisState.lastSentimentAnalysis = {
        timestamp: new Date().toISOString(),
        analysis: sentimentAnalysis,
        postCount: posts.length
      };

      return sentimentAnalysis;
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return null;
    }
  }

  /**
   * Face matching for Lost & Found
   */
  async findMissingPerson(referenceImage, searchImages) {
    try {
      const prompt = `
        Compare the reference person image with these surveillance images to find matches:
        
        Task: Face matching for missing person identification
        Confidence threshold: ${this.config.faceMatchThreshold}
        
        Analyze facial features, clothing, and distinctive characteristics.
        Return matches with confidence scores and location timestamps.
        
        Provide JSON response with:
        - matches: array of potential matches with confidence scores
        - bestMatch: highest confidence match details
        - recommendations: suggested follow-up actions
      `;

      const images = [referenceImage, ...searchImages];
      const response = await this.callGeminiAPI(prompt, images);
      const matchResults = this.parseAnalysisResponse(response);
      
      if (matchResults.bestMatch && matchResults.bestMatch.confidence > this.config.faceMatchThreshold) {
        if (this.callbacks.onFaceMatch) {
          this.callbacks.onFaceMatch(matchResults);
        }
      }

      return matchResults;
    } catch (error) {
      console.error('Face matching failed:', error);
      return null;
    }
  }

  /**
   * Call Gemini API with multimodal input
   */
  async callGeminiAPI(prompt, images = null) {
    const url = `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.apiKey}`;
    
    const parts = [{ text: prompt }];
    
    if (images) {
      const imageArray = Array.isArray(images) ? images : [images];
      for (const image of imageArray) {
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: image
          }
        });
      }
    }

    const requestBody = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        topP: this.config.topP,
        topK: this.config.topK
      }
    };

    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  /**
   * Parse and validate analysis response
   */
  parseAnalysisResponse(response) {
    try {
      const text = response.candidates[0].content.parts[0].text;
      
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback to text response
      return { analysis: text, raw: true };
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      return { error: 'Failed to parse response', raw: response };
    }
  }

  /**
   * Handle anomaly detection
   */
  handleAnomalyDetection(anomalies) {
    const criticalAnomalies = anomalies.filter(
      a => a.confidence > this.config.anomalyThreshold
    );

    if (criticalAnomalies.length > 0 && this.callbacks.onAnomalyDetected) {
      this.callbacks.onAnomalyDetected({
        anomalies: criticalAnomalies,
        timestamp: new Date().toISOString(),
        severity: this.calculateSeverity(criticalAnomalies)
      });
    }

    this.analysisState.detectedAnomalies = anomalies;
  }

  /**
   * Handle sentiment changes
   */
  handleSentimentChange(sentimentScore) {
    const previousSentiment = this.analysisState.crowdSentiment;
    const newSentiment = this.categorizeSentiment(sentimentScore);
    
    if (newSentiment !== previousSentiment && this.callbacks.onSentimentChange) {
      this.callbacks.onSentimentChange({
        previous: previousSentiment,
        current: newSentiment,
        score: sentimentScore,
        timestamp: new Date().toISOString()
      });
    }

    this.analysisState.crowdSentiment = newSentiment;
  }

  /**
   * Calculate severity level
   */
  calculateSeverity(anomalies) {
    const maxConfidence = Math.max(...anomalies.map(a => a.confidence));
    if (maxConfidence > 0.9) return 'critical';
    if (maxConfidence > 0.8) return 'high';
    if (maxConfidence > 0.7) return 'medium';
    return 'low';
  }

  /**
   * Categorize sentiment score
   */
  categorizeSentiment(score) {
    if (score > 0.3) return 'positive';
    if (score < -0.3) return 'negative';
    return 'neutral';
  }

  /**
   * Get current analysis state
   */
  getAnalysisState() {
    return { ...this.analysisState };
  }

  /**
   * Cleanup and destroy service
   */
  destroy() {
    this.isInitialized = false;
    this.analysisState = {
      lastVideoAnalysis: null,
      lastSentimentAnalysis: null,
      lastAnomalyDetection: null,
      activeAlerts: [],
      crowdSentiment: 'neutral',
      detectedAnomalies: [],
    };
    console.log('Gemini Multimodal Service destroyed');
  }
}

export default GeminiMultimodalService;
