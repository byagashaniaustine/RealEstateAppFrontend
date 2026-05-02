import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";

/* ---------------- CONFIG ---------------- */
// Replace with your local IP if testing on a physical device
const API_URL = "http://127.0.0.1:8081";

/* ---------------- TYPES ---------------- */

interface Property {
  id: number;
  name: string;
  price: number;
  // Updated: Now explicitly handles array from Supabase text[]
  image?: string | string[]; 
  location?: string;
}

interface Agent {
  id: number;
  name: string;
  profile_image?: string;
}

/* ---------------- SCREEN ---------------- */

export default function HomeScreen({ navigation }: any) {
  const [open, setOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH DATA ---------------- */

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propRes, agentRes] = await Promise.all([
        axios.get(`${API_URL}/properties`),
        axios.get(`${API_URL}/get_agents`),
      ]);

      setProperties(propRes.data?.data || []);
      setAgents(agentRes.data?.data || []);
    } catch (err) {
      console.log("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ---------------- HELPERS ---------------- */

  // Safely extracts a single URI string from the image data
  const getThumbnail = (imageSource: any) => {
    if (Array.isArray(imageSource) && imageSource.length > 0) {
      return imageSource[0];
    }
    if (typeof imageSource === "string" && imageSource.length > 0) {
      return imageSource;
    }
    return null; // Triggers fallback
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="steelblue" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DalaliKiganjani</Text>
          <TouchableOpacity onPress={() => setOpen(!open)}>
            <Text style={{ color: "#fff", fontSize: 20 }}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* SIDEBAR */}
        {open && (
          <View style={styles.sidebar}>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.item}>Language</Text>
            <Text style={styles.item}>Settings</Text>
            <Text style={styles.item}>Help</Text>
          </View>
        )}

        {/* HERO */}
        <Image
          source={require("../assets/Green illustration Modern Home For Sale Flyer.png")}
          style={styles.heroImage}
        />

        {/* ROLE SELECTION */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleTitle}>What are you looking for?</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("Properties")}
            >
              <Text style={styles.buttonText}>I&apos;m a Client</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("AgentLogin")}
            >
              <Text style={styles.buttonText}>I&apos;m an Agent</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= PROPERTIES ================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Properties</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Properties")}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {properties.slice(0, 5).map((item) => {
            const uri = getThumbnail(item.image);
            return (
              <TouchableOpacity key={item.id} style={styles.card}>
                {uri ? (
                  <Image source={{ uri }} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.placeholder]}>
                    <Text>🏠</Text>
                  </View>
                )}
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSub}>TZS {Number(item.price).toLocaleString()}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ================= AGENTS ================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Agents</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Agents")}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {agents.slice(0, 5).map((agent) => (
            <TouchableOpacity
              key={agent.id}
              style={styles.card}
              onPress={() => navigation.navigate("AgentPublicProfile", { agent_id: agent.id })}
            >
              <Image
                source={{ uri: agent.profile_image || `https://ui-avatars.com/api/?name=${agent.name}` }}
                style={styles.cardImage}
              />
              <Text style={styles.cardTitle}>{agent.name}</Text>
              <Text style={styles.cardSub}>Verified Agent</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Floating AI Chat Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AiChat")}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>✨</Text>
        <Text style={styles.fabLabel}>AI</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "steelblue", padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  heroImage: { width: "100%", height: 220, resizeMode: "cover" },
  roleContainer: { padding: 16 },
  roleTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  roleButtons: { flexDirection: "row", gap: 12 },
  primaryButton: { flex: 1, backgroundColor: "steelblue", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  sectionHeader: { paddingHorizontal: 16, marginTop: 20, marginBottom: 10, flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  viewAll: { color: "steelblue", fontWeight: "600" },
  card: { width: 180, marginLeft: 16, backgroundColor: "#fff", borderRadius: 12, elevation: 3, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  cardImage: { width: "100%", height: 110, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  placeholder: { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: "600", marginTop: 6, paddingHorizontal: 10 },
  cardSub: { fontSize: 12, color: "#666", paddingHorizontal: 10, marginBottom: 10 },
  sidebar: { backgroundColor: "#fff", padding: 20, elevation: 10, position: 'absolute', top: 60, right: 0, left: 0, zIndex: 10 },
  item: { fontSize: 18, marginVertical: 10 },
  closeBtn: { alignSelf: "flex-end", padding: 5 },
  close: { fontSize: 22 },
  fab: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 24,
    right: 20,
    backgroundColor: "#2563EB",
    borderRadius: 30,
    width: 62,
    height: 62,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#2563EB",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabIcon: { fontSize: 22 },
  fabLabel: { color: "#fff", fontSize: 11, fontWeight: "700" },
});