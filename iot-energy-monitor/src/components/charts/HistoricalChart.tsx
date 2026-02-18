import React, { useMemo, useCallback, memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { TrendingUp } from 'lucide-react';

interface HistoricalDataPoint {
  timestamp: string;
  deviceId: string;
  parameters: Record<string, number>;
}

interface HistoricalChartProps {
  data: HistoricalDataPoint[];
  selectedParameters: string[];
  parameterMapping: Record<string, string>;
  timeRange: string;
  isLoading?: boolean;
  scrollMode?: boolean; // Enable scrolling wave effect
  maxDataPoints?: number; // Maximum points to show in scroll mode
}

const HistoricalChart: React.FC<HistoricalChartProps> = ({
  data,
  selectedParameters,
  parameterMapping,
  timeRange,
  isLoading = false,
  scrollMode = true, // Enable scrolling by default
  maxDataPoints = 100 // Show last 100 points in scroll mode
}) => {
  // Transform data for Recharts with scrolling wave effect
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sort data by timestamp to ensure proper ordering
    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // In scroll mode, show only the most recent N points for smooth wave effect
    let processedData = sortedData;
    if (scrollMode && sortedData.length > maxDataPoints) {
      // Take only the most recent points (sliding window) - creates scrolling effect
      processedData = sortedData.slice(-maxDataPoints);
    } else if (!scrollMode && sortedData.length > 500) {
      // For non-scroll mode, sample data if too many points
      const step = Math.ceil(sortedData.length / 500);
      processedData = sortedData.filter((_, index) => index % step === 0 || index === sortedData.length - 1);
    }

    return processedData.map((point, index) => {
      const chartPoint: any = {
        timestamp: point.timestamp,
        time: format(parseISO(point.timestamp), 'HH:mm:ss'),
        date: format(parseISO(point.timestamp), 'MMM dd HH:mm'),
        index: index, // Add index for smooth scrolling (0 to N-1)
      };

      // Add each selected parameter as a data point
      selectedParameters.forEach((paramKey) => {
        const value = point.parameters?.[paramKey];
        if (value !== undefined && value !== null && !isNaN(Number(value))) {
          chartPoint[paramKey] = Number(Number(value).toFixed(2));
        } else {
          chartPoint[paramKey] = null; // Use null for missing values
        }
      });

      return chartPoint;
    });
  }, [data, selectedParameters, scrollMode, maxDataPoints]);

  // Calculate Y-axis domain for better visibility
  const yAxisDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return ['auto', 'auto'];
    
    let min = Infinity;
    let max = -Infinity;
    
    chartData.forEach((point: any) => {
      selectedParameters.forEach((paramKey) => {
        const value = point[paramKey];
        if (value !== null && value !== undefined && !isNaN(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });
    
    if (min === Infinity || max === -Infinity) return ['auto', 'auto'];
    
    // Add padding (10% on each side)
    const padding = (max - min) * 0.1 || 1;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData, selectedParameters]);

  // Calculate optimal X-axis interval based on data points
  const xAxisInterval = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    // Show fewer labels for better readability
    if (chartData.length > 100) return Math.floor(chartData.length / 10);
    if (chartData.length > 50) return Math.floor(chartData.length / 8);
    return 0; // Show all for small datasets
  }, [chartData]);

  // Generate colors for each parameter
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16', // lime
  ];

  // Format X-axis label based on time range - memoized to prevent re-renders
  const formatXAxisLabel = useCallback((tickItem: string) => {
    try {
      const date = parseISO(tickItem);
      if (timeRange === '1hr' || timeRange === '12hrs') {
        return format(date, 'HH:mm');
      } else if (timeRange === '24hrs') {
        return format(date, 'MMM dd HH:mm');
      } else if (timeRange === '7days' || timeRange === '30days') {
        return format(date, 'MMM dd');
      } else {
        return format(date, 'MMM dd HH:mm');
      }
    } catch {
      return tickItem;
    }
  }, [timeRange]);

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
            Historical Data Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[450px] flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600 font-medium">No data available</p>
              <p className="text-xs text-slate-500 mt-1">
                Select parameters and ensure data exists for the selected time range.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center justify-between">
          <span className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
            {scrollMode ? 'Real-time Wave Chart' : 'Historical Data Chart'}
          </span>
          <div className="flex items-center space-x-3">
            {scrollMode && (
              <span className="flex items-center space-x-1 text-xs text-green-600 font-medium">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Live</span>
              </span>
            )}
            <span className="text-sm font-normal text-slate-500">
              {selectedParameters.length} {selectedParameters.length === 1 ? 'parameter' : 'parameters'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[600px] w-full bg-white rounded-lg overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: scrollMode ? 50 : 80 }}
              syncId={scrollMode ? undefined : "device-chart"}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.2} vertical={false} />
              <XAxis
                dataKey={scrollMode ? "index" : "timestamp"}
                tickFormatter={scrollMode ? (tick: number) => {
                  // In scroll mode, show time labels based on index
                  const dataPoint = chartData[tick];
                  if (dataPoint && dataPoint.timestamp) {
                    try {
                      return format(parseISO(dataPoint.timestamp), 'HH:mm:ss');
                    } catch {
                      return '';
                    }
                  }
                  return '';
                } : formatXAxisLabel}
                stroke="#6b7280"
                style={{ fontSize: scrollMode ? '11px' : '10px', fontWeight: 500 }}
                angle={scrollMode ? 0 : -45}
                textAnchor={scrollMode ? "middle" : "end"}
                height={scrollMode ? 40 : 80}
                interval={scrollMode ? Math.max(0, Math.floor((chartData.length - 1) / 8)) : xAxisInterval}
                minTickGap={scrollMode ? 60 : 80}
                tick={{ fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                domain={scrollMode && chartData.length > 0 ? [0, Math.max(maxDataPoints - 1, chartData.length - 1)] : undefined}
                type={scrollMode ? "number" : undefined}
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '10px', fontWeight: 500 }}
                width={70}
                domain={yAxisDomain}
                tick={{ fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                  return value.toFixed(0);
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
                labelStyle={{ fontWeight: 600, marginBottom: '8px', color: '#111827' }}
                itemStyle={{ padding: '2px 0' }}
                labelFormatter={(label) => {
                  if (scrollMode && typeof label === 'number') {
                    // In scroll mode, label is an index
                    const dataPoint = chartData[label];
                    if (dataPoint && dataPoint.timestamp) {
                      try {
                        return format(parseISO(dataPoint.timestamp), 'MMM dd, yyyy HH:mm:ss');
                      } catch {
                        return '';
                      }
                    }
                    return '';
                  }
                  try {
                    return format(parseISO(label), 'MMM dd, yyyy HH:mm:ss');
                  } catch {
                    return label;
                  }
                }}
                formatter={(value: any, name?: string) => {
                  const paramKey = name || '';
                  const paramLabel = parameterMapping[paramKey] || paramKey;
                  const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
                  return [formattedValue, paramLabel];
                }}
                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                iconType="line"
                formatter={(value) => parameterMapping[value] || value}
              />
              {selectedParameters.map((paramKey, index) => (
                <Line
                  key={paramKey}
                  type="monotone"
                  dataKey={paramKey}
                  stroke={colors[index % colors.length]}
                  strokeWidth={scrollMode ? 2.5 : 3}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: colors[index % colors.length] }}
                  name={paramKey}
                  animationDuration={scrollMode ? 800 : 500}
                  isAnimationActive={scrollMode}
                  connectNulls={true}
                  strokeOpacity={1}
                  animationBegin={0}
                  animationEasing="ease-out"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Compact legend */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap gap-2">
            {selectedParameters.map((paramKey, index) => {
              // Calculate stats for this parameter
              const values = chartData
                .map((d: any) => d[paramKey])
                .filter((v: any) => v !== null && v !== undefined && !isNaN(v));
              const avg = values.length > 0 
                ? (values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(2)
                : 'N/A';
              const min = values.length > 0 ? Math.min(...values).toFixed(2) : 'N/A';
              const max = values.length > 0 ? Math.max(...values).toFixed(2) : 'N/A';

              return (
                <div
                  key={paramKey}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">
                      {parameterMapping[paramKey] || paramKey}
                    </span>
                    <span className="text-xs text-slate-500">
                      Avg: {avg} | Min: {min} | Max: {max}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(HistoricalChart);
