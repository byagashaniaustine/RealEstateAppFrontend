import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";

const API = "http://127.0.0.1:8081";

const ACCENT = "#1565C0";

export default function AnalyticsDashboard({ route, navigation }: any) {
  const agent = route?.params?.agent;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/analytics/agent/${agent.id}`);
      setData(res.data?.data ?? null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const props = data?.properties ?? {};
  const bookings = data?.bookings ?? {};
  const negs = data?.negotiations ?? {};
  const monthly: Record<string, number> = bookings.monthly ?? {};
  const maxMonthly = Math.max(...Object.values(monthly), 1);

  const stages = [
    { key: "new", label: "New", color: "#2563EB" },
    { key: "contacted", label: "Contacted", color: "#7C3AED" },
    { key: "viewing_scheduled", label: "Viewing", color: "#D97706" },
    { key: "closed", label: "Closed", color: "#15803D" },
    { key: "lost", label: "Lost", color: "#B91C1C" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} />}
      >
        {/* PROPERTY STATS */}
        <Text style={styles.sectionTitle}>Listings</Text>
        <View style={styles.statsRow}>
          <StatCard label="Total" value={props.total ?? 0} color={ACCENT} />
          <StatCard label="Available" value={props.available ?? 0} color="#15803D" />
          <StatCard label="Booked" value={props.booked ?? 0} color="#D97706" />
          <StatCard label="Taken" value={props.unavailable ?? 0} color="#B91C1C" />
        </View>

        {/* BOOKING + NEGOTIATION OVERVIEW */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsRow}>
          <StatCard label="Total Leads" value={bookings.total ?? 0} color={ACCENT} wide />
          <StatCard label="Pending Offers" value={negs.pending ?? 0} color="#D97706" wide />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Accepted Offers" value={negs.accepted ?? 0} color="#15803D" wide />
          <StatCard label="Rejected" value={negs.rejected ?? 0} color="#B91C1C" wide />
        </View>

        {/* LEAD PIPELINE STAGES */}
        <Text style={styles.sectionTitle}>Lead Pipeline</Text>
        <View style={styles.card}>
          {stages.map((s) => {
            const count = bookings.stages?.[s.key] ?? 0;
            const pct = bookings.total > 0 ? count / bookings.total : 0;
            return (
              <View key={s.key} style={styles.stageRow}>
                <Text style={styles.stageLabel}>{s.label}</Text>
                <View style={styles.stageBarBg}>
                  <View style={[styles.stageBar, { width: `${Math.round(pct * 100)}%`, backgroundColor: s.color }]} />
                </View>
                <Text style={[styles.stageCount, { color: s.color }]}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* MONTHLY BOOKINGS */}
        <Text style={styles.sectionTitle}>Bookings — Last 6 Months</Text>
        <View style={[styles.card, styles.chartWrap]}>
          {Object.entries(monthly).map(([month, count]) => (
            <View key={month} style={styles.barCol}>
              <Text style={styles.barValue}>{count}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: `${Math.round((count / maxMonthly) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{month}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, color, wide }: any) {
  return (
    <View style={[styles.statCard, wide && styles.statCardWide]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4F8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F0F4F8",
  },
  back: { fontSize: 24, color: ACCENT },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6B7280", marginTop: 20, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center" },
  statCardWide: { flex: 1 },
  statValue: { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16 },
  stageRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  stageLabel: { width: 70, fontSize: 12, color: "#374151" },
  stageBarBg: { flex: 1, height: 8, backgroundColor: "#E5E7EB", borderRadius: 4, overflow: "hidden", marginHorizontal: 8 },
  stageBar: { height: "100%", borderRadius: 4, minWidth: 4 },
  stageCount: { width: 24, textAlign: "right", fontSize: 12, fontWeight: "700" },
  chartWrap: { flexDirection: "row", alignItems: "flex-end", height: 160, justifyContent: "space-around", paddingBottom: 8 },
  barCol: { alignItems: "center", flex: 1, height: "100%" },
  barValue: { fontSize: 10, color: "#6B7280", marginBottom: 4 },
  barTrack: { flex: 1, width: 20, backgroundColor: "#E5E7EB", borderRadius: 4, justifyContent: "flex-end", overflow: "hidden" },
  bar: { width: "100%", backgroundColor: ACCENT, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: "#6B7280", marginTop: 4 },
});
