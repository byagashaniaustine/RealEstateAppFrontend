import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import axios from 'axios';

// 10.0.2.2 is the required alias for the Android Emulator to see your local server
const API_URL = 'http://127.0.0.1:8081'; 

export default function AgentLogin({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async () => {
    // Basic Validation
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter both email and password');
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`${API_URL}/login`, {
        email: email.trim(),
        password: password,
      });

      console.log("Server Response:", res.data);

      if (res.data.status === 'success') {
        // We expect the backend to send { status: 'success', data: { id: 1, name: '...' } }
        const agentData = res.data.data; 

        if (agentData && agentData.id) {
          // Success! Pass the single agent object to the Dashboard
          navigation.replace('AgentDashboard', {
            agent: agentData,
          });
        } else {
          // Triggered if 'data' key is null or doesn't have an ID
          Alert.alert('Data Error', 'Agent profile found but data is incomplete.');
        }
      } else {
        Alert.alert('Login failed', res.data.message || 'Invalid credentials');
      }
    } catch (error: any) {
      
      // Better error messaging for connection issues
      const errorMsg = error.response?.data?.detail || 
                       (error.message.includes('Network Error') 
                        ? 'Cannot reach server. Check if backend is running.' 
                        : 'Invalid credentials');
      
      Alert.alert( errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Enter your email address');
      return;
    }
    try {
      setResetLoading(true);
      const res = await axios.post(`${API_URL}/forgot-password`, { email: resetEmail.trim() });
      if (res.data.status === 'success') {
        setForgotModal(false);
        setResetEmail('');
        Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
      } else {
        Alert.alert('Error', res.data.message || 'Could not send reset email.');
      }
    } catch {
      Alert.alert('Error', 'Could not reach server.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* FORGOT PASSWORD MODAL */}
      <Modal visible={forgotModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSub}>Enter your email and we will send you a reset link.</Text>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.loginButton} onPress={handleForgotPassword} disabled={resetLoading}>
              {resetLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Send Reset Link</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setForgotModal(false); setResetEmail(''); }} style={styles.registerBtn}>
              <Text style={styles.registerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.card}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Agent Login</Text>

        <TextInput
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setForgotModal(true)} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('AgentRegister')}
          style={styles.registerBtn}
        >
          <Text style={styles.registerText}>
            Not registered? Create an account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'steelblue',
    textAlign: 'center',
    marginBottom: 25,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  loginButton: {
    backgroundColor: 'steelblue',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  forgotBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
  forgotText: {
    color: '#888',
    fontSize: 13,
  },
  registerBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  registerText: {
    color: 'steelblue',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'steelblue',
    marginBottom: 6,
    textAlign: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    padding: 4,
  },
  backArrow: {
    fontSize: 24,
    color: 'steelblue',
  },
  modalSub: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});