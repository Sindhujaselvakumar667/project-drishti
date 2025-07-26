/**
 * AI-Powered Lost & Found Service for Project Drishti
 * Uses Google Vertex AI Vision and Gemini for face matching and person identification
 */

import axios from 'axios';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';

class LostAndFoundService {
  constructor() {
    this.isInitialized = false;
    this.apiKey = process.env.REACT_APP_GOOGLE_CLOUD_API_KEY;
    this.projectId = process.env.REACT_APP_GOOGLE_CLOUD_PROJECT_ID;
    this.visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`;
    
    // Service state
    this.activeCases = new Map();
    this.searchResults = new Map();
    this.callbacks = {
      onPersonFound: null,
      onNewCase: null,
      onCaseUpdate: null,
      onError: null
    };

    // Configuration
    this.config = {
      faceMatchThreshold: 0.75,
      searchRadius: 500, // meters
      maxSearchDuration: 24 * 60 * 60 * 1000, // 24 hours
      scanInterval: 30000, // 30 seconds
      maxConcurrentCases: 50
    };
  }

  /**
   * Initialize the Lost & Found service
   */
  async initialize(callbacks = {}) {
    try {
      this.callbacks = { ...this.callbacks, ...callbacks };
      
      if (!this.apiKey) {
        throw new Error('Google Cloud API key not configured');
      }

      // Set up Firestore listeners for real-time updates
      this.setupFirestoreListeners();
      
      this.isInitialized = true;
      console.log('Lost & Found Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Lost & Found service:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Initialization failed', error);
      }
      return false;
    }
  }

  /**
   * Report a missing person
   */
  async reportMissingPerson(personData) {
    try {
      const caseData = {
        id: this.generateCaseId(),
        reportedAt: new Date().toISOString(),
        status: 'active',
        priority: this.calculatePriority(personData),
        ...personData,
        searchHistory: [],
        matches: [],
        lastSeen: personData.lastSeen || new Date().toISOString()
      };

      // Extract facial features from reference photo
      if (personData.referencePhoto) {
        caseData.faceFeatures = await this.extractFaceFeatures(personData.referencePhoto);
      }

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'LostAndFound'), caseData);
      caseData.firestoreId = docRef.id;

      // Add to active cases
      this.activeCases.set(caseData.id, caseData);

      // Start automated search
      this.startAutomatedSearch(caseData.id);

      if (this.callbacks.onNewCase) {
        this.callbacks.onNewCase(caseData);
      }

      console.log('Missing person case created:', caseData.id);
      return caseData;
    } catch (error) {
      console.error('Failed to report missing person:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to create case', error);
      }
      return null;
    }
  }

  /**
   * Search for a person in surveillance feeds
   */
  async searchInSurveillanceFeeds(caseId, videoFrames) {
    try {
      const caseData = this.activeCases.get(caseId);
      if (!caseData) {
        throw new Error('Case not found');
      }

      const matches = [];
      
      for (const frame of videoFrames) {
        const detectedFaces = await this.detectFacesInFrame(frame);
        
        for (const face of detectedFaces) {
          const similarity = await this.compareFaces(
            caseData.faceFeatures,
            face.features
          );

          if (similarity > this.config.faceMatchThreshold) {
            matches.push({
              similarity,
              timestamp: frame.timestamp,
              location: frame.location,
              boundingBox: face.boundingBox,
              confidence: similarity,
              frameId: frame.id
            });
          }
        }
      }

      // Update case with new matches
      if (matches.length > 0) {
        await this.updateCaseMatches(caseId, matches);
        
        // Check if we have a high-confidence match
        const bestMatch = matches.reduce((best, current) => 
          current.similarity > best.similarity ? current : best
        );

        if (bestMatch.similarity > 0.9) {
          await this.handlePersonFound(caseId, bestMatch);
        }
      }

      return matches;
    } catch (error) {
      console.error('Surveillance search failed:', error);
      return [];
    }
  }

  /**
   * Extract facial features using Google Vision API
   */
  async extractFaceFeatures(imageData) {
    try {
      const requestBody = {
        requests: [{
          image: {
            content: imageData
          },
          features: [
            { type: 'FACE_DETECTION', maxResults: 1 },
            { type: 'LANDMARK_DETECTION', maxResults: 10 }
          ]
        }]
      };

      const response = await axios.post(this.visionApiUrl, requestBody);
      const faceAnnotations = response.data.responses[0].faceAnnotations;

      if (faceAnnotations && faceAnnotations.length > 0) {
        const face = faceAnnotations[0];
        return {
          landmarks: face.landmarks,
          boundingPoly: face.boundingPoly,
          fdBoundingPoly: face.fdBoundingPoly,
          rollAngle: face.rollAngle,
          panAngle: face.panAngle,
          tiltAngle: face.tiltAngle,
          detectionConfidence: face.detectionConfidence
        };
      }

      return null;
    } catch (error) {
      console.error('Face feature extraction failed:', error);
      return null;
    }
  }

  /**
   * Detect faces in video frame
   */
  async detectFacesInFrame(frame) {
    try {
      const requestBody = {
        requests: [{
          image: {
            content: frame.imageData
          },
          features: [
            { type: 'FACE_DETECTION', maxResults: 10 }
          ]
        }]
      };

      const response = await axios.post(this.visionApiUrl, requestBody);
      const faceAnnotations = response.data.responses[0].faceAnnotations || [];

      return faceAnnotations.map(face => ({
        features: {
          landmarks: face.landmarks,
          boundingPoly: face.boundingPoly,
          fdBoundingPoly: face.fdBoundingPoly,
          rollAngle: face.rollAngle,
          panAngle: face.panAngle,
          tiltAngle: face.tiltAngle,
          detectionConfidence: face.detectionConfidence
        },
        boundingBox: face.boundingPoly
      }));
    } catch (error) {
      console.error('Face detection failed:', error);
      return [];
    }
  }

  /**
   * Compare two sets of facial features
   */
  async compareFaces(features1, features2) {
    try {
      // Simple similarity calculation based on landmark positions
      if (!features1.landmarks || !features2.landmarks) {
        return 0;
      }

      let totalDistance = 0;
      let comparedLandmarks = 0;

      for (const landmark1 of features1.landmarks) {
        const landmark2 = features2.landmarks.find(l => l.type === landmark1.type);
        if (landmark2) {
          const distance = this.calculateDistance(
            landmark1.position,
            landmark2.position
          );
          totalDistance += distance;
          comparedLandmarks++;
        }
      }

      if (comparedLandmarks === 0) return 0;

      // Convert distance to similarity score (0-1)
      const avgDistance = totalDistance / comparedLandmarks;
      const similarity = Math.max(0, 1 - (avgDistance / 100)); // Normalize

      return similarity;
    } catch (error) {
      console.error('Face comparison failed:', error);
      return 0;
    }
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Handle when a person is found
   */
  async handlePersonFound(caseId, match) {
    try {
      const caseData = this.activeCases.get(caseId);
      if (!caseData) return;

      // Update case status
      caseData.status = 'found';
      caseData.foundAt = new Date().toISOString();
      caseData.foundLocation = match.location;
      caseData.foundMatch = match;

      // Update in Firestore
      await this.updateCaseInFirestore(caseData);

      // Stop automated search
      this.stopAutomatedSearch(caseId);

      // Notify callbacks
      if (this.callbacks.onPersonFound) {
        this.callbacks.onPersonFound({
          caseId,
          caseData,
          match,
          timestamp: new Date().toISOString()
        });
      }

      console.log('Person found for case:', caseId);
    } catch (error) {
      console.error('Failed to handle person found:', error);
    }
  }

  /**
   * Start automated search for a case
   */
  startAutomatedSearch(caseId) {
    const interval = setInterval(async () => {
      try {
        const caseData = this.activeCases.get(caseId);
        if (!caseData || caseData.status !== 'active') {
          clearInterval(interval);
          return;
        }

        // Check if search duration exceeded
        const searchDuration = Date.now() - new Date(caseData.reportedAt).getTime();
        if (searchDuration > this.config.maxSearchDuration) {
          await this.expireCase(caseId);
          clearInterval(interval);
          return;
        }

        // Simulate getting latest video frames (in real implementation, this would come from video feeds)
        // For demo purposes, we'll skip the actual search
        console.log(`Automated search running for case: ${caseId}`);
        
      } catch (error) {
        console.error('Automated search error:', error);
      }
    }, this.config.scanInterval);

    // Store interval reference for cleanup
    if (!this.searchIntervals) {
      this.searchIntervals = new Map();
    }
    this.searchIntervals.set(caseId, interval);
  }

  /**
   * Stop automated search
   */
  stopAutomatedSearch(caseId) {
    if (this.searchIntervals && this.searchIntervals.has(caseId)) {
      clearInterval(this.searchIntervals.get(caseId));
      this.searchIntervals.delete(caseId);
    }
  }

  /**
   * Calculate case priority
   */
  calculatePriority(personData) {
    let priority = 'medium';
    
    if (personData.age < 12 || personData.age > 70) {
      priority = 'high';
    }
    
    if (personData.medicalConditions || personData.specialNeeds) {
      priority = 'critical';
    }
    
    return priority;
  }

  /**
   * Generate unique case ID
   */
  generateCaseId() {
    return `LF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup Firestore listeners
   */
  setupFirestoreListeners() {
    const q = query(
      collection(db, 'LostAndFound'),
      where('status', '==', 'active'),
      orderBy('reportedAt', 'desc')
    );

    onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'added') {
          this.activeCases.set(data.id, data);
        } else if (change.type === 'modified') {
          this.activeCases.set(data.id, data);
          if (this.callbacks.onCaseUpdate) {
            this.callbacks.onCaseUpdate(data);
          }
        } else if (change.type === 'removed') {
          this.activeCases.delete(data.id);
        }
      });
    });
  }

  /**
   * Update case matches
   */
  async updateCaseMatches(caseId, newMatches) {
    const caseData = this.activeCases.get(caseId);
    if (caseData) {
      caseData.matches = [...(caseData.matches || []), ...newMatches];
      await this.updateCaseInFirestore(caseData);
    }
  }

  /**
   * Update case in Firestore
   */
  async updateCaseInFirestore(caseData) {
    // In a real implementation, you would update the Firestore document
    console.log('Updating case in Firestore:', caseData.id);
  }

  /**
   * Expire a case
   */
  async expireCase(caseId) {
    const caseData = this.activeCases.get(caseId);
    if (caseData) {
      caseData.status = 'expired';
      caseData.expiredAt = new Date().toISOString();
      await this.updateCaseInFirestore(caseData);
      this.stopAutomatedSearch(caseId);
    }
  }

  /**
   * Get all active cases
   */
  getActiveCases() {
    return Array.from(this.activeCases.values());
  }

  /**
   * Get case by ID
   */
  getCase(caseId) {
    return this.activeCases.get(caseId);
  }

  /**
   * Cleanup and destroy service
   */
  destroy() {
    // Stop all automated searches
    if (this.searchIntervals) {
      for (const interval of this.searchIntervals.values()) {
        clearInterval(interval);
      }
      this.searchIntervals.clear();
    }

    this.activeCases.clear();
    this.isInitialized = false;
    console.log('Lost & Found Service destroyed');
  }
}

export default LostAndFoundService;
