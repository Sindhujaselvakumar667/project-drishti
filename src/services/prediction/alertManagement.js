import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Alert Management System for Crowd Surge Notifications
 * Handles alert creation, escalation, notification dispatch, and tracking
 */
class AlertManagementSystem {
  constructor() {
    this.isActive = false;
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.notificationQueue = [];
    this.escalationTimers = new Map();

    // Configuration
    this.config = {
      alertTypes: {
        SURGE_PREDICTED: {
          name: 'Crowd Surge Predicted',
          priority: 'high',
          escalationTimeMinutes: 2,
          requiresAcknowledgment: true
        },
        BOTTLENECK_DETECTED: {
          name: 'Bottleneck Detected',
          priority: 'medium',
          escalationTimeMinutes: 3,
          requiresAcknowledgment: true
        },
        CAPACITY_WARNING: {
          name: 'Capacity Warning',
          priority: 'medium',
          escalationTimeMinutes: 5,
          requiresAcknowledgment: false
        },
        MOVEMENT_ANOMALY: {
          name: 'Movement Anomaly',
          priority: 'low',
          escalationTimeMinutes: 10,
          requiresAcknowledgment: false
        }
      },

      notificationChannels: {
        FIREBASE_FCM: {
          enabled: true,
          priority: ['critical', 'high', 'medium'],
          retryAttempts: 3
        },
        EMAIL: {
          enabled: true,
          priority: ['critical', 'high'],
          retryAttempts: 2
        },
        SMS: {
          enabled: false, // Would require additional setup
          priority: ['critical'],
          retryAttempts: 1
        },
        DASHBOARD: {
          enabled: true,
          priority: ['critical', 'high', 'medium', 'low'],
          retryAttempts: 1
        }
      },

      escalationRules: {
        unacknowledgedCritical: 1, // minutes
        unacknowledgedHigh: 2,     // minutes
        unacknowledgedMedium: 5,   // minutes
        maxEscalationLevel: 3
      },

      thresholds: {
        surgeRiskPercentage: 70,
        criticalDensity: 9.0,
        warningDensity: 7.0,
        bottleneckVelocity: 0.3,
        anomalyDeviationFactor: 2.0
      }
    };

    this.callbacks = {
      onAlertCreated: null,
      onAlertEscalated: null,
      onAlertResolved: null,
      onNotificationSent: null,
      onError: null
    };

    // Notification subscribers
    this.subscribers = new Set();
  }

  /**
   * Initialize alert management system
   */
  async initialize(callbacks = {}) {
    try {
      this.callbacks = { ...this.callbacks, ...callbacks };
      this.isActive = true;

      // Setup Firebase listeners for real-time alerts
      this.setupFirebaseListeners();

      // Start notification processing
      this.startNotificationProcessor();

      console.log('Alert Management System initialized');
      return true;

    } catch (error) {
      console.error('Failed to initialize Alert Management System:', error);
      this.handleError('Initialization failed', error);
      return false;
    }
  }

