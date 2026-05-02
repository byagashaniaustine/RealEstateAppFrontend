import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";

// Update this to your local machine IP if testing on a real device
const API_URL = "http://127.0.0.1:8081";

// -----------------------------
// TYPES
// -----------------------------
type Property = {
  id: number;
  name: string;
  location: string;
  price: number;
  image?: string | string[]; // Support for single or multiple images
  agent_id: number;
  phone?: string;
  status?: string;
};

type RootStackParamList = {
  ViewProperty: { property: Property };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ViewProperty">;

export default function PropertyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filtered, setFiltered] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [sortPrice, setSortPrice] = useState<"low" | "high" | "">("");
  const [loading, setLoading] = useState(false);

  // ===============================
  // FETCH DATA
  // ===============================
  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/properties`);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setProperties(data);
      setFiltered(data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // ===============================
  // FILTER & SORT LOGIC
  // ===============================
  useEffect(() => {
    let data = [...properties];

    if (search) {
      data = data.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (location) {
      data = data.filter((item) =>
        item.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    if (sortPrice === "low") {
      data.sort((a, b) => a.price - b.price);
    } else if (sortPrice === "high") {
      data.sort((a, b) => b.price - a.price);
    }

    setFiltered(data);
  }, [search, location, sortPrice, properties]);

  // ===============================
  // ACTIONS
  // ===============================
  const contactOwner = (phone?: string) => {
    if (!phone) {
      alert("No phone number available");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${cleanPhone}`);
  };

  // ===============================
  // RENDER COMPONENTS
  // ===============================
  const renderItem = ({ item }: { item: Property }) => {
    // Handle multi-image logic: Extract first image if it's an array
    const displayImage = Array.isArray(item.image) 
      ? item.image[0] 
      : item.image;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ViewProperty", { property: item })}
      >
        <View style={styles.imageContainer}>
          {displayImage ? (
            <Image source={{ uri: displayImage }} style={styles.image} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          {item.status === "unavailable" && (
            <View style={styles.soldBadge}>
              <Text style={styles.soldText}>SOLD</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.locationText} numberOfLines={1}>📍 {item.location}</Text>
          
          <Text style={styles.price}>
            TZS {Number(item.price).toLocaleString()}
          </Text>

          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={() => contactOwner(item.phone)}
          >
            <Text style={styles.whatsappText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.header}>Explore Properties</Text>

        {/* SEARCH SECTION */}
        <View style={styles.searchSection}>
          <TextInput
            placeholder="Search house, apartment..."
            value={search}
            onChangeText={setSearch}
            style={styles.input}
          />
          <TextInput
            placeholder="Location (e.g. Kinondoni)"
            value={location}
            onChangeText={setLocation}
            style={styles.input}
          />
        </View>

        {/* SORT BAR */}
        <View style={styles.sortRow}>
          <TouchableOpacity onPress={() => setSortPrice("low")} style={[styles.sortBtn, sortPrice === 'low' && styles.activeSort]}>
            <Text style={styles.sortBtnText}>Price: Low</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSortPrice("high")} style={[styles.sortBtn, sortPrice === 'high' && styles.activeSort]}>
            <Text style={styles.sortBtnText}>Price: High</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {setSortPrice(""); setSearch(""); setLocation("");}}>
            <Text style={styles.clearBtn}>Reset</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.row}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No properties found.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, paddingHorizontal: 15 },
  header: { fontSize: 26, fontWeight: "800", marginVertical: 15, color: "#1E293B" },
  searchSection: { marginBottom: 10 },
  input: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    fontSize: 14,
  },
  sortRow: { flexDirection: "row", alignItems: "center", marginBottom: 15, gap: 10 },
  sortBtn: { backgroundColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  activeSort: { backgroundColor: "#2563EB" },
  sortBtnText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  clearBtn: { color: "#EF4444", fontWeight: "bold", fontSize: 12 },
  row: { justifyContent: "space-between" },
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    overflow: "hidden",
  },
  imageContainer: { width: "100%", height: 120 },
  image: { width: "100%", height: "100%" },
  placeholderImage: { flex: 1, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#94A3B8", fontSize: 12 },
  cardContent: { padding: 10 },
  title: { fontWeight: "bold", fontSize: 14, color: "#1E293B" },
  locationText: { fontSize: 12, color: "#64748B", marginTop: 2 },
  price: { color: "#059669", fontWeight: "700", fontSize: 14, marginVertical: 6 },
  whatsappBtn: { backgroundColor: "#25D366", paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  whatsappText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  soldBadge: { position: "absolute", top: 5, right: 5, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, borderRadius: 4 },
  soldText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  emptyText: { textAlign: "center", marginTop: 50, color: "#94A3B8" },
});