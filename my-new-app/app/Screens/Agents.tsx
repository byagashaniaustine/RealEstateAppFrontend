// app/Screens/Agents.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

// -----------------------------
// Types
// -----------------------------
interface AgentData {
  name: string;
  phone: string;
  email: string;
  password: string;
  location: string;
}

interface ImageData {
  uri: string;
  name: string;
  type: string;
}

// -----------------------------
// Component
// -----------------------------
export default function AgentsScreen({navigation}: any ) {
  const [data, setData] = useState<AgentData>({
    name: '',
    phone: '',
    email: '',
    password: '',
    location: '',
  });

  const [image, setImage] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(false);

  
    // Pick file (image)
    const pickFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      multiple: false,
    });

    // 1. Check if the user closed the picker without selecting anything
    if (result.canceled || !result.assets) {
      console.log("User cancelled the picker");
      return; 
    }

    // 2. Safe access to the first asset
    const asset = result.assets[0];

    // 3. Set the state with the correctly formatted object
    setImage({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'image/jpeg', // Fallback type
    });

  } catch (error) {
    console.error("Error picking document:", error);
    Alert.alert("Error", "Could not access the gallery.");
  }
};
 
  // -----------------------------
  // Register Agent
  // -----------------------------
  const registerAgent = async () => {
    // Validation
    if (!data.name || !data.phone || !data.email || !data.password || !data.location) {
      Alert.alert('Validation', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('phone', data.phone);
      formData.append('email', data.email);
      formData.append('password', data.password);
      formData.append('location', data.location);

      if (image) {
        // Append image to FormData
        formData.append('image', {
          uri: image.uri,
          name: image.name,
          type: image.type,
        } as any);
      }

      const res = await fetch('http://127.0.0.1:8081/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const response = await res.json();

      if (response.status === 'success') {
        Alert.alert('Success', 'Agent registered successfully,You can now login');
        navigation.replace('AgentLogin');
        setData({ name: '', phone: '', email: '', password: '', location: '' });
        setImage(null);
      } else {
        Alert.alert('Error', response.message || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to register agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Agent Registration</Text>
        <Text style={styles.subtitle}>Register as a verified Dalali</Text>

        <TextInput
          placeholder="Full Name"
          style={styles.input}
          value={data.name}
          onChangeText={(text) => setData({ ...data, name: text })}
        />

        <TextInput
          placeholder="Phone Number"
          keyboardType="phone-pad"
          style={styles.input}
          value={data.phone}
          onChangeText={(text) => setData({ ...data, phone: text })}
        />

        <TextInput
          placeholder="Email Address"
          keyboardType="email-address"
          style={styles.input}
          value={data.email}
          onChangeText={(text) => setData({ ...data, email: text })}
        />

        <TextInput
          placeholder="Password"
          style={styles.input}
          secureTextEntry
          value={data.password}
          onChangeText={(text) => setData({ ...data, password: text })}
        />

        <TextInput
          placeholder="Operating Location"
          style={styles.input}
          value={data.location}
          onChangeText={(text) => setData({ ...data, location: text })}
        />

        {/* Image Picker */}
        <TouchableOpacity style={styles.imageBtn} onPress={pickFile}>
          <Text style={styles.imageBtnText}>{image ? 'Change Image' : 'Pick Profile Image'}</Text>
        </TouchableOpacity>
        {image && <Image source={{ uri: image.uri }} style={styles.preview} />}

        {/* Register Button */}
        <TouchableOpacity style={styles.button} onPress={registerAgent} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register Agent</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          By registering, you agree to our terms & verification process.
        </Text>
      </View>
    </ScrollView>
  );
}

// -----------------------------
// Styles
// -----------------------------
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f8fb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: 'steelblue',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: 'steelblue',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageBtn: {
    backgroundColor: '#1565C0',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  imageBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  preview: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 12,
  },
  note: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    marginTop: 14,
  },
});