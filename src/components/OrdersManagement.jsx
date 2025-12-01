import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, AlertCircle, Edit, Search, Filter, Download } from 'lucide-react';

const OrdersManagement = ({ sellerId }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);

  // Stati ordini con traduzioni e colori
  const orderStatuses = {
    confirmed: { label: 'Confermato', color: 'bg-blue-100 text-blue-800', icon: Clock },
    processing: { label: 'In Elaborazione', color: 'bg-yellow-100 text-yellow-800', icon: Package },
    shipped: { label: 'Spedito', color: 'bg-purple-100 text-purple-800', icon: Truck },
    delivered: { label: 'Consegnato', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Annullato', color: 'bg-red-100 text-red-800', icon: AlertCircle },
    returned: { label: 'Restituito', color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
  };

  const shippingStatuses = {
    pending: { label: 'In Attesa', color: 'bg-gray-100 text-gray-600' },
    label_created: { label: 'Etichetta Creata', color: 'bg-blue-100 text-blue-600' },
    picked_up: { label: 'Ritirato', color: 'bg-yellow-100 text-yellow-600' },
    in_transit: { label: 'In Transito', color: 'bg-purple-100 text-purple-600' },
    out_for_delivery: { label: 'In Consegna', color: 'bg-orange-100 text-orange-600' },
    delivered: { label: 'Consegnato', color: 'bg-green-100 text-green-600' },
    failed_delivery: { label: 'Consegna Fallita', color: 'bg-red-100 text-red-600' }
  };

  const paymentStatuses = {
    pending: { label: 'In Attesa', color: 'bg-yellow-100 text-yellow-700' },
    processing: { label: 'In Elaborazione', color: 'bg-blue-100 text-blue-700' },
    paid: { label: 'Pagato', color: 'bg-green-100 text-green-700' },
    failed: { label: 'Fallito', color: 'bg-red-100 text-red-700' },
    refunded: { label: 'Rimborsato', color: 'bg-gray-100 text-gray-700' }
  };

  useEffect(() => {
    loadOrders();
  }, [sellerId]);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedStatus, searchTerm]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/seller/${sellerId}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
        console.log('✅ Ordini caricati:', data.length);
      } else {
        console.error('Errore caricamento ordini');
      }
    } catch (error) {
      console.error('Errore caricamento ordini:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filtra per stato
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.order_status === selectedStatus);
    }

    // Filtra per termine di ricerca
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.buyer_first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.buyer_last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId, updates) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        console.log('✅ Ordine aggiornato');
        loadOrders(); // Ricarica ordini
        setEditingOrder(null);
      } else {
        console.error('Errore aggiornamento ordine');
      }
    } catch (error) {
      console.error('Errore aggiornamento ordine:', error);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusCounts = () => {
    const counts = {};
    Object.keys(orderStatuses).forEach(status => {
      counts[status] = orders.filter(order => order.order_status === status).length;
    });
    counts.all = orders.length;
    return counts;
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header con statistiche */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestione Ordini</h2>
          <p className="text-gray-600 mt-1">Gestisci tutti i tuoi ordini e spedizioni</p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download size={16} />
          <span>Esporta</span>
        </button>
      </div>

      {/* Statistiche rapide */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div 
          className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedStatus === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          onClick={() => setSelectedStatus('all')}
        >
          <div className="text-2xl font-bold">{statusCounts.all}</div>
          <div className="text-sm opacity-75">Tutti</div>
        </div>
        {Object.entries(orderStatuses).map(([status, config]) => (
          <div 
            key={status}
            className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedStatus === status ? 'bg-gray-900 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => setSelectedStatus(status)}
          >
            <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
            <div className="text-sm opacity-75">{config.label}</div>
          </div>
        ))}
      </div>

      {/* Filtri e ricerca */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cerca per numero ordine, prodotto o cliente..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">Tutti gli stati</option>
          {Object.entries(orderStatuses).map(([status, config]) => (
            <option key={status} value={status}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Lista ordini */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nessun ordine trovato</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedStatus !== 'all' ? 'Prova a modificare i filtri' : 'I tuoi ordini appariranno qui'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Info ordine */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-semibold text-gray-900">#{order.order_number}</span>
                      <span className="ml-3 text-gray-500">{formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${orderStatuses[order.order_status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {orderStatuses[order.order_status]?.label || order.order_status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatuses[order.payment_status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {paymentStatuses[order.payment_status]?.label || order.payment_status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Prodotto:</span>
                      <p className="font-medium">{order.product_title}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Cliente:</span>
                      <p className="font-medium">
                        {order.buyer_first_name} {order.buyer_last_name}
                      </p>
                      <p className="text-sm text-gray-500">{order.buyer_email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Totale:</span>
                      <p className="font-bold text-lg text-green-600">{formatPrice(order.total_amount)}</p>
                    </div>
                  </div>

                  {/* Spedizione */}
                  <div className="bg-gray-50 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-500">Spedizione:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${shippingStatuses[order.shipping_status]?.color || 'bg-gray-100 text-gray-600'}`}>
                          {shippingStatuses[order.shipping_status]?.label || order.shipping_status}
                        </span>
                      </div>
                      {order.tracking_number && (
                        <div>
                          <span className="text-sm text-gray-500">Tracking:</span>
                          <code className="ml-1 px-2 py-1 bg-gray-200 rounded text-sm">{order.tracking_number}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Azioni */}
                <div className="flex flex-col space-y-2 lg:w-48">
                  <button
                    onClick={() => setEditingOrder(order)}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Edit size={16} />
                    <span>Gestisci</span>
                  </button>
                  
                  {/* Quick actions */}
                  {order.order_status === 'confirmed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, { order_status: 'processing' })}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                    >
                      Inizia Elaborazione
                    </button>
                  )}
                  
                  {order.order_status === 'processing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, { 
                        order_status: 'shipped', 
                        shipping_status: 'picked_up' 
                      })}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                    >
                      Segna Spedito
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal modifica ordine */}
      {editingOrder && (
        <OrderEditModal 
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onUpdate={updateOrderStatus}
          orderStatuses={orderStatuses}
          shippingStatuses={shippingStatuses}
          paymentStatuses={paymentStatuses}
        />
      )}
    </div>
  );
};

// Modal per editing ordine
const OrderEditModal = ({ order, onClose, onUpdate, orderStatuses, shippingStatuses, paymentStatuses }) => {
  const [formData, setFormData] = useState({
    order_status: order.order_status,
    shipping_status: order.shipping_status,
    payment_status: order.payment_status,
    tracking_number: order.tracking_number || '',
    notes: order.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(order.id, formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Gestisci Ordine #{order.order_number}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info ordine */}
            <div className="bg-gray-50 rounded p-4">
              <h4 className="font-medium mb-2">Dettagli Ordine</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Prodotto:</span>
                  <p className="font-medium">{order.product_title}</p>
                </div>
                <div>
                  <span className="text-gray-500">Totale:</span>
                  <p className="font-medium">€{order.total_amount}</p>
                </div>
                <div>
                  <span className="text-gray-500">Cliente:</span>
                  <p className="font-medium">{order.buyer_first_name} {order.buyer_last_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium">{order.buyer_email}</p>
                </div>
              </div>
            </div>

            {/* Stati */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stato Ordine</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.order_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_status: e.target.value }))}
                >
                  {Object.entries(orderStatuses).map(([status, config]) => (
                    <option key={status} value={status}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stato Spedizione</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.shipping_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, shipping_status: e.target.value }))}
                >
                  {Object.entries(shippingStatuses).map(([status, config]) => (
                    <option key={status} value={status}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stato Pagamento</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.payment_status}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                >
                  {Object.entries(paymentStatuses).map(([status, config]) => (
                    <option key={status} value={status}>{config.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tracking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numero Tracking</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Es. IT123456789"
                value={formData.tracking_number}
                onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note Venditore</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Note interne sull'ordine..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Azioni */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salva Modifiche
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrdersManagement;