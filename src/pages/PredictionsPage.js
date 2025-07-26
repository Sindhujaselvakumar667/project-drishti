import React, { useState, useEffect } from 'react';
import PredictionDashboard from '../components/PredictionDashboard';
import './PredictionsPage.css';

const PredictionsPage = () => {
  const [predictionData, setPredictionData] = useState(null);
  const [alertData, setAlertData] = useState([]);

  // Mock prediction data for demonstration
  useEffect(() => {
    const mockPredictionData = {
      timestamp: new Date().toISOString(),
      predictions: [
        {
          timeframe: '5 minutes',
          crowdLevel: 'High',
          confidence: 0.87,
          riskLevel: 'Medium',
          expectedCount: 1250,
          zones: ['Zone A', 'Zone C']
        },
        {
          timeframe: '15 minutes',
          crowdLevel: 'Critical',
          confidence: 0.92,
          riskLevel: 'High',
          expectedCount: 1800,
          zones: ['Zone A', 'Zone B', 'Zone C']
        },
        {
          timeframe: '30 minutes',
          crowdLevel: 'Moderate',
          confidence: 0.78,
          riskLevel: 'Low',
          expectedCount: 950,
          zones: ['Zone B']
        }
      ],
      modelAccuracy: 0.873,
      lastUpdated: new Date().toISOString()
    };

    const mockAlerts = [
      {
        id: 'alert-1',
        type: 'Crowd Surge',
        severity: 'High',
        message: 'Predicted crowd surge in Zone A within 15 minutes',
        confidence: 0.92,
        timestamp: new Date().toISOString(),
        zone: 'Zone A',
        status: 'active'
      },
      {
        id: 'alert-2',
        type: 'Bottleneck',
        severity: 'Medium',
        message: 'Potential bottleneck formation at Exit 3',
        confidence: 0.78,
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        zone: 'Zone C',
        status: 'active'
      }
    ];

    setPredictionData(mockPredictionData);
    setAlertData(mockAlerts);
  }, []);

  const handleAlertAcknowledge = (alertId) => {
    setAlertData(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged' }
          : alert
      )
    );
  };

  const handleAlertResolve = (alertId) => {
    setAlertData(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'resolved' }
          : alert
      )
    );
  };

  return (
    <div className="predictions-page">
      <div className="page-header">
        <h1>🔮 AI Predictions</h1>
        <p>Advanced crowd surge forecasting and risk assessment</p>
      </div>
      
      <div className="predictions-content">
        <PredictionDashboard
          predictionData={predictionData}
          alertData={alertData}
          onAlertAcknowledge={handleAlertAcknowledge}
          onAlertResolve={handleAlertResolve}
          isVisible={true}
        />
      </div>
    </div>
  );
};

export default PredictionsPage;
