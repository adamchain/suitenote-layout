import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './UsageDisplay.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byEndpoint: Array<{
    endpoint: string;
    model: string;
    requests: number;
    tokens: number;
    cost: number;
    avgTokens: number;
    successRate: number;
  }>;
}

interface UsageTrend {
  _id: string; // Date string
  requests: number;
  tokens: number;
  cost: number;
}

interface UsageRecord {
  _id: string;
  endpoint: string;
  operation?: string;
  model: string;
  totalTokens: number;
  cost: number;
  success: boolean;
  createdAt: string;
}

const UsageDisplay: React.FC = () => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [trend, setTrend] = useState<UsageTrend[]>([]);
  const [recentRecords, setRecentRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trend' | 'history'>('overview');
  const [timeRange, setTimeRange] = useState(30); // days

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'https://suitenote-2-production.up.railway.app';
      
      // Get user stats
      const statsResponse = await fetch(`${apiUrl}/api/usage/user/stats?days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch usage statistics');
      }
      
      const statsData = await statsResponse.json();
      setStats(statsData.data);
      
      // Get trend data
      const trendResponse = await fetch(`${apiUrl}/api/usage/user/trend?days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (trendResponse.ok) {
        const trendData = await trendResponse.json();
        setTrend(trendData.data.trend || []);
      }
      
      // Get recent records
      const recordsResponse = await fetch(`${apiUrl}/api/usage/user/recent?limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setRecentRecords(recordsData.data.records || []);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Chart data for usage trend
  const chartData = {
    labels: trend.map(t => formatDate(t._id)),
    datasets: [
      {
        label: 'Daily Cost ($)',
        data: trend.map(t => t.cost),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Daily Tokens',
        data: trend.map(t => t.tokens),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Usage Trend (Last ${timeRange} days)`
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Cost ($)'
        },
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,  
          text: 'Tokens'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: any) {
            return formatNumber(value);
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="usage-display loading">
        <div className="loading-spinner"></div>
        <p>Loading usage data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="usage-display error">
        <h3>Failed to Load Usage Data</h3>
        <p>{error}</p>
        <button onClick={fetchUsageData} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="usage-display">
      <div className="usage-header">
        <h2>AI Usage & Costs</h2>
        <div className="time-range-selector">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="time-range-select"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="usage-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'trend' ? 'active' : ''}`}
          onClick={() => setActiveTab('trend')}
        >
          Trend
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'overview' && stats && (
        <div className="usage-overview">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Requests</h3>
              <div className="stat-value">{formatNumber(stats.totalRequests)}</div>
            </div>
            <div className="stat-card">
              <h3>Total Tokens</h3>
              <div className="stat-value">{formatNumber(stats.totalTokens)}</div>
            </div>
            <div className="stat-card">
              <h3>Total Cost</h3>
              <div className="stat-value cost">{formatCurrency(stats.totalCost)}</div>
            </div>
            <div className="stat-card">
              <h3>Avg Cost/Request</h3>
              <div className="stat-value">
                {formatCurrency(stats.totalRequests > 0 ? stats.totalCost / stats.totalRequests : 0)}
              </div>
            </div>
          </div>

          {stats.byEndpoint.length > 0 && (
            <div className="endpoint-breakdown">
              <h3>Usage by Endpoint</h3>
              <div className="endpoint-table">
                <div className="table-header">
                  <span>Endpoint</span>
                  <span>Model</span>
                  <span>Requests</span>
                  <span>Tokens</span>
                  <span>Cost</span>
                  <span>Success Rate</span>
                </div>
                {stats.byEndpoint.map((endpoint, index) => (
                  <div key={index} className="table-row">
                    <span className="endpoint-name">{endpoint.endpoint}</span>
                    <span className="model-name">{endpoint.model}</span>
                    <span>{formatNumber(endpoint.requests)}</span>
                    <span>{formatNumber(endpoint.tokens)}</span>
                    <span>{formatCurrency(endpoint.cost)}</span>
                    <span className="success-rate">
                      {(endpoint.successRate * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'trend' && (
        <div className="usage-trend">
          {trend.length > 0 ? (
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="no-data">
              <p>No usage data available for the selected time range.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="usage-history">
          <h3>Recent Activity</h3>
          {recentRecords.length > 0 ? (
            <div className="history-table">
              <div className="table-header">
                <span>Date</span>
                <span>Endpoint</span>
                <span>Operation</span>
                <span>Model</span>
                <span>Tokens</span>
                <span>Cost</span>
                <span>Status</span>
              </div>
              {recentRecords.map((record) => (
                <div key={record._id} className="table-row">
                  <span className="date">{formatDateTime(record.createdAt)}</span>
                  <span className="endpoint-name">{record.endpoint}</span>
                  <span className="operation">{record.operation || '-'}</span>
                  <span className="model-name">{record.model}</span>
                  <span>{formatNumber(record.totalTokens)}</span>
                  <span>{formatCurrency(record.cost)}</span>
                  <span className={`status ${record.success ? 'success' : 'error'}`}>
                    {record.success ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>No recent activity found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UsageDisplay;