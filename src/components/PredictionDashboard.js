import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PredictionDashboard.css';

const PredictionDashboard = ({
  predictionData = null,
  alertData = [],
  onAlertAcknowledge = () => {},
  onAlertResolve = () => {},
  isVisible = true
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('10min');
  const [showDetails, setShowDetails] = useState(true);
  const [activeTab, setActiveTab] = useState('forecast');
  const chartRef = useRef(null);
  const [chartInstance, setChartInstance] = useState(null);

  // Update chart when prediction data changes
  const updateChart = useCallback(() => {
    if (!predictionData || !chartInstance) return;

    const chartData = chartInstance.data;
    
    // Generate time labels for forecast
    const timeLabels = Array.from({ length: predictionData.forecastHorizon || 10 }, (_, i) => {
      const time = new Date(Date.now() + i * 60000);
      return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });

    chartData.labels = timeLabels;
    chartData.datasets = [];

    // Add predicted density line
    if (predictionData.predictions) {
      chartData.datasets.push({
        label: 'Predicted Density',
        data: predictionData.predictions,
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      });
    }

    // Add surge threshold line
    const surgeThreshold = Array(predictionData.forecastHorizon).fill(8.0);
    chartData.datasets.push({
      label: 'Surge Threshold',
      data: surgeThreshold,
      borderColor: '#dc3545',
      backgroundColor: 'rgba(220, 53, 69, 0.1)',
      borderWidth: 2,
      borderDash: [10, 5],
      fill: false,
      pointRadius: 0
    });

    chartInstance.update();
  }, [predictionData, chartInstance]);

  // Update chart when prediction data changes
  useEffect(() => {
    if (predictionData && chartRef.current) {
      updateChart();
    }
  }, [predictionData, updateChart]);

  // Initialize chart
  useEffect(() => {
    if (chartRef.current && !chartInstance) {
      const mockChart = { 
        update: () => {}, 
        destroy: () => {},
        data: { labels: [], datasets: [] }
      };
      setChartInstance(mockChart);
    }

    return () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const updateChartData = useCallback(() => {
    if (!predictionData) return;

    // Extract data for chart rendering (keeping existing functionality)
    const predictions = predictionData.predictions || [];
    const upperBounds = predictionData.upperBound || [];
    const lowerBounds = predictionData.lowerBound || [];

    // Use the data for chart updates
    console.log('Chart data updated:', { predictions, upperBounds, lowerBounds });
  }, [predictionData]);

  useEffect(() => {
    updateChartData();
  }, [updateChartData]);

  const getSurgeRiskColor = (percentage) => {
    if (percentage >= 80) return '#dc3545';
    if (percentage >= 60) return '#fd7e14';
    if (percentage >= 40) return '#ffc107';
    return '#28a745';
  };

  const getAlertLevelColor = (level) => {
    const colors = {
      critical: '#dc3545',
      warning: '#ffc107',
      caution: '#fd7e14',
      normal: '#28a745'
    };
    return colors[level] || '#6c757d';
  };

  const formatTimeToSurge = (minutes) => {
    if (!minutes) return 'No surge predicted';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  };

  const getConfidenceLevel = (confidence) => {
    if (!confidence || !Array.isArray(confidence)) return 'Unknown';
    const avgConfidence = confidence.reduce((sum, val) => sum + val, 0) / confidence.length;
    return `${(avgConfidence * 100).toFixed(1)}%`;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="prediction-dashboard">
      <div className="dashboard-header">
        <h2>🔮 AI Crowd Prediction Dashboard</h2>
        <div className="dashboard-controls">
          <div className="tab-controls">
            <button
              className={`tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => setActiveTab('forecast')}
            >
              📈 Forecast
            </button>
            <button
              className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              🚨 Alerts
            </button>
            <button
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📊 Analytics
            </button>
          </div>
          <button
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '🔼 Hide Details' : '🔽 Show Details'}
          </button>
        </div>
      </div>

      {activeTab === 'forecast' && (
        <div className="forecast-tab">
          {/* Prediction Status */}
          <div className="prediction-status">
            <div className="status-grid">
              <div className="status-card">
                <div className="status-label">Last Update</div>
                <div className="status-value">
                  {predictionData?.timestamp
                    ? new Date(predictionData.timestamp).toLocaleTimeString()
                    : 'No data'
                  }
                </div>
              </div>

              <div className="status-card">
                <div className="status-label">Forecast Range</div>
                <div className="status-value">
                  {predictionData?.forecastHorizon || 0} minutes
                </div>
              </div>

              <div className="status-card">
                <div className="status-label">Confidence</div>
                <div className="status-value">
                  {getConfidenceLevel(predictionData?.confidence)}
                </div>
              </div>

              <div className="status-card">
                <div className="status-label">Data Source</div>
                <div className="status-value">
                  {predictionData?.isMockData ? 'Mock AI' : 'Vertex AI'}
                </div>
              </div>
            </div>
          </div>

          {/* Surge Risk Assessment */}
          {predictionData?.surgeRisk && (
            <div className="surge-risk-panel">
              <h3>⚡ Surge Risk Assessment</h3>
              <div className="risk-metrics">
                <div className="risk-card">
                  <div className="risk-percentage"
                       style={{ color: getSurgeRiskColor(predictionData.surgeRisk.percentage) }}>
                    {predictionData.surgeRisk.percentage}%
                  </div>
                  <div className="risk-label">Surge Probability</div>
                </div>

                <div className="risk-card">
                  <div className="risk-value">
                    {formatTimeToSurge(predictionData.surgeRisk.timeToSurge)}
                  </div>
                  <div className="risk-label">Time to Surge</div>
                </div>

                <div className="risk-card">
                  <div className="risk-value">
                    {predictionData.surgeRisk.peakDensity?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="risk-label">Peak Density</div>
                </div>

                <div className="risk-card">
                  <div className="risk-value">
                    {predictionData.surgeRisk.peakTime || 'N/A'}min
                  </div>
                  <div className="risk-label">Peak Time</div>
                </div>
              </div>

              <div className="alert-level-indicator">
                <span
                  className="alert-badge"
                  style={{ backgroundColor: getAlertLevelColor(predictionData.alertLevel) }}
                >
                  {(predictionData.alertLevel || 'normal').toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {/* Forecast Chart */}
          <div className="forecast-chart-container">
            <h3>📈 Crowd Density Forecast</h3>
            <div className="chart-controls">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="time-range-select"
              >
                <option value="5min">5 Minutes</option>
                <option value="10min">10 Minutes</option>
                <option value="15min">15 Minutes</option>
                <option value="30min">30 Minutes</option>
              </select>
            </div>

            <div className="chart-wrapper">
              <canvas ref={chartRef} className="forecast-chart"></canvas>

              {/* Chart placeholder when no data */}
              {!predictionData && (
                <div className="chart-placeholder">
                  <div className="placeholder-content">
                    <div className="placeholder-icon">📊</div>
                    <h4>No Prediction Data Available</h4>
                    <p>Start video processing to generate AI predictions</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {predictionData?.recommendedActions && showDetails && (
            <div className="recommendations-panel">
              <h3>💡 AI Recommendations</h3>
              <div className="recommendations-list">
                {predictionData.recommendedActions.map((recommendation, index) => (
                  <div key={index} className={`recommendation-item ${recommendation.priority}`}>
                    <div className="recommendation-header">
                      <span className="priority-badge">{recommendation.priority}</span>
                      <span className="timeframe">{recommendation.timeframe}</span>
                    </div>
                    <div className="recommendation-text">
                      {recommendation.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="alerts-tab">
          <div className="alerts-header">
            <h3>🚨 Predictive Alerts</h3>
            <div className="alerts-summary">
              <span className="alert-count critical">
                {alertData.filter(a => a.severity === 'Critical').length} Critical
              </span>
              <span className="alert-count high">
                {alertData.filter(a => a.severity === 'High').length} High
              </span>
              <span className="alert-count medium">
                {alertData.filter(a => a.severity === 'Medium').length} Medium
              </span>
            </div>
          </div>

          <div className="alerts-list">
            {alertData.length === 0 ? (
              <div className="no-alerts">
                <div className="no-alerts-icon">✅</div>
                <h4>No Active Alerts</h4>
                <p>All systems operating normally</p>
              </div>
            ) : (
              alertData.map((alert, index) => (
                <div key={alert.id || index} className={`alert-card ${alert.severity?.toLowerCase()}`}>
                  <div className="alert-header">
                    <div className="alert-type">{alert.type}</div>
                    <div className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="alert-content">
                    <div className="alert-zone">{alert.zone}</div>
                    <div className="alert-message">{alert.message}</div>

                    {alert.predictionData && (
                      <div className="alert-prediction-data">
                        <span>Risk: {alert.predictionData.surgeRisk?.percentage}%</span>
                        <span>Time: {formatTimeToSurge(alert.predictionData.timeToSurge)}</span>
                      </div>
                    )}
                  </div>

                  <div className="alert-actions">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => onAlertAcknowledge(alert.id)}
                      disabled={alert.acknowledgedBy}
                    >
                      {alert.acknowledgedBy ? '✓ Acknowledged' : 'Acknowledge'}
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => onAlertResolve(alert.id)}
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="analytics-tab">
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>📈 Prediction Accuracy</h4>
              <div className="metric-value">87.3%</div>
              <div className="metric-label">Last 24 hours</div>
            </div>

            <div className="analytics-card">
              <h4>⚡ Alerts Generated</h4>
              <div className="metric-value">23</div>
              <div className="metric-label">This session</div>
            </div>

            <div className="analytics-card">
              <h4>🎯 False Positives</h4>
              <div className="metric-value">2.1%</div>
              <div className="metric-label">Model performance</div>
            </div>

            <div className="analytics-card">
              <h4>⏱️ Avg Response Time</h4>
              <div className="metric-value">1.4min</div>
              <div className="metric-label">Alert to action</div>
            </div>
          </div>

          <div className="model-status">
            <h4>🤖 AI Model Status</h4>
            <div className="status-indicators">
              <div className="status-indicator active">
                <span className="status-dot"></span>
                <span>Model Online</span>
              </div>
              <div className="status-indicator active">
                <span className="status-dot"></span>
                <span>Data Pipeline Active</span>
              </div>
              <div className="status-indicator active">
                <span className="status-dot"></span>
                <span>Alerts System Ready</span>
              </div>
            </div>
          </div>

          <div className="prediction-history">
            <h4>📊 Recent Predictions</h4>
            <div className="history-placeholder">
              <p>Prediction history chart would be displayed here</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating action button for emergency */}
      <button className="emergency-fab" title="Emergency Override">
        🚨
      </button>
    </div>
  );
};

export default PredictionDashboard;