  /**
   * Setup Firebase real-time listeners
   */
  setupFirebaseListeners() {
    // Listen for new alerts
    const alertsQuery = query(
      collection(db, 'SecurityAlerts'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    this.alertsUnsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const alert = { id: change.doc.id, ...change.doc.data() };
          this.handleIncomingAlert(alert);
        }
      });
    });
  }

  /**
   * Handle incoming alerts from Firebase
   */
  handleIncomingAlert(alert) {
    try {
      // Convert Firebase timestamp
      if (alert.timestamp && alert.timestamp.toDate) {
        alert.timestamp = alert.timestamp.toDate();
      }

      // Add to active alerts if not resolved
      if (alert.status === 'Active') {
        this.activeAlerts.set(alert.id, alert);
      }

      // Trigger callback
      if (this.callbacks.onAlertCreated) {
        this.callbacks.onAlertCreated(alert);
      }

      // Notify subscribers
      this.notifySubscribers('alertCreated', alert);

    } catch (error) {
      console.error('Error handling incoming alert:', error);
    }
  }

  /**
   * Create surge prediction alert
   */
  async createSurgeAlert(predictionData) {
    try {
      const alertData = {
        type: 'SURGE_PREDICTED',
        severity: this.determineSeverity(predictionData),
        zone: this.determineAffectedZone(predictionData),
        message: this.generateSurgeMessage(predictionData),
        timestamp: new Date(),
        status: 'Active',
        predictionData: {
          surgeRisk: predictionData.surgeRisk,
          timeToSurge: predictionData.surgeRisk.timeToSurge,
          peakDensity: predictionData.surgeRisk.peakDensity,
          confidence: predictionData.confidence
        },
        recommendations: predictionData.recommendedActions,
        escalationLevel: 0,
        acknowledgedBy: null,
        acknowledgedAt: null
      };

      const alert = await this.createAlert(alertData);

      // Schedule escalation if required
      if (this.config.alertTypes.SURGE_PREDICTED.requiresAcknowledgment) {
        this.scheduleEscalation(alert.id, alertData.severity);
      }

      return alert;

    } catch (error) {
      console.error('Error creating surge alert:', error);
      this.handleError('Failed to create surge alert', error);
      return null;
    }
  }

  /**
   * Create bottleneck detection alert
   */
  async createBottleneckAlert(locationData) {
    try {
      const alertData = {
        type: 'BOTTLENECK_DETECTED',
        severity: 'Medium',
        zone: locationData.zone || 'Unknown Zone',
        message: `Bottleneck detected at ${locationData.zone}. Average velocity: ${locationData.avgVelocity.toFixed(2)} m/s`,
        timestamp: new Date(),
        status: 'Active',
        locationData: {
          coordinates: locationData.coordinates,
          density: locationData.density,
          velocity: locationData.avgVelocity,
          personCount: locationData.personCount
        },
        recommendations: this.generateBottleneckRecommendations(locationData),
        escalationLevel: 0,
        acknowledgedBy: null,
        acknowledgedAt: null
      };

      return await this.createAlert(alertData);

    } catch (error) {
      console.error('Error creating bottleneck alert:', error);
      this.handleError('Failed to create bottleneck alert', error);
      return null;
    }
  }

  /**
   * Create capacity warning alert
   */
  async createCapacityAlert(zoneData) {
    try {
      const occupancyRate = (zoneData.currentCount / zoneData.capacity) * 100;

      const alertData = {
        type: 'CAPACITY_WARNING',
        severity: occupancyRate > 90 ? 'High' : 'Medium',
        zone: zoneData.name,
        message: `Zone capacity at ${occupancyRate.toFixed(1)}% (${zoneData.currentCount}/${zoneData.capacity})`,
        timestamp: new Date(),
        status: 'Active',
        zoneData: {
          name: zoneData.name,
          capacity: zoneData.capacity,
          currentCount: zoneData.currentCount,
          occupancyRate: occupancyRate,
          alertLevel: zoneData.alertLevel
        },
        recommendations: this.generateCapacityRecommendations(zoneData),
        escalationLevel: 0,
        acknowledgedBy: null,
        acknowledgedAt: null
      };

      return await this.createAlert(alertData);

    } catch (error) {
      console.error('Error creating capacity alert:', error);
      this.handleError('Failed to create capacity alert', error);
      return null;
    }
  }

  /**
   * Create generic alert
   */
  async createAlert(alertData) {
    try {
      // Generate unique alert ID
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const alert = {
        id: alertId,
        eventId: 'current_event',
        ...alertData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in Firebase
      const docRef = await addDoc(collection(db, 'SecurityAlerts'), {
        ...alert,
        timestamp: Timestamp.fromDate(alert.timestamp),
        createdAt: Timestamp.fromDate(alert.createdAt),
        updatedAt: Timestamp.fromDate(alert.updatedAt)
      });

      alert.id = docRef.id;

      // Add to local tracking
      this.activeAlerts.set(alert.id, alert);
      this.alertHistory.push(alert);

      // Queue notifications
      await this.queueNotifications(alert);

      console.log(`Alert created: ${alert.type} - ${alert.severity}`);

      return alert;

    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Queue notifications for alert
   */
  async queueNotifications(alert) {
    try {
      const priorityLevel = this.getSeverityPriority(alert.severity);

      Object.keys(this.config.notificationChannels).forEach(channel => {
        const channelConfig = this.config.notificationChannels[channel];

        if (channelConfig.enabled && channelConfig.priority.includes(priorityLevel)) {
          this.notificationQueue.push({
            alertId: alert.id,
            channel: channel,
            alert: alert,
            attempts: 0,
            maxAttempts: channelConfig.retryAttempts,
            scheduledAt: new Date()
          });
        }
      });

    } catch (error) {
      console.error('Error queueing notifications:', error);
    }
  }

  /**
   * Start notification processor
   */
  startNotificationProcessor() {
    const processInterval = 5000; // Process every 5 seconds

    this.notificationProcessor = setInterval(async () => {
      if (this.notificationQueue.length > 0) {
        await this.processNotificationQueue();
      }
    }, processInterval);
  }

  /**
   * Process notification queue
   */
  async processNotificationQueue() {
    const batch = this.notificationQueue.splice(0, 10); // Process 10 at a time

    for (const notification of batch) {
      try {
        await this.sendNotification(notification);
      } catch (error) {
        console.error('Error sending notification:', error);

        // Retry if attempts remaining
        if (notification.attempts < notification.maxAttempts) {
          notification.attempts++;
          this.notificationQueue.push(notification);
        }
      }
    }
  }

  /**
   * Send notification via specified channel
   */
  async sendNotification(notification) {
    const { channel, alert } = notification;

    switch (channel) {
      case 'FIREBASE_FCM':
        await this.sendFCMNotification(alert);
        break;

      case 'EMAIL':
        await this.sendEmailNotification(alert);
        break;

      case 'SMS':
        await this.sendSMSNotification(alert);
        break;

      case 'DASHBOARD':
        await this.sendDashboardNotification(alert);
        break;

      default:
        console.warn(`Unknown notification channel: ${channel}`);
    }

    // Trigger callback
    if (this.callbacks.onNotificationSent) {
      this.callbacks.onNotificationSent(notification);
    }
  }

  /**
   * Send Firebase Cloud Messaging notification
   */
  async sendFCMNotification(alert) {
    // In a real implementation, this would use Firebase Admin SDK
    // For demo purposes, we'll just log and trigger browser notification

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${alert.type}: ${alert.severity}`, {
        body: alert.message,
        icon: '/icon-alert.png',
        tag: alert.id,
        requireInteraction: alert.severity === 'Critical'
      });
    }

    console.log('FCM notification sent:', alert.type);
  }

  /**
   * Send email notification (placeholder)
   */
  async sendEmailNotification(alert) {
    // This would integrate with your email service
    console.log('Email notification sent:', alert.type);
  }

  /**
   * Send SMS notification (placeholder)
   */
  async sendSMSNotification(alert) {
    // This would integrate with SMS service like Twilio
    console.log('SMS notification sent:', alert.type);
  }

  /**
   * Send dashboard notification
   */
  async sendDashboardNotification(alert) {
    // Notify all dashboard subscribers
    this.notifySubscribers('dashboardAlert', alert);
    console.log('Dashboard notification sent:', alert.type);
  }

  /**
   * Schedule alert escalation
   */
  scheduleEscalation(alertId, severity) {
    const escalationTime = this.config.escalationRules[`unacknowledged${severity}`] * 60 * 1000;

    const timer = setTimeout(() => {
      this.escalateAlert(alertId);
    }, escalationTime);

    this.escalationTimers.set(alertId, timer);
  }

  /**
   * Escalate unacknowledged alert
   */
  async escalateAlert(alertId) {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert || alert.acknowledgedBy) {
        return; // Alert resolved or acknowledged
      }

      alert.escalationLevel = Math.min(
        alert.escalationLevel + 1,
        this.config.escalationRules.maxEscalationLevel
      );

      // Update severity if escalating
      if (alert.escalationLevel >= 2 && alert.severity !== 'Critical') {
        alert.severity = 'Critical';
      }

      // Update in Firebase and local storage
      await this.updateAlert(alertId, {
        escalationLevel: alert.escalationLevel,
        severity: alert.severity,
        updatedAt: new Date()
      });

      // Send escalated notifications
      await this.queueNotifications(alert);

      // Schedule next escalation if needed
      if (alert.escalationLevel < this.config.escalationRules.maxEscalationLevel) {
        this.scheduleEscalation(alertId, alert.severity);
      }

      console.log(`Alert escalated: ${alertId} - Level ${alert.escalationLevel}`);

      // Trigger callback
      if (this.callbacks.onAlertEscalated) {
        this.callbacks.onAlertEscalated(alert);
      }

    } catch (error) {
      console.error('Error escalating alert:', error);
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId, acknowledgedBy) {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      // Update alert
      await this.updateAlert(alertId, {
        acknowledgedBy: acknowledgedBy,
        acknowledgedAt: new Date(),
        updatedAt: new Date()
      });

      // Cancel escalation timer
      if (this.escalationTimers.has(alertId)) {
        clearTimeout(this.escalationTimers.get(alertId));
        this.escalationTimers.delete(alertId);
      }

      console.log(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`);

    } catch (error) {
      console.error('Error acknowledging alert:', error);
      this.handleError('Failed to acknowledge alert', error);
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId, resolvedBy, resolution) {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      // Update alert
      await this.updateAlert(alertId, {
        status: 'Resolved',
        resolvedBy: resolvedBy,
        resolvedAt: new Date(),
        resolution: resolution,
        updatedAt: new Date()
      });

      // Remove from active alerts
      this.activeAlerts.delete(alertId);

      // Cancel escalation timer
      if (this.escalationTimers.has(alertId)) {
        clearTimeout(this.escalationTimers.get(alertId));
        this.escalationTimers.delete(alertId);
      }

      console.log(`Alert resolved: ${alertId} by ${resolvedBy}`);

      // Trigger callback
      if (this.callbacks.onAlertResolved) {
        this.callbacks.onAlertResolved(alert);
      }

    } catch (error) {
      console.error('Error resolving alert:', error);
      this.handleError('Failed to resolve alert', error);
    }
  }

  /**
   * Update alert in Firebase
   */
  async updateAlert(alertId, updates) {
    // This would update the alert in Firebase
    // For demo purposes, we'll just update locally
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      Object.assign(alert, updates);
    }
  }

  /**
   * Subscribe to alert notifications
   */
  subscribe(callback) {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers(event, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }

  /**
   * Helper methods
   */
  determineSeverity(predictionData) {
    const riskPercentage = predictionData.surgeRisk.percentage;

    if (riskPercentage >= 90) return 'Critical';
    if (riskPercentage >= 70) return 'High';
    if (riskPercentage >= 50) return 'Medium';
    return 'Low';
  }

  determineAffectedZone(predictionData) {
    // This would analyze prediction data to determine affected zone
    return 'Main Stage Area'; // Placeholder
  }

  generateSurgeMessage(predictionData) {
    const risk = predictionData.surgeRisk;
    return `Crowd surge predicted with ${risk.percentage}% probability. Peak density: ${risk.peakDensity.toFixed(1)}. Time to surge: ${risk.timeToSurge || 'Unknown'} minutes.`;
  }

  generateBottleneckRecommendations(locationData) {
    return [
      {
        priority: 'high',
        action: 'Deploy crowd control personnel to bottleneck area',
        timeframe: 'immediate'
      },
      {
        priority: 'medium',
        action: 'Open alternative routes and guide crowd flow',
        timeframe: '2-3 minutes'
      }
    ];
  }

  generateCapacityRecommendations(zoneData) {
    const occupancyRate = (zoneData.currentCount / zoneData.capacity) * 100;

    if (occupancyRate > 90) {
      return [
        {
          priority: 'high',
          action: 'Restrict entry to zone immediately',
          timeframe: 'immediate'
        },
        {
          priority: 'high',
          action: 'Guide crowds to alternative areas',
          timeframe: 'immediate'
        }
      ];
    }

    return [
      {
        priority: 'medium',
        action: 'Monitor zone capacity closely',
        timeframe: 'ongoing'
      }
    ];
  }

  getSeverityPriority(severity) {
    const mapping = {
      'Critical': 'critical',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low'
    };
    return mapping[severity] || 'low';
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory() {
    return this.alertHistory;
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics() {
    const stats = {
      total: this.alertHistory.length,
      active: this.activeAlerts.size,
      bySeverity: { Critical: 0, High: 0, Medium: 0, Low: 0 },
      byType: {},
      averageResolutionTime: 0
    };

    this.alertHistory.forEach(alert => {
      stats.bySeverity[alert.severity]++;
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Handle errors
   */
  handleError(message, error) {
    console.error(`Alert Management: ${message}`, error);

    if (this.callbacks.onError) {
      this.callbacks.onError(message, error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestNotificationPermissions() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * Stop alert management system
   */
  stop() {
    this.isActive = false;

    // Clear intervals and timers
    if (this.notificationProcessor) {
      clearInterval(this.notificationProcessor);
    }

    this.escalationTimers.forEach(timer => clearTimeout(timer));
    this.escalationTimers.clear();

    // Unsubscribe from Firebase
    if (this.alertsUnsubscribe) {
      this.alertsUnsubscribe();
    }

    console.log('Alert Management System stopped');
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop();
    this.activeAlerts.clear();
    this.alertHistory = [];
    this.notificationQueue = [];
    this.subscribers.clear();
    this.callbacks = {};
  }
}

export default AlertManagementSystem;
