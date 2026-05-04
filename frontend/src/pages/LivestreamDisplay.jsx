import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Button, Select, AutoComplete, Space, Typography, message, Spin, Empty, Tag } from 'antd';
import { AppstoreOutlined, VideoCameraOutlined } from '@ant-design/icons';
import api from '../api';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import Bi from '../components/Bi';

const { Text } = Typography;

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return value;
  }
  return num.toLocaleString('id-ID');
};

const LivestreamDisplay = () => {
  const { t } = useTranslation();
  const [stores, setStores] = useState([]);
  const [store, setStore] = useState(null);
  const [etalases, setEtalases] = useState([]);
  const [etalase, setEtalase] = useState('');
  const [items, setItems] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  const [priceType, setPriceType] = useState(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingEtalases, setLoadingEtalases] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingPriceTypes, setLoadingPriceTypes] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const res = await api.get('/livestream-display/stores');
      setStores(res.data.stores || []);
      if (!store && res.data.stores?.length) {
        setStore(res.data.stores[0]);
      }
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to load stores');
    } finally {
      setLoadingStores(false);
    }
  };

  const loadPriceTypes = async () => {
    setLoadingPriceTypes(true);
    try {
      const res = await api.get('/livestream-display/price-types');
      setPriceTypes(res.data.price_types || []);
      if (!priceType && res.data.price_types?.length) {
        setPriceType(res.data.price_types[0]);
      }
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to load price types');
    } finally {
      setLoadingPriceTypes(false);
    }
  };

  const loadEtalases = async (selectedStore) => {
    setLoadingEtalases(true);
    try {
      const params = selectedStore ? { store: selectedStore } : {};
      const res = await api.get('/livestream-display/etalases', { params });
      setEtalases(res.data.etalases || []);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to load etalases');
    } finally {
      setLoadingEtalases(false);
    }
  };

  const loadItems = async (selectedStore, selectedEtalase, selectedPriceType) => {
    if (!selectedStore || !selectedEtalase) {
      setItems([]);
      return;
    }
    setLoadingItems(true);
    try {
      const res = await api.get('/livestream-display/items', {
        params: {
          store: selectedStore,
          etalase: selectedEtalase,
          price_type: selectedPriceType,
        },
      });
      setItems(res.data.items || []);
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to load display items');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/livestream-display/sync', {});
      message.success(res.data.message || 'Sheet synced successfully');
      await loadPriceTypes();
      await loadStores();
      if (store) {
        await loadEtalases(store);
      }
      if (store && etalase) {
        await loadItems(store, etalase, priceType);
      }
    } catch (err) {
      message.error(err.response?.data?.detail || 'Failed to sync livestream sheet');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadStores();
    loadPriceTypes();
  }, []);

  useEffect(() => {
    if (store) {
      setEtalase('');
      loadEtalases(store);
    } else {
      setEtalases([]);
      setEtalase('');
    }
    setItems([]);
  }, [store]);

  return (
    <div>
      <PageHeader
        title={<Bi i18nKey="livestream.title" />}
        subtitle={<Bi i18nKey="livestream.subtitle" />}
        accent="#0f766e"
        actions={(
          <Button
            type="primary"
            icon={<VideoCameraOutlined />}
            loading={syncing}
            onClick={handleSync}
            style={{ height: 36, borderRadius: 10, fontWeight: 600 }}
          >
            <Bi i18nKey="livestream.syncSheet" />
          </Button>
        )}
      />

      <Card style={{ borderRadius: 18, border: '1px solid var(--border)', marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('livestream.store')}</Text>
            <Select
              value={store}
              placeholder="Select store"
              onChange={setStore}
              loading={loadingStores}
              options={stores.map((value) => ({ label: value, value }))}
              showSearch
              filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Etalase</Text>
            <AutoComplete
              value={etalase}
              options={etalases.map((value) => ({ value }))}
              onChange={setEtalase}
              onPressEnter={() => {
                if (store && etalase) {
                  loadItems(store, etalase, priceType);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && store && etalase) {
                  loadItems(store, etalase, priceType);
                }
              }}
              placeholder="Type etalase number"
              disabled={!store}
              filterOption={(inputValue, option) =>
                option.value.toLowerCase().includes(inputValue.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={6}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Price Tier</Text>
            <Select
              value={priceType}
              placeholder="Select price tier"
              onChange={setPriceType}
              loading={loadingPriceTypes}
              options={priceTypes.map((value) => ({ label: value, value }))}
              disabled={!priceTypes.length}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} md={2}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Action</Text>
              <Button
                icon={<AppstoreOutlined />}
                block
                onClick={() => {
                  if (!store) {
                    message.warning('Please select a store first');
                    return;
                  }
                  if (!etalase) {
                    message.warning('Please type an etalase number');
                    return;
                  }
                  loadItems(store, etalase, priceType);
                }}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 18, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Text strong style={{ fontSize: 16 }}>Display Items</Text>
            {etalase ? (
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 20, fontWeight: 700 }}>Etalase {etalase}</Text>
                <Text type="secondary">Showing livestream items for the selected etalase.</Text>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>Showing livestream items for the selected etalase.</div>
            )}
          </div>
          <Text type="secondary">{items.length} items</Text>
        </div>

        {loadingItems ? (
          <div style={{ textAlign: 'center', padding: 80 }}><Spin /></div>
        ) : !store ? (
          <Empty description="Select a store" />
        ) : !etalase ? (
          <Empty description="Type an etalase number" />
        ) : items.length === 0 ? (
          <Empty description="No display items found" />
        ) : (
          <Row gutter={[20, 20]}>
            {items.map((item, index) => (
              <Col xs={24} sm={24} md={16} lg={18} key={`${item.pid}-${index}`}>
                <Card hoverable bodyStyle={{ padding: 24 }} style={{ borderRadius: 18, minHeight: 360 }}>
                  {item.image_url ? (
                    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
                      <div style={{ width: 120, minWidth: 120, aspectRatio: '1 / 1', position: 'relative', overflow: 'hidden', borderRadius: 18, background: '#111827' }}>
                        <img src={item.image_url} alt={`PID ${item.pid}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 18 }}>{item.display_name || `PID ${item.pid}`}</Text>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          {item.pid ? <Tag color="cyan" style={{ fontSize: 12, padding: '0 10px' }}>PID: {item.pid}</Tag> : null}
                          {item.etalase ? <Tag color="purple" style={{ fontSize: 12, padding: '0 10px' }}>Etalase {item.etalase}</Tag> : null}
                        </div>
                        {item.notes ? <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 13 }}>{item.notes}</Text> : null}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 18 }}>
                      <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 22 }}>{item.display_name || `PID ${item.pid}`}</Text>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        {item.pid ? <Tag color="cyan" style={{ fontSize: 12, padding: '0 10px' }}>PID: {item.pid}</Tag> : null}
                        {item.etalase ? <Tag color="purple" style={{ fontSize: 12, padding: '0 10px' }}>Etalase {item.etalase}</Tag> : null}
                        {item.notes ? <Text type="secondary" style={{ fontSize: 13 }}>{item.notes}</Text> : null}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: 18 }}>
                    <Text strong style={{ fontSize: 15 }}>MIDs</Text>
                    <div style={{ marginTop: 12, display: 'grid', gap: 14 }}>
                      {item.mids.map((mid, midIndex) => (
                        <Card key={`${mid.sku_string || mid.mid_name}-${midIndex}`} size="small" style={{ borderRadius: 16 }} bodyStyle={{ padding: 18 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 15 }}>{mid.mid_name || `MID ${mid.mid_code || ''}`.trim()}</Text>
                              <Text style={{ display: 'block', marginBottom: 8, fontSize: 12, color: '#f8fafc', wordBreak: 'break-word' }}>SKU: {mid.sku_string || 'No SKU string'}</Text>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: 120 }}>
                              <Text strong style={{ fontSize: 18, color: '#059669' }}>{mid.price != null ? `Rp ${formatPrice(mid.price)}` : '-'}</Text>
                              <div style={{ marginTop: 4 }}><Tag color="green" style={{ fontSize: 12, padding: '0 8px' }}>Price</Tag></div>
                            </div>
                          </div>

                          {mid.token_photos?.length ? (
                            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: '100%', justifyContent: 'flex-start' }}>
                              {mid.token_photos.slice(0, 5).map((tokenPhoto, tokenIndex) => (
                                <div key={`${tokenPhoto.sku}-${tokenIndex}`} style={{ width: 120, borderRadius: 18, overflow: 'hidden', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)' }}>
                                  <div style={{ width: '100%', aspectRatio: '1 / 1', position: 'relative', background: '#111827' }}>
                                    {tokenPhoto.photo ? (
                                      <img src={tokenPhoto.photo} alt={tokenPhoto.sku} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <div style={{ position: 'absolute', inset: 0, background: '#111827' }} />
                                    )}
                                  </div>
                                  <div style={{ padding: 8 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>{tokenPhoto.sku}</Text>
                                    <Text type="secondary" style={{ fontSize: 10, lineHeight: 1.3 }}>{tokenPhoto.name || '-'}</Text>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            mid.sku_tokens?.length ? (
                              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                                {mid.sku_tokens.slice(0, 5).map((token, tokenIndex) => (
                                  <Tag key={`${token}-${tokenIndex}`} color="blue" style={{ padding: '0 8px', fontSize: 12, width: '100%', textAlign: 'center' }}>{token}</Tag>
                                ))}
                              </div>
                            ) : null
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>
    </div>
  );
};

export default LivestreamDisplay;
