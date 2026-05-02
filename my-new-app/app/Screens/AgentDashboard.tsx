import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const { width } = Dimensions.get('window');
// Use local IP for physical device testing
const API = 'http://127.0.0.1:8081';
const MAX_IMAGES = 10;

// ── DESIGN TOKENS ──────────────────────────────────────────────
const COLORS = {
  bgBase: '#F0F4F8',
  bgCard: '#FFFFFF',
  bgElevated: '#E8EEF5',
  bgInput: '#F7F9FC',
  accent: '#1565C0',
  accentLight: '#1976D2',
  accentMuted: 'rgba(21,101,192,0.08)',
  accentBorder: 'rgba(21,101,192,0.25)',
  success: '#15803d',
  successBg: '#dcfce7',
  successBorder: 'rgba(21,128,61,0.25)',
  danger: '#b91c1c',
  dangerBg: '#fee2e2',
  dangerBorder: 'rgba(185,28,28,0.25)',
  booked: '#b45309',
  bookedBg: '#fef3c7',
  bookedBorder: 'rgba(180,83,9,0.25)',
  whatsapp: '#25D366',
  whatsappBg: 'rgba(37,211,102,0.1)',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  border: 'rgba(0,0,0,0.07)',
  borderStrong: 'rgba(0,0,0,0.12)',
};

const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
const FONT = { xs: 11, sm: 12, base: 14, md: 15, lg: 17, xl: 20, xxl: 24 };

