import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";

/* ---------------- CONFIG ---------------- */

const API_URL = "http://127.0.0.1:8081";

/* ---------------- TYPES ---------------- */

interface Property {
  id: number;
  name: string;
  price: number;
  image?: string;
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

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="steelblue" />
        </View>
      </SafeAreaView>
    );
  }

  /* ---------------- UI ---------------- */

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
            <TouchableOpacity onPress={() => setOpen(false)}>
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

        {/* ROLE */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleTitle}>What are you looking for?</Text>

          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("Properties")}
            >
              <Text style={styles.buttonText}>I'm a Client</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("AgentLogin")}
            >
              <Text style={styles.buttonText}>I'm an Agent</Text>
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
          {properties.slice(0, 5).map((item) => (
            <TouchableOpacity key={item.id} style={styles.card}>
              <Image
                source={{ uri: item.image }}
                style={styles.cardImage}
              />
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>TZS {item.price}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ================= AGENTS ================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Agents</Text>

          <TouchableOpacity onPress={() => navigation.navigate("Agents")}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {agents.slice(0, 5).map((agent) => (
            <TouchableOpacity key={agent.id} style={styles.card}>
              <Image
                source={{ uri: agent.profile_image }}
                style={styles.cardImage}
              />
              <Text style={styles.cardTitle}>{agent.name}</Text>
              <Text style={styles.cardSub}>Verified Agent</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* HEADER */
  header: {
    backgroundColor: "steelblue",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },

  /* HERO */
  heroImage: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },

  /* ROLE */
  roleContainer: {
    padding: 16,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "steelblue",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },

  /* SECTION */
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  viewAll: {
    color: "steelblue",
    fontWeight: "600",
  },

  /* CARD */
  card: {
    width: 180,
    marginLeft: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 3,
    marginBottom: 10,
  },
  cardImage: {
    width: "100%",
    height: 110,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
    paddingHorizontal: 10,
  },
  cardSub: {
    fontSize: 12,
    color: "#666",
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  /* SIDEBAR */
  sidebar: {
    backgroundColor: "#fff",
    padding: 20,
    elevation: 10,
  },
  item: {
    fontSize: 18,
    marginVertical: 10,
  },
  close: {
    fontSize: 22,
    alignSelf: "flex-end",
  },
});