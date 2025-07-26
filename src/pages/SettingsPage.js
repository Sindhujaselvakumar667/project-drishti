import React, { useState } from 'react';
import './SettingsPage.css';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    mapSettings: {
      defaultZoom: 15,
      showHeatmap: true,
      showResponders: true,
      showZones: true,
      mapType: 'roadmap'
    },
    alertSettings: {
      enableNotifications: true,
      criticalAlertSound: true,
      emailNotifications: false,
      alertThreshold: 'medium'
    },
    predictionSettings: {
      enablePredictions: true,
      predictionInterval: 5,
      confidenceThreshold: 0.7,
      autoRefresh: true
    },
    systemSettings: {
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      dataRetention: 30
    }
  });

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const handleSaveSettings = () => {
    // Save settings to localStorage or backend
    localStorage.setItem('drishti-settings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      // Reset to default settings
      setSettings({
        mapSettings: {
          defaultZoom: 15,
          showHeatmap: true,
          showResponders: true,
          showZones: true,
          mapType: 'roadmap'
        },
        alertSettings: {
          enableNotifications: true,
          criticalAlertSound: true,
          emailNotifications: false,
          alertThreshold: 'medium'
        },
        predictionSettings: {
          enablePredictions: true,
          predictionInterval: 5,
          confidenceThreshold: 0.7,
          autoRefresh: true
        },
        systemSettings: {
          theme: 'dark',
          language: 'en',
          timezone: 'UTC',
          dataRetention: 30
        }
      });
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>⚙️ Settings</h1>
        <p>Configure system preferences and behavior</p>
      </div>
      
      <div className="settings-content">
        <div className="settings-grid">
          {/* Map Settings */}
          <div className="settings-section">
            <h3>🗺️ Map Settings</h3>
            <div className="setting-item">
              <label>Default Zoom Level</label>
              <input
                type="range"
                min="10"
                max="20"
                value={settings.mapSettings.defaultZoom}
                onChange={(e) => handleSettingChange('mapSettings', 'defaultZoom', parseInt(e.target.value))}
              />
              <span>{settings.mapSettings.defaultZoom}</span>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.mapSettings.showHeatmap}
                  onChange={(e) => handleSettingChange('mapSettings', 'showHeatmap', e.target.checked)}
                />
                Show Heatmap by Default
              </label>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.mapSettings.showResponders}
                  onChange={(e) => handleSettingChange('mapSettings', 'showResponders', e.target.checked)}
                />
                Show Responders by Default
              </label>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.mapSettings.showZones}
                  onChange={(e) => handleSettingChange('mapSettings', 'showZones', e.target.checked)}
                />
                Show Zones by Default
              </label>
            </div>
            
            <div className="setting-item">
              <label>Map Type</label>
              <select
                value={settings.mapSettings.mapType}
                onChange={(e) => handleSettingChange('mapSettings', 'mapType', e.target.value)}
              >
                <option value="roadmap">Roadmap</option>
                <option value="satellite">Satellite</option>
                <option value="hybrid">Hybrid</option>
                <option value="terrain">Terrain</option>
              </select>
            </div>
          </div>

          {/* Alert Settings */}
          <div className="settings-section">
            <h3>🚨 Alert Settings</h3>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.alertSettings.enableNotifications}
                  onChange={(e) => handleSettingChange('alertSettings', 'enableNotifications', e.target.checked)}
                />
                Enable Browser Notifications
              </label>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.alertSettings.criticalAlertSound}
                  onChange={(e) => handleSettingChange('alertSettings', 'criticalAlertSound', e.target.checked)}
                />
                Play Sound for Critical Alerts
              </label>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.alertSettings.emailNotifications}
                  onChange={(e) => handleSettingChange('alertSettings', 'emailNotifications', e.target.checked)}
                />
                Email Notifications
              </label>
            </div>
            
            <div className="setting-item">
              <label>Alert Threshold</label>
              <select
                value={settings.alertSettings.alertThreshold}
                onChange={(e) => handleSettingChange('alertSettings', 'alertThreshold', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical Only</option>
              </select>
            </div>
          </div>

          {/* Prediction Settings */}
          <div className="settings-section">
            <h3>🔮 Prediction Settings</h3>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.predictionSettings.enablePredictions}
                  onChange={(e) => handleSettingChange('predictionSettings', 'enablePredictions', e.target.checked)}
                />
                Enable AI Predictions
              </label>
            </div>
            
            <div className="setting-item">
              <label>Prediction Interval (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.predictionSettings.predictionInterval}
                onChange={(e) => handleSettingChange('predictionSettings', 'predictionInterval', parseInt(e.target.value))}
              />
            </div>
            
            <div className="setting-item">
              <label>Confidence Threshold</label>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.05"
                value={settings.predictionSettings.confidenceThreshold}
                onChange={(e) => handleSettingChange('predictionSettings', 'confidenceThreshold', parseFloat(e.target.value))}
              />
              <span>{(settings.predictionSettings.confidenceThreshold * 100).toFixed(0)}%</span>
            </div>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.predictionSettings.autoRefresh}
                  onChange={(e) => handleSettingChange('predictionSettings', 'autoRefresh', e.target.checked)}
                />
                Auto-refresh Predictions
              </label>
            </div>
          </div>

          {/* System Settings */}
          <div className="settings-section">
            <h3>🖥️ System Settings</h3>
            <div className="setting-item">
              <label>Theme</label>
              <select
                value={settings.systemSettings.theme}
                onChange={(e) => handleSettingChange('systemSettings', 'theme', e.target.value)}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label>Language</label>
              <select
                value={settings.systemSettings.language}
                onChange={(e) => handleSettingChange('systemSettings', 'language', e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label>Timezone</label>
              <select
                value={settings.systemSettings.timezone}
                onChange={(e) => handleSettingChange('systemSettings', 'timezone', e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label>Data Retention (days)</label>
              <input
                type="number"
                min="7"
                max="365"
                value={settings.systemSettings.dataRetention}
                onChange={(e) => handleSettingChange('systemSettings', 'dataRetention', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
        
        <div className="settings-actions">
          <button className="save-btn" onClick={handleSaveSettings}>
            💾 Save Settings
          </button>
          <button className="reset-btn" onClick={handleResetSettings}>
            🔄 Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
