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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

export default function AgentDashboard({ route, navigation }: any) {
  const agent = route.params?.agent;

  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'available' | 'unavailable'>('available');
  const [image, setImage] = useState<any>(null);

  const [drawerVisible, setDrawerVisible] = useState(false);

  const API = "http://127.0.0.1:8081";

  // ---------------- FETCH ----------------
  const fetchProperties = useCallback(async () => {
    if (!agent?.id) return;

    try {
      setLoading(true);
      const res = await axios.get(`${API}/properties?agent_id=${agent.id}`);
      setProperties(res?.data?.data ?? []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // ---------------- LOGOUT ----------------
  const handleLogout = () => {
    setDrawerVisible(false);
    navigation.replace('AgentLogin');
  };

  // ---------------- WHATSAPP ----------------
  const openWhatsApp = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, '');
    const url = `https://wa.me/${clean}?text=Hello%20I%20am%20interested%20in%20your%20property`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Cannot open WhatsApp")
    );
  };

  // ---------------- IMAGE PICKER ----------------
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  // ---------------- RESET ----------------
  const resetForm = () => {
    setName('');
    setLocation('');
    setPrice('');
    setPhoneNumber('');
    setStatus('available');
    setImage(null);
    setEditingProperty(null);
    setModalVisible(false);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const startEdit = (item: any) => {
    setEditingProperty(item);
    setName(item.name);
    setLocation(item.location);
    setPrice(String(item.price));
    setPhoneNumber(item.phone || '');
    setStatus(item.status || 'available');
    setImage(null); // reset image; user can pick a new one if desired
    setModalVisible(true);
  };

  // ---------------- SUBMIT ----------------
  const submitProperty = async () => {
    if (!name || !location || !price || !phoneNumber) {
      Alert.alert("Error", "Fill all fields");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('name', name);
      formData.append('location', location);
      formData.append('price', Number(price).toString());
      formData.append('phone_number', phoneNumber);
      formData.append('status', status);

      if (image) {
        formData.append('image', {
          uri: image.uri,
          name: `property_${Date.now()}.jpg`,
          type: 'image/jpeg'
        } as any);
      }

      if (editingProperty) {
        // PUT requires: name, location, price, agent_id, image (optional)
        formData.append('agent_id', String(agent.id));

        await axios.put(
          `${API}/properties/${editingProperty.id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      } else {
        await axios.post(
          `${API}/addproperties/${agent.id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      }

      resetForm();
      fetchProperties();

    } catch (err: any) {
      console.error("Submit error:", err?.response?.data || err);
      Alert.alert("Error", "Failed to submit property");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- DELETE ----------------
  const deleteProperty = (id: number) => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: async () => {
          await axios.delete(`${API}/properties/${id}`);
          fetchProperties();
        }
      }
    ]);
  };

  // ---------------- CARD ----------------
  const renderProperty = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.propertyName}>{item.name}</Text>
      <Text style={styles.propertyPrice}>
        TZS {Number(item.price).toLocaleString()}
      </Text>

      {item.phone && <Text>📞 {item.phone}</Text>}
      {item.status && <Text>Status: {item.status}</Text>}

      {item.image && (
        <Image source={{ uri: item.image }} style={styles.propImage} />
      )}

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => startEdit(item)}>
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => deleteProperty(item.id)}>
          <Text style={styles.delete}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!agent) {
    return (
      <View style={styles.center}>
        <Text>No agent found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* HEADER */}
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={properties}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProperty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchProperties} />
        }
        ListHeaderComponent={
          <>
            {/* PROFILE */}
            <View style={styles.profileCard}>
              <Image
                source={{
                  uri:
                    agent.profile_image ||
                    `https://ui-avatars.com/api/?name=${agent.name}`
                }}
                style={styles.avatar}
              />
              <Text style={styles.name}>{agent.name}</Text>
              <Text>📍 {agent.location}</Text>
              <Text>📞 {agent.phone}</Text>

              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={() => openWhatsApp(agent.phone)}
              >
                <Text style={{ color: '#fff' }}>Chat WhatsApp</Text>
              </TouchableOpacity>
            </View>

            {/* ADD BUTTON */}
            <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
              <Text style={styles.addText}>+ Add Property</Text>
            </TouchableOpacity>
          </>
        }
      />

      {/* DRAWER */}
      <Modal visible={drawerVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.drawerOverlay}
          onPress={() => setDrawerVisible(false)}
        />
        <View style={styles.drawer}>
          <Text style={styles.drawerTitle}>Menu</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>
            {editingProperty ? "Edit Property" : "Add Property"}
          </Text>

          <TextInput placeholder="Name" style={styles.input} value={name} onChangeText={setName} />
          <TextInput placeholder="Location" style={styles.input} value={location} onChangeText={setLocation} />
          <TextInput placeholder="Price" style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} />
          <TextInput placeholder="Phone" style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} />

          {/* STATUS */}
          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            <TouchableOpacity
              style={[styles.statusBtn, status === 'available' && styles.activeStatus]}
              onPress={() => setStatus('available')}
            >
              <Text>Available</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusBtn, status === 'unavailable' && styles.activeStatus]}
              onPress={() => setStatus('unavailable')}
            >
              <Text>Unavailable</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
            <Text>Pick Image</Text>
          </TouchableOpacity>

          {image && <Image source={{ uri: image.uri }} style={styles.preview} />}

          <TouchableOpacity style={styles.saveBtn} onPress={submitProperty}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff' }}>Save</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={resetForm}>
            <Text style={{ textAlign: 'center', marginTop: 10 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    backgroundColor: '#1E88E5',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  safeArea: {
    backgroundColor: '#1E88E5',
  },

  topTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  menuIcon: { color: '#fff', fontSize: 22 },

  profileCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center'
  },

  avatar: { width: 70, height: 70, borderRadius: 40 },
  name: { fontSize: 18, fontWeight: 'bold' },

  whatsappBtn: {
    backgroundColor: '#25D366',
    padding: 8,
    borderRadius: 8,
    marginTop: 10
  },

  addBtn: {
    backgroundColor: '#1E88E5',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center'
  },

  addText: { color: '#fff', fontWeight: 'bold' },

  card: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 15,
    borderRadius: 10
  },

  propertyName: { fontWeight: 'bold' },
  propertyPrice: { color: '#1E88E5' },

  propImage: { width: '100%', height: 150, marginVertical: 10 },

  actions: { flexDirection: 'row', gap: 20 },
  edit: { color: 'green' },
  delete: { color: 'red' },

  modal: { flex: 1, padding: 20, justifyContent: 'center' },
  modalTitle: { fontSize: 20, marginBottom: 20 },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    padding: 10
  },

  statusBtn: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    alignItems: 'center'
  },

  activeStatus: {
    backgroundColor: '#1E88E5'
  },

  imageBtn: {
    backgroundColor: '#ddd',
    padding: 10,
    alignItems: 'center'
  },

  preview: {
    width: 100,
    height: 100,
    marginTop: 10,
    alignSelf: 'center'
  },

  saveBtn: {
    backgroundColor: '#1E88E5',
    padding: 12,
    marginTop: 15,
    alignItems: 'center'
  },

  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },

  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: '#fff',
    padding: 20
  },

  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20
  },

  logoutText: {
    color: 'red',
    fontSize: 16
  }
});