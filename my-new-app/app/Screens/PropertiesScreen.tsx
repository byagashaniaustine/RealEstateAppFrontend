import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
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
type Property = {
  id: number;
  name: string;
  location: string;
  price: number;
  image?: string;
  agent_id: number;
  phone?: string;
};

export default function PropertyScreen() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filtered, setFiltered] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [sortPrice, setSortPrice] = useState<"low" | "high" | "">("");
  const [loading, setLoading] = useState(true);

  // ===============================
  // FETCH
  // ===============================
  const fetchProperties = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_URL}/properties`);

      // ✅ FIX: always ensure array
      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setProperties(data);
      setFiltered(data);

    } catch (error) {
      console.log("Fetch error:", error);
      setProperties([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // ===============================
  // FILTER + SORT (SAFE)
  // ===============================
  useEffect(() => {
    let data = Array.isArray(properties) ? [...properties] : [];

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
  // WHATSAPP
  // ===============================
  const contactOwner = (phone?: string) => {
    if (!phone) {
      alert("No phone number available");
      return;
    }

    const clean = phone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/${clean}`);
  };

  // ===============================
  // CARD
  // ===============================
  const renderItem = ({ item }: { item: Property }) => (
    <View style={styles.card}>
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.image} />
      )}

      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.location}>📍 {item.location}</Text>

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
  );

  // ===============================
  // LOADING
  // ===============================
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  // ===============================
  // UI
  // ===============================
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <Text style={styles.header}>Properties</Text>

        <TextInput
          placeholder="Search..."
          value={search}
          onChangeText={setSearch}
          style={styles.input}
        />

        <TextInput
          placeholder="Location..."
          value={location}
          onChangeText={setLocation}
          style={styles.input}
        />

        <View style={styles.sortRow}>
          <TouchableOpacity onPress={() => setSortPrice("low")}>
            <Text style={styles.sortBtn}>Low</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSortPrice("high")}>
            <Text style={styles.sortBtn}>High</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setSortPrice("")}>
            <Text style={styles.sortBtn}>Clear</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          key="2-columns" // ✅ FIX crash
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
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
    paddingHorizontal: 15,
    paddingTop: 10,
  },

  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#2563EB",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },

  sortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  sortBtn: {
    backgroundColor: "#2563EB",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: "hidden",
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
    marginBottom: 5,
  },

  title: {
    fontWeight: "bold",
    fontSize: 15,
  },

  location: {
    fontSize: 13,
    color: "#666",
  },

  price: {
    color: "green",
    fontWeight: "600",
    marginVertical: 5,
  },

  whatsappBtn: {
    backgroundColor: "#25D366",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },

  whatsappText: {
    color: "#fff",
    fontWeight: "bold",
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});