import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";

const API = "http://127.0.0.1:8081";
const ACCENT = "#1565C0";
const REDIRECT_URL = "https://dalalikiganjani.com/payment-success"; // update when domain is ready

const PLANS = [
  {
    key: "monthly",
    label: "Monthly",
    price: "TZS 50,000",
    per: "per month",
    desc: "Cancel anytime",
    color: ACCENT,
  },
  {
    key: "annual",
    label: "Annual",
    price: "TZS 500,000",
    per: "per year",
    desc: "Save ~17% vs monthly",
    color: "#15803D",
    badge: "Best Value",
  },
];

export default function Subscription({ route, navigation }: any) {
  const agent = route?.params?.agent;
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/billing/status/${agent.id}`);
      setSub(res.data?.data ?? null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [agent?.id]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const subscribe = async (plan: string) => {
    try {
      setPaying(plan);
      const res = await axios.post(`${API}/billing/initiate`, {
        agent_id: agent.id,
        agent_name: agent.name,
        agent_email: agent.email,
        plan,
        redirect_url: REDIRECT_URL,
      });
      if (res.data?.status === "success" && res.data?.payment_link) {
        await Linking.openURL(res.data.payment_link);
        // After returning from browser, re-check status
        setTimeout(fetchStatus, 3000);
      } else {
        Alert.alert("Error", res.data?.message || "Could not start payment.");
      }
    } catch {
      Alert.alert("Error", "Could not reach server.");
    } finally {
      setPaying(null);
    }
  };

  const isActive = sub?.status === "active";
  const endDate = sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Current status */}
          <View style={[styles.statusCard, { borderColor: isActive ? "#15803D" : "#E5E7EB" }]}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? "#15803D" : "#9CA3AF" }]} />
            <View>
              <Text style={styles.statusLabel}>
                {isActive ? `${sub.plan === "annual" ? "Annual" : "Monthly"} Plan — Active` : "No Active Subscription"}
              </Text>
              {isActive && endDate && (
                <Text style={styles.statusSub}>Renews: {endDate}</Text>
              )}
              {!isActive && (
                <Text style={styles.statusSub}>Subscribe to unlock all features</Text>
              )}
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>What you get</Text>
            {[
              "AI-powered lead qualification",
              "Instant WhatsApp notifications",
              "Analytics & performance dashboard",
              "Lead pipeline management",
              "Unlimited property listings",
              "Negotiation management",
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Plans */}
          <Text style={styles.plansTitle}>Choose a Plan</Text>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.key}
              style={[styles.planCard, { borderColor: plan.color }]}
              onPress={() => subscribe(plan.key)}
              disabled={!!paying}
            >
              {plan.badge && (
                <View style={[styles.badge, { backgroundColor: plan.color }]}>
                  <Text style={styles.badgeText}>{plan.badge}</Text>
                </View>
              )}
              <View style={styles.planInfo}>
                <Text style={[styles.planLabel, { color: plan.color }]}>{plan.label}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planPer}>{plan.per} · {plan.desc}</Text>
              </View>
              {paying === plan.key ? (
                <ActivityIndicator color={plan.color} />
              ) : (
                <View style={[styles.planBtn, { backgroundColor: plan.color }]}>
                  <Text style={styles.planBtnText}>{isActive && sub?.plan === plan.key ? "Renew" : "Subscribe"}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4F8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  back: { fontSize: 24, color: ACCENT },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  content: { flex: 1, padding: 16 },
  statusCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1.5, gap: 12, marginBottom: 16 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontWeight: "700", fontSize: 14, color: "#111827" },
  statusSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  featuresCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20 },
  featuresTitle: { fontWeight: "700", fontSize: 14, color: "#111827", marginBottom: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  featureCheck: { color: "#15803D", fontWeight: "700", fontSize: 15 },
  featureText: { fontSize: 13, color: "#374151" },
  plansTitle: { fontSize: 13, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  planCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, position: "relative", overflow: "hidden" },
  badge: { position: "absolute", top: 0, right: 0, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 10 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  planInfo: { flex: 1 },
  planLabel: { fontWeight: "700", fontSize: 15 },
  planPrice: { fontSize: 20, fontWeight: "800", color: "#111827", marginTop: 2 },
  planPer: { fontSize: 12, color: "#6B7280" },
  planBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  planBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
