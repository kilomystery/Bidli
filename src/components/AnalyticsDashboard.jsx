import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Eye, Calendar, Download, BarChart3, PieChart, LineChart } from 'lucide-react';

const AnalyticsDashboard = ({ sellerId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [selectedChart, setSelectedChart] = useState('revenue');

  useEffect(() => {
    loadAnalytics();
  }, [sellerId, period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/seller/${sellerId}?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        console.log('✅ Analytics caricati:', data);
      } else {
        console.error('Errore caricamento analytics');
      }
    } catch (error) {
      console.error('Errore caricamento analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('it-IT').format(num || 0);
  };

  const formatPercentage = (value, total) => {
    if (!total || total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  // Chart data processing
  const getChartData = () => {
    if (!analytics?.daily_analytics) return [];
    
    return analytics.daily_analytics.map(day => ({
      date: new Date(day.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      revenue: parseFloat(day.daily_revenue || 0),
      orders: parseInt(day.orders_count || 0),
      customers: parseInt(day.unique_buyers || 0)
    })).reverse(); // Oldest to newest for proper chart display
  };

  const kpiCards = [
    {
      title: 'Fatturato Totale',
      value: formatPrice(analytics?.kpi?.total_revenue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+12.5%',
      trendUp: true
    },
    {
      title: 'Ordini Totali',
      value: formatNumber(analytics?.kpi?.total_orders),
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+8.3%',
      trendUp: true
    },
    {
      title: 'Valore Medio Ordine',
      value: formatPrice(analytics?.kpi?.avg_order_value),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: '+5.2%',
      trendUp: true
    },
    {
      title: 'Clienti Unici',
      value: formatNumber(analytics?.kpi?.unique_customers),
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: '+15.1%',
      trendUp: true
    },
    {
      title: 'Live Sessioni',
      value: formatNumber(analytics?.kpi?.total_live_sessions),
      icon: Eye,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: '+3.2%',
      trendUp: true
    }
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const chartData = getChartData();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Monitoraggio completo delle performance di vendita</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">Ultimi 7 giorni</option>
            <option value="30">Ultimi 30 giorni</option>
            <option value="90">Ultimi 3 mesi</option>
            <option value="365">Ultimo anno</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download size={16} />
            <span>Esporta Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <div className={`flex items-center text-sm font-medium ${kpi.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.trendUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="ml-1">{kpi.trend}</span>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500">{kpi.title}</h3>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Trend nel Tempo</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedChart('revenue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedChart === 'revenue' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Fatturato
            </button>
            <button
              onClick={() => setSelectedChart('orders')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedChart === 'orders' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Ordini
            </button>
            <button
              onClick={() => setSelectedChart('customers')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedChart === 'customers' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Clienti
            </button>
          </div>
        </div>

        {/* Simple Chart Implementation */}
        <div className="h-64 relative">
          {chartData.length > 0 ? (
            <SimpleLineChart 
              data={chartData} 
              dataKey={selectedChart}
              color={selectedChart === 'revenue' ? '#10B981' : selectedChart === 'orders' ? '#3B82F6' : '#F59E0B'}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
                <p>Nessun dato disponibile per il periodo selezionato</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Prodotti Venduti</h3>
          {analytics?.top_products?.length > 0 ? (
            <div className="space-y-4">
              {analytics.top_products.slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate">{product.product_title}</p>
                    <p className="text-sm text-gray-500">{product.sales_count} vendite</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatPrice(product.total_revenue)}</p>
                    <p className="text-sm text-gray-500">{formatPrice(product.avg_price)} media</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Nessun prodotto venduto nel periodo</p>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stati Ordini</h3>
          {analytics?.order_status_breakdown?.length > 0 ? (
            <div className="space-y-3">
              {analytics.order_status_breakdown.map((status, index) => {
                const total = analytics.order_status_breakdown.reduce((sum, s) => sum + parseInt(s.count), 0);
                const percentage = formatPercentage(status.count, total);
                const statusLabels = {
                  confirmed: 'Confermati',
                  processing: 'In Elaborazione',
                  shipped: 'Spediti',
                  delivered: 'Consegnati',
                  cancelled: 'Annullati',
                  returned: 'Restituiti'
                };
                
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        status.order_status === 'delivered' ? 'bg-green-500' :
                        status.order_status === 'shipped' ? 'bg-blue-500' :
                        status.order_status === 'processing' ? 'bg-yellow-500' :
                        status.order_status === 'confirmed' ? 'bg-gray-500' :
                        'bg-red-500'
                      }`}></div>
                      <span className="text-gray-900 font-medium">
                        {statusLabels[status.order_status] || status.order_status}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{status.count}</span>
                      <span className="text-gray-500 ml-2">({percentage})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Nessun ordine nel periodo</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple Line Chart Component
const SimpleLineChart = ({ data, dataKey, color }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d[dataKey]));
  const minValue = Math.min(...data.map(d => d[dataKey]));
  const range = maxValue - minValue || 1;

  const points = data.map((d, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((d[dataKey] - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-full relative">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        
        {/* Area under curve */}
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={color}
          fillOpacity="0.1"
        />
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Data points */}
        {data.map((d, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - ((d[dataKey] - minValue) / range) * 100;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="1.5"
              fill={color}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      
      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 transform translate-y-full pt-2">
        {data.map((d, index) => (
          index % Math.ceil(data.length / 6) === 0 && (
            <span key={index}>{d.date}</span>
          )
        ))}
      </div>
      
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 transform -translate-x-full pr-2">
        <span>{dataKey === 'revenue' ? formatPrice(maxValue) : formatNumber(maxValue)}</span>
        <span>{dataKey === 'revenue' ? formatPrice(minValue) : formatNumber(minValue)}</span>
      </div>
    </div>
  );

  function formatPrice(price) {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact'
    }).format(price || 0);
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('it-IT', {
      notation: 'compact'
    }).format(num || 0);
  }
};

export default AnalyticsDashboard;