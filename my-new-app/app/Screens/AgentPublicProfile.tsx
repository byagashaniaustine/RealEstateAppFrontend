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
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";

const API_URL = "http://127.0.0.1:8081";
const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface Agent {
  id: number;
  name: string;
  phone: string;
  location?: string;
  profile_image?: string | null;
}

interface Property {
  id: number;
  name: string;
  location: string;
  price: number;
  status: string;
  image?: string | string[];
}

export default function AgentPublicProfile({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const agent_id: number = route?.params?.agent_id;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentRes, propsRes] = await Promise.all([
          axios.get(`${API_URL}/get_agents`, { params: { agent_id } }),
          axios.get(`${API_URL}/properties`, { params: { agent_id } }),
        ]);
        setAgent(agentRes.data?.data?.[0] ?? null);
        setProperties(propsRes.data?.data ?? []);
      } catch (err) {
        console.log("AgentPublicProfile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [agent_id]);

  const openWhatsApp = () => {
    if (!agent?.phone) return;
    const clean = agent.phone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${clean}`);
  };

  const getFirstImage = (image: string | string[] | undefined): string | null => {
    if (!image) return null;
    return Array.isArray(image) ? image[0] ?? null : image;
  };

  const statusColor = (status: string) => {
    if (status === "available") return "#15803d";
    if (status === "booked") return "#b45309";
    return "#6B7280";
  };

  const renderProperty = ({ item }: { item: Property }) => {
    const img = getFirstImage(item.image);
    return (
      <TouchableOpacity
        style={styles.propCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("ViewProperty", { id: item.id })}
      >
        {img ? (
          <Image source={{ uri: img }} style={styles.propImage} />
        ) : (
          <View style={[styles.propImage, styles.propImagePlaceholder]}>
            <Text style={styles.propImagePlaceholderText}>🏠</Text>
          </View>
        )}
        <View style={styles.propInfo}>
          <Text style={styles.propName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.propLocation} numberOfLines={1}>📍 {item.location}</Text>
          <Text style={styles.propPrice}>
            TZS {item.price?.toLocaleString()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "22" }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agent Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        style={styles.listBg}
        data={properties}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProperty}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Agent Card */}
            <View style={styles.agentCard}>
              {agent?.profile_image ? (
                <Image source={{ uri: agent.profile_image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {agent?.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </Text>
                </View>
              )}

              <Text style={styles.agentName}>{agent?.name ?? "Unknown Agent"}</Text>

              {agent?.location && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationText}>📍 {agent.location}</Text>
                </View>
              )}

              {agent?.phone && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationText}>📞 {agent.phone}</Text>
                </View>
              )}

              <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp} activeOpacity={0.85}>
                <Text style={styles.whatsappText}>💬  Chat on WhatsApp</Text>
              </TouchableOpacity>
            </View>

            {/* Section heading */}
            <Text style={styles.sectionTitle}>
              Listings ({properties.length})
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>This agent has no listings yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { width: 36, padding: 4 },
  backText: { fontSize: 22, color: "#2563EB" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },

  listBg: { flex: 1, backgroundColor: "#F3F4F6" },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  agentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    padding: 24,
    marginTop: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 14,
  },
  avatarPlaceholder: {
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 38, fontWeight: "700", color: "#2563EB" },
  agentName: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  locationText: { fontSize: 14, color: "#4B5563" },
  whatsappBtn: {
    marginTop: 16,
    backgroundColor: "#25D366",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  whatsappText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  row: { justifyContent: "space-between" },

  propCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 14,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  propImage: {
    width: "100%",
    height: 110,
  },
  propImagePlaceholder: {
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  propImagePlaceholderText: { fontSize: 32 },
  propInfo: { padding: 10 },
  propName: { fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 2 },
  propLocation: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  propPrice: { fontSize: 13, fontWeight: "700", color: "#2563EB", marginBottom: 6 },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusText: { fontSize: 10, fontWeight: "600", textTransform: "capitalize" },

  emptyBox: { alignItems: "center", paddingTop: 40 },
  emptyText: { color: "#9CA3AF", fontSize: 14 },
});
