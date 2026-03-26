import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";

const API_URL = "http://127.0.0.1:8081";

// -----------------------------
// TYPE
// -----------------------------
interface Agent {
  id: number;
  name: string;
  phone: string;
  location?: string;
  profile_image?: string | null;
}

// -----------------------------
// COMPONENT
// -----------------------------
export default function AgentProfileScreen() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // ===============================
  // FETCH AGENTS
  // ===============================
  const fetchAgents = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_URL}/get_agents`);
      const data = res.data?.data || [];

      setAgents(data);
    } catch (err) {
      console.log("Fetch agents error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // ===============================
  // WHATSAPP
  // ===============================
  const contactAgent = (phone: string) => {
    if (!phone) return;

    const clean = phone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${clean}`);
  };

  // ===============================
  // RENDER ITEM
  // ===============================
  const renderItem = ({ item }: { item: Agent }) => (
    <View style={styles.card}>
      {item.profile_image && (
        <Image source={{ uri: item.profile_image }} style={styles.image} />
      )}

      <Text style={styles.name}>{item.name}</Text>

      {item.location && (
        <Text style={styles.location}>📍 {item.location}</Text>
      )}

      <TouchableOpacity
        style={styles.whatsappBtn}
        onPress={() => contactAgent(item.phone)}
      >
        <Text style={styles.whatsappText}>WhatsApp</Text>
      </TouchableOpacity>
    </View>
  );

  // ===============================
  // LOADING
  // ===============================
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="steelblue" />
        </View>
      </SafeAreaView>
    );
  }

  // ===============================
  // MAIN UI
  // ===============================
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        
        <Text style={styles.header}>Agents</Text>

        <FlatList
          key="2-columns"
          data={agents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 30 }}
        />

      </View>
    </SafeAreaView>
  );
}

// -----------------------------
// STYLES
// -----------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10, // small natural spacing only
  },

  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "steelblue",
  },

  row: {
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#eee",
  },

  image: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
  },

  name: {
    fontSize: 16,
    fontWeight: "bold",
  },

  location: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },

  whatsappBtn: {
    marginTop: 8,
    backgroundColor: "#25D366",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },

  whatsappText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});