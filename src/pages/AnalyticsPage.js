import { useState, useEffect } from 'react';
import DataInsightsDashboard from '../components/DataInsightsDashboard';
import './AnalyticsPage.css';

const AnalyticsPage = () => {
  const [mockData, setMockData] = useState({
    crowdData: [],
    alertData: [],
    predictionData: {}
  });

  useEffect(() => {
    // Generate mock data for analytics
    const generateMockCrowdData = () => {
      const data = [];
      for (let i = 0; i < 50; i++) {
        data.push({
          lat: 37.7749 + (Math.random() - 0.5) * 0.01,
          lng: -122.4194 + (Math.random() - 0.5) * 0.01,
          count: Math.floor(Math.random() * 100) + 10,
          density: Math.random() * 0.9,
          timestamp: new Date().toISOString()
        });
      }
      return data;
    };

    const generateMockAlertData = () => {
      return [
        {
          id: 'alert-1',
          type: 'High Density',
          severity: 'High',
          status: 'Active',
          timestamp: new Date().toISOString(),
          zone: 'Zone A'
        },
        {
          id: 'alert-2',
          type: 'Crowd Surge',
          severity: 'Critical',
          status: 'Active',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          zone: 'Zone B'
        },
        {
          id: 'alert-3',
          type: 'Bottleneck',
          severity: 'Medium',
          status: 'Resolved',
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          zone: 'Zone C'
        }
      ];
    };

    const generateMockPredictionData = () => {
      return {
        surgeProbability: 0.73,
        confidence: 0.89,
        timeframe: '15 minutes',
        affectedZones: ['Zone A', 'Zone B'],
        timestamp: new Date().toISOString()
      };
    };

    setMockData({
      crowdData: generateMockCrowdData(),
      alertData: generateMockAlertData(),
      predictionData: generateMockPredictionData()
    });
  }, []);

  return (
    <div className="analytics-page">
      <div className="analytics-content">
        <DataInsightsDashboard
          isVisible={true}
          crowdData={mockData.crowdData}
          alertData={mockData.alertData}
          predictionData={mockData.predictionData}
        />
      </div>
    </div>
  );
};

export default AnalyticsPage;