export default function AgentDashboard({ route, navigation }: any) {
  const agent = route.params?.agent;

  const [mainTab, setMainTab] = useState<'listings' | 'negotiations'>('listings');
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [sortStatus, setSortStatus] = useState<'all' | 'available' | 'booked' | 'unavailable'>('all');

  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [negotiationsLoading, setNegotiationsLoading] = useState(false);
  const [respondModal, setRespondModal] = useState(false);
  const [selectedNeg, setSelectedNeg] = useState<any>(null);
  const [agentResponse, setAgentResponse] = useState('');
  const [responseStatus, setResponseStatus] = useState<'accepted' | 'rejected' | 'countered'>('accepted');
  const [responding, setResponding] = useState(false);

  // ── FORM STATE ──────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'available' | 'booked' | 'unavailable'>('available');
  const [images, setImages] = useState<any[]>([]);

  // ── DERIVED DATA ────────────────────────────────────────────────
  const filteredProperties =
    sortStatus === 'all'
      ? properties
      : properties.filter((p) => p.status === sortStatus);

  const availableCount = properties.filter((p) => p.status === 'available').length;
  const bookedCount = properties.filter((p) => p.status === 'booked').length;
  const unavailableCount = properties.filter((p) => p.status === 'unavailable').length;

  // ── FETCH ───────────────────────────────────────────────────────
  const fetchProperties = useCallback(async () => {
    if (!agent?.id) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/properties?agent_id=${agent.id}`);
      setProperties(res?.data?.data ?? []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  const fetchNegotiations = useCallback(async () => {
    if (!agent?.id) return;
    try {
      setNegotiationsLoading(true);
      const res = await axios.get(`${API}/negotiations/agent/${agent.id}`);
      setNegotiations(res?.data?.data ?? []);
    } catch (err) {
      console.error('Negotiations fetch error:', err);
    } finally {
      setNegotiationsLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);
  useEffect(() => { fetchNegotiations(); }, [fetchNegotiations]);

  const handleLogout = () => {
    navigation.replace('AgentLogin');
  };

  const submitNegotiationResponse = async () => {
    if (!selectedNeg || !agentResponse.trim()) return;
    try {
      setResponding(true);
      await axios.put(`${API}/negotiations/${selectedNeg.id}/respond`, {
        agent_response: agentResponse,
        status: responseStatus,
      });
      setRespondModal(false);
      setAgentResponse('');
      setSelectedNeg(null);
      fetchNegotiations();
    } catch {
      Alert.alert('Error', 'Failed to send response.');
    } finally {
      setResponding(false);
    }
  };

  const openRespondModal = (neg: any) => {
    setSelectedNeg(neg);
    setAgentResponse('');
    setResponseStatus('accepted');
    setRespondModal(true);
  };

  const openWhatsApp = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() => Alert.alert('Error', 'Cannot open WhatsApp'));
  };

  const pickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.slice(0, remaining)]);
    }
  };

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  const resetForm = () => {
    setName(''); setLocation(''); setPrice('');
    setPhoneNumber(''); setStatus('available');
    setImages([]); setEditingProperty(null);
    setModalVisible(false);
  };

  const startEdit = (item: any) => {
    setEditingProperty(item);
    setName(item.name); setLocation(item.location);
    setPrice(String(item.price)); setPhoneNumber(item.phone || '');
    setStatus(item.status || 'available'); setImages([]);
    setModalVisible(true);
  };

  // ── FIXED SUBMIT ALGORITHM ───────────────────────────────────────
  const submitProperty = async () => {
    if (!name || !location || !price || !phoneNumber) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('location', location);
      formData.append('price', price.toString());
      formData.append('phone_number', phoneNumber);
      formData.append('status', status);
      formData.append('agent_id', String(agent.id));

      images.forEach((img, index) => {
        const uri = img.uri;
        const fileExt = uri.split('.').pop() || 'jpg';
        formData.append('images', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: `prop_${Date.now()}_${index}.${fileExt}`,
          type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
        } as any);
      });

      if (editingProperty) {
        await axios.put(`${API}/properties/${editingProperty.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axios.post(`${API}/addproperties/${agent.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      resetForm(); fetchProperties();
    } catch (err: any) {
      console.error('Submit error:', err?.response?.data || err);
      Alert.alert('Error', 'Failed to save property.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProperty = (id: number) => {
    Alert.alert('Delete Property', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try { await axios.delete(`${API}/properties/${id}`); fetchProperties(); } 
          catch { Alert.alert('Error', 'Failed to delete.'); }
        }},
    ]);
  };

  // ── RENDER PROPERTY ──────────────────────────────────────────────
  const renderProperty = ({ item, index }: any) => {
    const propImages = Array.isArray(item.image) ? item.image : (item.image ? [item.image] : []);
    const isAvailable = item.status === 'available';
    const isBooked = item.status === 'booked';
    
    const statusStyle = isAvailable ? styles.statusBadgeAvail : isBooked ? styles.statusBadgeBooked : styles.statusBadgeTaken;
    const dotColor = isAvailable ? COLORS.success : isBooked ? COLORS.booked : COLORS.danger;

    return (
      <View style={[styles.card, { marginTop: index === 0 ? 0 : 12 }]}>
        <View style={styles.cardImageWrap}>
          {propImages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled>
              {propImages.map((uri: string, i: number) => (
                <Image key={i} source={{ uri }} style={styles.cardImage} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.cardImagePlaceholder}><Text style={styles.cardImagePlaceholderIcon}>🏠</Text></View>
          )}
          {propImages.length > 1 && <View style={styles.photoBadge}><Text style={styles.photoBadgeText}>⬛ {propImages.length}</Text></View>}
          <View style={[styles.statusBadge, statusStyle]}>
            <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
            <Text style={[styles.statusBadgeText, { color: dotColor }]}>{item.status?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardMeta}><Text>📍</Text><Text style={styles.cardMetaText}>{item.location}</Text></View>
          <Text style={styles.cardPrice}>TZS {Number(item.price).toLocaleString()}</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionWA} onPress={() => openWhatsApp(item.phone)}>
              <Text style={styles.actionWAText}>💬 WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => startEdit(item)}><Text>✏️</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionIconBtn, styles.actionIconBtnDanger]} onPress={() => deleteProperty(item.id)}><Text>🗑️</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderNegotiation = ({ item }: any) => {
    const statusColor =
      item.status === 'accepted' ? COLORS.success :
      item.status === 'rejected' ? COLORS.danger :
      item.status === 'countered' ? COLORS.accentLight :
      COLORS.booked;

    return (
      <View style={styles.negCard}>
        <View style={styles.negHeader}>
          <Text style={styles.negClient}>{item.client_name}</Text>
          <View style={[styles.negStatusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '50' }]}>
            <Text style={[styles.negStatusText, { color: statusColor }]}>{item.status?.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.negPhone}>📞 {item.client_phone}</Text>
        <Text style={styles.negOffer}>Offer: <Text style={styles.negOfferPrice}>TZS {Number(item.offer_price).toLocaleString()}</Text></Text>
        <Text style={styles.negMessage}>&ldquo;{item.client_message}&rdquo;</Text>
        {item.agent_response ? (
          <View style={styles.negResponseBox}>
            <Text style={styles.negResponseLabel}>Your response:</Text>
            <Text style={styles.negResponseText}>{item.agent_response}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.respondBtn} onPress={() => openRespondModal(item)}>
            <Text style={styles.respondBtnText}>Reply to Offer</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const FILTER_TABS = [
    { key: 'all', label: 'All', count: properties.length },
    { key: 'available', label: 'Available', count: availableCount },
    { key: 'booked', label: 'Booked', count: bookedCount },
    { key: 'unavailable', label: 'Taken', count: unavailableCount },
  ] as const;

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: COLORS.bgBase }}>
        <View style={styles.topBar}>
          <Text style={styles.topGreeting}>Dashboard</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => navigation.navigate('AgentAiChat', { agent })} style={styles.aiBtn}>
              <Text style={styles.aiBtnText}>AI ✦</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.menuBtn}>
              <View style={styles.menuLine} /><View style={[styles.menuLine, { width: 14 }]} /><View style={styles.menuLine} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.mainTabRow}>
          <TouchableOpacity style={[styles.mainTab, mainTab === 'listings' && styles.mainTabActive]} onPress={() => setMainTab('listings')}>
            <Text style={[styles.mainTabText, mainTab === 'listings' && styles.mainTabTextActive]}>Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainTab, mainTab === 'negotiations' && styles.mainTabActive]} onPress={() => { setMainTab('negotiations'); fetchNegotiations(); }}>
            <Text style={[styles.mainTabText, mainTab === 'negotiations' && styles.mainTabTextActive]}>
              Offers {negotiations.filter(n => n.status === 'pending').length > 0 ? `(${negotiations.filter(n => n.status === 'pending').length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {mainTab === 'listings' ? (
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProperty}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProperties} />}
          ListHeaderComponent={
            <>
              <View style={styles.profileCard}>
                <Image source={{ uri: agent.profile_image || `https://ui-avatars.com/api/?name=${agent.name}` }} style={styles.avatar} />
                <View style={styles.profileInfo}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <Text style={styles.agentMeta}>📍 {agent.location}</Text>
                </View>
              </View>
              {/* Quick access row */}
              <View style={styles.quickRow}>
                <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Analytics', { agent })}>
                  <Text style={styles.quickIcon}>📊</Text>
                  <Text style={styles.quickLabel}>Analytics</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('LeadPipeline', { agent })}>
                  <Text style={styles.quickIcon}>🎯</Text>
                  <Text style={styles.quickLabel}>Leads</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Subscription', { agent })}>
                  <Text style={styles.quickIcon}>⭐</Text>
                  <Text style={styles.quickLabel}>Subscription</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}><Text style={styles.addBtnText}>+ Add Property</Text></TouchableOpacity>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {FILTER_TABS.map((tab) => (
                  <TouchableOpacity key={tab.key} style={[styles.filterTab, sortStatus === tab.key && styles.filterTabActive]} onPress={() => setSortStatus(tab.key)}>
                    <Text style={[styles.filterTabText, sortStatus === tab.key && styles.filterTabTextActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          }
        />
      ) : (
        <FlatList
          data={negotiations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNegotiation}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={negotiationsLoading} onRefresh={fetchNegotiations} />}
          ListEmptyComponent={
            negotiationsLoading ? null : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No offers yet</Text>
                <Text style={styles.emptyStateSub}>Client offers will appear here</Text>
              </View>
            )
          }
        />
      )}

      {/* RESPOND TO NEGOTIATION MODAL */}
      <Modal visible={respondModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.respondModalBox}>
            <Text style={styles.modalTitle}>Reply to Offer</Text>
            {selectedNeg && (
              <Text style={styles.negOffer}>
                Client offered: <Text style={styles.negOfferPrice}>TZS {Number(selectedNeg.offer_price).toLocaleString()}</Text>
              </Text>
            )}
            <Text style={styles.fieldLabel}>Your Response</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              value={agentResponse}
              onChangeText={setAgentResponse}
              placeholder="Write your response to the client..."
              multiline
            />
            <Text style={styles.fieldLabel}>Outcome</Text>
            <View style={styles.statusRow}>
              {(['accepted', 'rejected', 'countered'] as const).map((s) => (
                <TouchableOpacity key={s} style={[styles.statusBtn, responseStatus === s && styles.statusBtnActive]} onPress={() => setResponseStatus(s)}>
                  <Text style={[styles.statusBtnText, responseStatus === s && { color: '#fff' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: COLORS.bgElevated }]} onPress={() => setRespondModal(false)}>
                <Text style={[styles.saveBtnText, { color: COLORS.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { flex: 2 }]} onPress={submitNegotiationResponse} disabled={responding}>
                {responding ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Send Reply</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD / EDIT MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetForm}><Text style={styles.modalCloseText}>✕</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{editingProperty ? 'Edit Listing' : 'New Listing'}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.fieldLabel}>Photos ({images.length}/{MAX_IMAGES})</Text>
            <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImages}>
              <Text>📷 Add Photos</Text>
            </TouchableOpacity>
            
            <ScrollView horizontal style={styles.previewStrip}>
              {images.map((img, i) => (
                <View key={i} style={styles.previewWrap}>
                  <Image source={{ uri: img.uri }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(i)}><Text style={styles.removeBtnText}>✕</Text></TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Property Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />

            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation} />

            <Text style={styles.fieldLabel}>Price (TZS)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />

            <Text style={styles.fieldLabel}>Contact Number</Text>
            <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />

            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.statusRow}>
              {['available', 'booked', 'unavailable'].map((s: any) => (
                <TouchableOpacity key={s} style={[styles.statusBtn, status === s && styles.statusBtnActive]} onPress={() => setStatus(s)}>
                  <Text style={[styles.statusBtnText, status === s && { color: '#fff' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={submitProperty} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Listing</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  topGreeting: { fontSize: FONT.xl, fontWeight: '700' },
  menuBtn: { gap: 4, alignItems: 'flex-end' },
  menuLine: { width: 20, height: 2, backgroundColor: COLORS.textSecondary },
  listContent: { padding: 16 },
  profileCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: RADIUS.xl, marginBottom: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  profileInfo: { marginLeft: 12, justifyContent: 'center' },
  agentName: { fontWeight: 'bold' },
  agentMeta: { fontSize: FONT.xs, color: COLORS.textSecondary },
  addBtn: { backgroundColor: COLORS.accent, padding: 15, borderRadius: RADIUS.lg, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  filterScroll: { marginBottom: 16 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill, marginRight: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border },
  filterTabActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterTabText: { fontSize: FONT.sm },
  filterTabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: width - 32, height: 200 },
  cardImagePlaceholder: { height: 120, backgroundColor: COLORS.bgElevated, justifyContent: 'center', alignItems: 'center' },
  cardImagePlaceholderIcon: { fontSize: 40, opacity: 0.3 },
  photoBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 4 },
  photoBadgeText: { color: '#fff', fontSize: 10 },
  statusBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: RADIUS.pill, backgroundColor: '#fff' },
  statusBadgeAvail: { backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: COLORS.successBorder },
  statusBadgeBooked: { backgroundColor: COLORS.bookedBg, borderWidth: 1, borderColor: COLORS.bookedBorder },
  statusBadgeTaken: { backgroundColor: COLORS.dangerBg, borderWidth: 1, borderColor: COLORS.dangerBorder },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  cardBody: { padding: 14 },
  cardName: { fontWeight: 'bold', fontSize: FONT.md },
  cardMeta: { flexDirection: 'row', marginTop: 4 },
  cardMetaText: { fontSize: FONT.sm, color: COLORS.textSecondary, marginLeft: 4 },
  cardPrice: { fontSize: FONT.lg, fontWeight: 'bold', color: COLORS.accent, marginTop: 8 },
  cardActions: { flexDirection: 'row', marginTop: 12, gap: 8 },
  actionWA: { flex: 1, backgroundColor: COLORS.whatsappBg, padding: 10, borderRadius: RADIUS.md, alignItems: 'center' },
  actionWAText: { color: COLORS.whatsapp, fontWeight: 'bold' },
  actionIconBtn: { width: 40, height: 40, backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  actionIconBtnDanger: { backgroundColor: COLORS.dangerBg },
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalCloseText: { fontSize: FONT.xl, fontWeight: 'bold', color: COLORS.textPrimary },
  modalTitle: { fontWeight: 'bold', fontSize: FONT.lg },
  modalScroll: { padding: 16 },
  fieldLabel: { fontWeight: 'bold', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: COLORS.bgInput, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  imagePlaceholder: { height: 100, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.textMuted, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  previewStrip: { flexDirection: 'row', marginTop: 10 },
  previewWrap: { marginRight: 10, position: 'relative' },
  previewImage: { width: 80, height: 80, borderRadius: RADIUS.sm },
  removeBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { color: '#fff', fontSize: 12 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, padding: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  statusBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  statusBtnText: { fontSize: 12, textTransform: 'capitalize' },
  saveBtn: { backgroundColor: COLORS.accent, padding: 16, borderRadius: RADIUS.lg, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },

  // Quick access
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickBtn: { flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  quickIcon: { fontSize: 22, marginBottom: 4 },
  quickLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },

  // Main tabs
  mainTabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  mainTab: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.pill, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border },
  mainTabActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  mainTabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  mainTabTextActive: { color: '#fff' },

  // AI button
  aiBtn: { backgroundColor: COLORS.accentMuted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.accentBorder },
  aiBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },

  // Negotiation cards
  negCard: { backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  negHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  negClient: { fontWeight: 'bold', fontSize: 15, color: COLORS.textPrimary },
  negStatusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill, borderWidth: 1 },
  negStatusText: { fontSize: 11, fontWeight: '700' },
  negPhone: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  negOffer: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  negOfferPrice: { fontWeight: 'bold', color: COLORS.accent },
  negMessage: { fontStyle: 'italic', color: COLORS.textSecondary, fontSize: 13, marginBottom: 12 },
  negResponseBox: { backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md, padding: 10 },
  negResponseLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, marginBottom: 2 },
  negResponseText: { fontSize: 13, color: COLORS.textPrimary },
  respondBtn: { backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.md, padding: 10, alignItems: 'center' },
  respondBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 13 },

  // Empty state
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyStateText: { fontSize: 17, fontWeight: '600', color: COLORS.textSecondary },
  emptyStateSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  // Respond modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  respondModalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
});