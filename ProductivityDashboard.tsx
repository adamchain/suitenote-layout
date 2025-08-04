import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  Calendar,
  Brain,
  Zap,
  Heart,
  X,
  Filter
} from 'lucide-react';
import { Note } from '../types/Note';
import './ProductivityDashboard.css';

interface ProductivityDashboardProps {
  notes: Note[];
  onClose: () => void;
}

const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({
  notes,
  onClose
}) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [selectedMetric, setSelectedMetric] = useState<'notes' | 'words' | 'mood' | 'productivity'>('notes');

  const analytics = useMemo(() => {
    const now = new Date();
    const timeRanges = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };

    const cutoffDate = new Date(now.getTime() - timeRanges[timeRange]);
    const recentNotes = notes.filter(note => 
      new Date(note.createdAt) >= cutoffDate && !note.isArchived
    );

    // Basic metrics
    const totalNotes = recentNotes.length;
    const totalWords = recentNotes.reduce((sum, note) => 
      sum + (note.content?.split(/\s+/).length || 0), 0
    );
    const avgWordsPerNote = totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0;

    // Note types distribution
    const typeDistribution = recentNotes.reduce((acc, note) => {
      acc[note.type] = (acc[note.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Mood analysis
    const moodDistribution = recentNotes.reduce((acc, note) => {
      if (note.mood) {
        acc[note.mood] = (acc[note.mood] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Productivity metrics
    const completedTodos = recentNotes.filter(note => 
      note.type === 'todo' && note.content.includes('☑')
    ).length;
    const totalTodos = recentNotes.filter(note => note.type === 'todo').length;
    const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    // AI usage
    const aiGeneratedNotes = recentNotes.filter(note => note.aiGenerated).length;
    const aiUsageRate = totalNotes > 0 ? Math.round((aiGeneratedNotes / totalNotes) * 100) : 0;

    // Daily activity
    const dailyActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayNotes = recentNotes.filter(note => {
        const noteDate = new Date(note.createdAt);
        return noteDate.toDateString() === date.toDateString();
      });
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        notes: dayNotes.length,
        words: dayNotes.reduce((sum, note) => sum + (note.content?.split(/\s+/).length || 0), 0)
      };
    }).reverse();

    return {
      totalNotes,
      totalWords,
      avgWordsPerNote,
      typeDistribution,
      moodDistribution,
      completionRate,
      aiUsageRate,
      dailyActivity
    };
  }, [notes, timeRange]);

  const getMetricData = () => {
    switch (selectedMetric) {
      case 'words':
        return analytics.dailyActivity.map(day => ({ label: day.date, value: day.words }));
      case 'mood':
        return Object.entries(analytics.moodDistribution).map(([mood, count]) => ({ 
          label: mood, 
          value: count 
        }));
      case 'productivity':
        return Object.entries(analytics.typeDistribution).map(([type, count]) => ({ 
          label: type, 
          value: count 
        }));
      default:
        return analytics.dailyActivity.map(day => ({ label: day.date, value: day.notes }));
    }
  };

  const maxValue = Math.max(...getMetricData().map(d => d.value), 1);

  return (
    <div className="productivity-dashboard-overlay" onClick={onClose}>
      <div className="productivity-dashboard" onClick={(e) => e.stopPropagation()}>
        <div className="dashboard-header">
          <div className="header-title">
            <BarChart3 size={24} />
            <h2>Productivity Dashboard</h2>
          </div>
          <div className="header-controls">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="time-range-select"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
            <button className="close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Key Metrics */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon">
                <Target size={20} />
              </div>
              <div className="metric-info">
                <div className="metric-value">{analytics.totalNotes}</div>
                <div className="metric-label">Notes Created</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <Brain size={20} />
              </div>
              <div className="metric-info">
                <div className="metric-value">{analytics.totalWords}</div>
                <div className="metric-label">Words Written</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <Zap size={20} />
              </div>
              <div className="metric-info">
                <div className="metric-value">{analytics.completionRate}%</div>
                <div className="metric-label">Task Completion</div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon">
                <Heart size={20} />
              </div>
              <div className="metric-info">
                <div className="metric-value">{analytics.aiUsageRate}%</div>
                <div className="metric-label">AI Assisted</div>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="chart-section">
            <div className="chart-header">
              <h3>Activity Trends</h3>
              <div className="chart-controls">
                <button
                  className={`chart-btn ${selectedMetric === 'notes' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('notes')}
                >
                  Notes
                </button>
                <button
                  className={`chart-btn ${selectedMetric === 'words' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('words')}
                >
                  Words
                </button>
                <button
                  className={`chart-btn ${selectedMetric === 'mood' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('mood')}
                >
                  Mood
                </button>
                <button
                  className={`chart-btn ${selectedMetric === 'productivity' ? 'active' : ''}`}
                  onClick={() => setSelectedMetric('productivity')}
                >
                  Types
                </button>
              </div>
            </div>

            <div className="chart-container">
              <div className="chart">
                {getMetricData().map((item, index) => (
                  <div key={index} className="chart-bar">
                    <div
                      className="bar"
                      style={{
                        height: `${(item.value / maxValue) * 100}%`,
                        backgroundColor: selectedMetric === 'mood' ? '#ec4899' : '#3b82f6'
                      }}
                    ></div>
                    <div className="bar-label">{item.label}</div>
                    <div className="bar-value">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="insights-section">
            <h3>Insights</h3>
            <div className="insights-grid">
              <div className="insight-card">
                <TrendingUp size={16} />
                <div>
                  <div className="insight-title">Most Productive Day</div>
                  <div className="insight-value">
                    {analytics.dailyActivity.reduce((max, day) => 
                      day.notes > max.notes ? day : max
                    ).date}
                  </div>
                </div>
              </div>

              <div className="insight-card">
                <Clock size={16} />
                <div>
                  <div className="insight-title">Average Note Length</div>
                  <div className="insight-value">{analytics.avgWordsPerNote} words</div>
                </div>
              </div>

              <div className="insight-card">
                <Calendar size={16} />
                <div>
                  <div className="insight-title">Most Used Type</div>
                  <div className="insight-value">
                    {Object.entries(analytics.typeDistribution).reduce((max, [type, count]) => 
                      count > max.count ? { type, count } : max, { type: 'note', count: 0 }
                    ).type}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductivityDashboard;