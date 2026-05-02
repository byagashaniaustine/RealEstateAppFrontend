import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";

const API = "http://127.0.0.1:8081";
const ACCENT = "#1565C0";

const STAGES = [
  { key: "new", label: "New", color: "#2563EB", bg: "#EFF6FF" },
  { key: "contacted", label: "Contacted", color: "#7C3AED", bg: "#F5F3FF" },
  { key: "viewing_scheduled", label: "Viewing", color: "#D97706", bg: "#FFFBEB" },
  { key: "closed", label: "Closed", color: "#15803D", bg: "#F0FDF4" },
  { key: "lost", label: "Lost", color: "#B91C1C", bg: "#FEF2F2" },
];

export default function LeadPipeline({ route, navigation }: any) {
  const agent = route?.params?.agent;
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [filterStage, setFilterStage] = useState<string>("all");

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/leads/agent/${agent.id}`);
      setLeads(res.data?.data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStage = async (bookingId: number, stage: string) => {
    try {
      setUpdating(bookingId);
      await axios.put(`${API}/leads/${bookingId}/stage`, { stage });
      setLeads((prev) => prev.map((l) => l.id === bookingId ? { ...l, stage } : l));
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filterStage === "all" ? leads : leads.filter((l) => (l.stage || "new") === filterStage);

  const renderLead = ({ item }: any) => {
    const stage = item.stage || "new";
    const stageInfo = STAGES.find((s) => s.key === stage) || STAGES[0];
    const isUpdating = updating === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.clientName}>{item.user_name}</Text>
            <Text style={styles.clientPhone}>📞 {item.user_phone}</Text>
          </View>
          <View style={[styles.stagePill, { backgroundColor: stageInfo.bg }]}>
            <Text style={[styles.stagePillText, { color: stageInfo.color }]}>{stageInfo.label}</Text>
          </View>
        </View>

        <Text style={styles.propName}>🏠 {item.property_name}</Text>
        <Text style={styles.visitDate}>📅 Visit: {item.visit_date}</Text>

        {isUpdating ? (
          <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 10 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageRow}>
            {STAGES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.stageBtn, stage === s.key && { backgroundColor: s.color }]}
                onPress={() => stage !== s.key && updateStage(item.id, s.key)}
              >
                <Text style={[styles.stageBtnText, stage === s.key && { color: "#fff" }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Pipeline</Text>
        <Text style={styles.count}>{leads.length}</Text>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity style={[styles.filterTab, filterStage === "all" && styles.filterTabActive]} onPress={() => setFilterStage("all")}>
          <Text style={[styles.filterTabText, filterStage === "all" && styles.filterTabTextActive]}>All ({leads.length})</Text>
        </TouchableOpacity>
        {STAGES.map((s) => {
          const cnt = leads.filter((l) => (l.stage || "new") === s.key).length;
          return (
            <TouchableOpacity key={s.key} style={[styles.filterTab, filterStage === s.key && { backgroundColor: s.color, borderColor: s.color }]} onPress={() => setFilterStage(s.key)}>
              <Text style={[styles.filterTabText, filterStage === s.key && { color: "#fff" }]}>{s.label} ({cnt})</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLead}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLeads} />}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No leads yet</Text>
              <Text style={styles.emptySub}>Bookings will appear here as leads</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4F8" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  back: { fontSize: 24, color: ACCENT },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  count: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  filterScroll: { flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff" },
  filterTabActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterTabText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  filterTabTextActive: { color: "#fff" },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.07)" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  clientName: { fontWeight: "700", fontSize: 15, color: "#111827" },
  clientPhone: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  stagePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  stagePillText: { fontSize: 11, fontWeight: "700" },
  propName: { fontSize: 13, color: "#374151", marginBottom: 2 },
  visitDate: { fontSize: 12, color: "#6B7280", marginBottom: 12 },
  stageRow: { flexDirection: "row" },
  stageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", marginRight: 6, backgroundColor: "#F9FAFB" },
  stageBtnText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 17, fontWeight: "600", color: "#6B7280" },
  emptySub: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },
});
