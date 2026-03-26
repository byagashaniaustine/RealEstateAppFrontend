import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';

// 10.0.2.2 is the required alias for the Android Emulator to see your local server
const API_URL = 'http://127.0.0.1:8081'; 

export default function AgentLogin({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      console.error('Login error:', error);
      
      // Better error messaging for connection issues
      const errorMsg = error.response?.data?.detail || 
                       (error.message.includes('Network Error') 
                        ? 'Cannot reach server. Check if backend is running.' 
                        : 'Invalid credentials');
      
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
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
  registerBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: 'steelblue',
    fontWeight: '600',
    fontSize: 14,
  },
});