import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Alert,
  FlatList, Dimensions, ScrollView, Platform, Modal,
  TextInput, ActivityIndicator, StatusBar, KeyboardAvoidingView,RefreshControl
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";

const { width } = Dimensions.get("window");
const API_URL = "http://127.0.0.1:8081";

// ── DESIGN TOKENS ──────────────────────────────────────────────
const C = {
  bgBase:        "#F0F4F8",
  bgCard:        "#FFFFFF",
  bgElevated:    "#E8EEF5",
  accent:        "#1565C0",
  accentMuted:   "rgba(21,101,192,0.08)",
  accentBorder:  "rgba(21,101,192,0.25)",
  success:       "#15803d",
  successBg:     "#dcfce7",
  successBorder: "rgba(21,128,61,0.25)",
  warning:       "#b45309",
  warningBg:     "#fef3c7",
  warningBorder: "rgba(180,83,9,0.25)",
  danger:        "#b91c1c",
  dangerBg:      "#fee2e2",
  dangerBorder:  "rgba(185,28,28,0.25)",
  textPrimary:   "#111827",
  textSecondary: "#4B5563",
  textMuted:     "#9CA3AF",
  border:        "rgba(0,0,0,0.07)",
  borderStrong:  "rgba(0,0,0,0.12)",
};

const R = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
const F = { xs: 11, sm: 12, base: 14, md: 15, lg: 17, xl: 20, xxl: 24 };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  available:   { label: "Available",  color: C.success, bg: C.successBg, border: C.successBorder },
  booked:      { label: "Booked",     color: C.warning, bg: C.warningBg, border: C.warningBorder },
  unavailable: { label: "Taken",      color: C.danger,  bg: C.dangerBg,  border: C.dangerBorder  },
};

export default function ViewProperty({ route, navigation }: any) {
  const { property } = route.params;
  const imageSource = property.image || property.images;
  const imageList   = Array.isArray(imageSource) ? imageSource : [imageSource].filter(Boolean);

  // ── STATE ────────────────────────────────────────────────────
  const [status, setStatus] = useState(property.status || "available");
  const [bookings, setBookings] = useState<any[]>([]);
  const [myBooking, setMyBooking] = useState<any>(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // 2. Add refreshing state
  // Booking modal
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookStep, setBookStep] = useState<"details" | "date">("details");
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const takingRef = useRef(false);

  // ── FETCH ────────────────────────────────────────────────────
  const fetchBookings = useCallback(async (phone?: string | null) => {
    try {
      // If we aren't refreshing via pull-down, show the inline loader
      if (!refreshing) setLoadingBookings(true);
      
      const res = await axios.get(`${API_URL}/bookings/${property.id}`);
      const data = res.data.data || [];
      setBookings(data);

      // Determine profile phone if not provided (fallback to state)
      const activePhone = phone || userPhone;

      if (activePhone) {
        const mine = data.find((b: any) => (b.user_phone?.trim() ?? "") === activePhone.trim());
        setMyBooking(mine || null);
      }
    } catch (err) {
      console.error("Fetch bookings error:", err);
    } finally {
      setLoadingBookings(false);
      setRefreshing(false); // 3. Reset refreshing state
    }
  }, [property.id, userPhone, refreshing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Re-check profile and fetch data
    AsyncStorage.getItem("dalali_profile").then((raw) => {
      if (raw) {
        const p = JSON.parse(raw);
        fetchBookings(p.phone);
      } else {
        fetchBookings(null);
      }
    });
  }, [fetchBookings]);

  // ── INITIAL LOAD ──────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const raw = await AsyncStorage.getItem("dalali_profile");
        if (raw) {
          const p = JSON.parse(raw);
          setUserName(p.name);
          setUserPhone(p.phone);
          await fetchBookings(p.phone);
        } else {
          await fetchBookings(null);
        }
      } catch (e) {
        await fetchBookings(null);
        alert("Error loading profile. Booking functionality may be affected.");
        alert(e)
      }
    };
    init();
  }, [fetchBookings]);

  // ── ACTIONS ───────────────────────────────────────────────────
  const openBookModal = () => {
    setBookStep("details");
    setSelectedDate(null);
    setShowBookModal(true);
  };

  const proceedToDate = async () => {
    if (!userName.trim() || !userPhone.trim()) {
      Alert.alert("Missing Info", "Please enter your full name and phone number.");
      return;
    }
    await AsyncStorage.setItem(
      "dalali_profile",
      JSON.stringify({ name: userName.trim(), phone: userPhone.trim() })
    );
    setBookStep("date");
    if (Platform.OS === "android") setShowDatePicker(true);
  };

  const onDateChange = (_: any, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const confirmBooking = async () => {
    if (!selectedDate) {
      Alert.alert("No Date", "Please select a visit date.");
      return;
    }
    try {
      setSubmitting(true);
      const formatted = selectedDate.toISOString().split("T")[0];
      const res = await axios.post(`${API_URL}/book`, {
        property_id: property.id,
        user_name:   userName.trim(),
        user_phone:  userPhone.trim(),
        visit_date:  formatted,
      });

      if (res.data.status === "success") {
        setShowBookModal(false);
        // Refresh to trigger "Take Property" button appearance
        await fetchBookings(userPhone.trim());
        Alert.alert("Visit Scheduled! 🎉", `Your visit is confirmed for ${formatted}.`);
      } else {
        Alert.alert("Error", res.data.message || "Booking failed.");
      }
    } catch (err) {
      Alert.alert("Error", "Could not connect to server.");
      console.log(err)
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeProperty = async () => {
    if (takingRef.current) return;
    Alert.alert(
      "Confirm Purchase",
      "Are you sure you want to finalize and take this property?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Take It",
          onPress: async () => {
            takingRef.current = true;
            try {
              await axios.put(`${API_URL}/take/${property.id}`);
              setStatus("unavailable");
              setTimeout(() => navigation.goBack(), 800);
            } catch (err) {
              Alert.alert("Error", "Could not update status.");
              console.log(err)
            } finally {
              takingRef.current = false;
            }
          },
        },
      ]
    );
  };

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.unavailable;
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* IMAGE SLIDER */}
      <View style={styles.sliderWrap}>
        <FlatList
          data={imageList.length > 0 ? imageList : [null]}
          horizontal
          pagingEnabled
          keyExtractor={(_, i) => i.toString()}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) =>
            item ? (
              <Image source={{ uri: item }} style={styles.sliderImage} />
            ) : (
              <View style={[styles.sliderImage, styles.sliderPlaceholder]}>
                <Text style={styles.sliderPlaceholderIcon}>🏠</Text>
              </View>
            )
          }
        />
        {imageList.length > 1 && (
          <View style={styles.photoCount}>
            <Text style={styles.photoCountText}>📷 {imageList.length}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>✕</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        
        {/* HEADER SECTION */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.title} numberOfLines={2}>{property.name}</Text>
            <Text style={styles.location}>📍 {property.location}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
            <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
            <Text style={[styles.statusPillText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <Text style={styles.price}>TZS {Number(property.price).toLocaleString()}</Text>
        <View style={styles.divider} />

        {/* CTA SECTION - LOGICALLY CONTROLLED */}
        {status === "available" && (
          <View>
            {!myBooking ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={openBookModal}>
                <Text style={styles.primaryBtnText}>📅  Schedule a Visit</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={styles.bookedCard}>
                  <View style={styles.bookedCardIcon}><Text style={{ fontSize: 22 }}>✅</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookedCardTitle}>Visit Scheduled</Text>
                    <Text style={styles.bookedCardSub}>{myBooking.visit_date} · {myBooking.user_name}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.successBtn} onPress={handleTakeProperty}>
                  <Text style={styles.successBtnText}>🏠  Finalize & Take Property</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {status !== "available" && (
          <View style={[styles.noticeCard, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
            <Text style={[styles.noticeText, { color: statusCfg.color }]}>
              {status === "booked" ? "🔖 Currently reserved." : "🚫 This property is taken."}
            </Text>
          </View>
        )}

        {/* UPCOMING VISITS LIST */}
        <Text style={styles.sectionTitle}>Upcoming Visits</Text>
        {loadingBookings ? (
          <ActivityIndicator color={C.accent} />
        ) : bookings.length > 0 ? (
          bookings.map((b, i) => (
            <View key={i} style={styles.visitRow}>
              <View style={styles.visitDateBox}>
                <Text style={styles.visitDateDay}>{new Date(b.visit_date).getDate()}</Text>
                <Text style={styles.visitDateMon}>{new Date(b.visit_date).toLocaleString('en-GB', { month: 'short' })}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.visitName}>{b.user_name}</Text>
                <Text style={styles.visitPhone}>{b.user_phone}</Text>
              </View>
              {b.user_phone === userPhone && (
                <View style={styles.myBadge}><Text style={styles.myBadgeText}>You</Text></View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No visits scheduled yet.</Text>
        )}
      </ScrollView>

      {/* BOOKING MODAL (CUSTOM SHEET) */}
      <Modal visible={showBookModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowBookModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{bookStep === "details" ? "Your Details" : "Pick a Visit Date"}</Text>
            
            {bookStep === "details" ? (
              <View>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput style={styles.input} placeholder="e.g. Austine" value={userName} onChangeText={setUserName} />
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput style={styles.input} placeholder="0712 XXX XXX" keyboardType="phone-pad" value={userPhone} onChangeText={setUserPhone} />
                <TouchableOpacity style={styles.sheetPrimaryBtn} onPress={proceedToDate}>
                  <Text style={styles.sheetPrimaryBtnText}>Continue →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TouchableOpacity style={styles.dateSelectorBtn} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.dateSelectorText}>{selectedDate ? formatDate(selectedDate) : "Select Date"}</Text>
                </TouchableOpacity>
                {(Platform.OS === "ios" || showDatePicker) && (
                  <DateTimePicker value={selectedDate || new Date()} mode="date" minimumDate={new Date()} display={Platform.OS === "ios" ? "inline" : "default"} onChange={onDateChange} />
                )}
                <View style={styles.sheetRowBtns}>
                  <TouchableOpacity style={styles.sheetSecondaryBtn} onPress={() => setBookStep("details")}>
                    <Text>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sheetPrimaryBtn, { flex: 1, marginLeft: 10 }]} onPress={confirmBooking} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.sheetPrimaryBtnText}>Confirm Visit ✓</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={{ height: 40 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgBase },
  sliderWrap: { height: 320, backgroundColor: C.bgElevated },
  sliderImage: { width, height: 320 },
  sliderPlaceholder: { alignItems: "center", justifyContent: "center" },
  sliderPlaceholderIcon: { fontSize: 60, opacity: 0.2 },
  photoCount: { position: "absolute", bottom: 12, right: 14, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
  photoCountText: { color: "#fff", fontSize: F.xs, fontWeight: "600" },
  backBtn: { position: "absolute", top: 52, left: 18, zIndex: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  backBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  title: { fontSize: F.xxl, fontWeight: "800", color: C.textPrimary },
  location: { fontSize: F.sm, color: C.textSecondary, marginTop: 4 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: F.xs, fontWeight: "700" },
  price: { fontSize: F.xl, fontWeight: "800", color: C.accent, marginBottom: 4 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 18 },
  primaryBtn: { backgroundColor: C.accent, paddingVertical: 15, borderRadius: R.lg, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: F.md },
  successBtn: { backgroundColor: C.success, paddingVertical: 15, borderRadius: R.lg, alignItems: "center" },
  successBtnText: { color: "#fff", fontWeight: "700", fontSize: F.md },
  bookedCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.successBg, borderWidth: 1, borderColor: C.successBorder, borderRadius: R.lg, padding: 14, marginBottom: 12 },
  bookedCardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  bookedCardTitle: { fontSize: F.base, fontWeight: "700", color: C.success },
  bookedCardSub: { fontSize: F.sm, color: C.textSecondary },
  noticeCard: { borderWidth: 1, borderRadius: R.lg, padding: 14, alignItems: "center" },
  noticeText: { fontSize: F.base, fontWeight: "600" },
  sectionTitle: { fontSize: F.lg, fontWeight: "700", color: C.textPrimary, marginTop: 25, marginBottom: 12 },
  visitRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.bgCard, borderRadius: R.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  visitDateBox: { width: 44, height: 44, borderRadius: R.sm, backgroundColor: C.accentMuted, alignItems: "center", justifyContent: "center" },
  visitDateDay: { fontSize: F.md, fontWeight: "800", color: C.accent },
  visitDateMon: { fontSize: F.xs, color: C.accent, textTransform: "uppercase" },
  visitName: { fontSize: F.base, fontWeight: "700" },
  visitPhone: { fontSize: F.sm, color: C.textSecondary },
  myBadge: { backgroundColor: C.accentMuted, paddingHorizontal: 8, borderRadius: R.pill },
  myBadgeText: { fontSize: 10, color: C.accent, fontWeight: "bold" },
  emptyText: { color: C.textMuted, fontStyle: "italic" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: F.xl, fontWeight: "800", marginBottom: 20 },
  fieldLabel: { fontSize: F.xs, fontWeight: "700", color: C.textSecondary, marginBottom: 6, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, padding: 12, marginBottom: 15, backgroundColor: C.bgBase },
  dateSelectorBtn: { borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md, padding: 15, backgroundColor: C.bgBase, marginBottom: 15 },
  dateSelectorText: { fontWeight: "600" },
  sheetPrimaryBtn: { backgroundColor: C.accent, padding: 15, borderRadius: R.lg, alignItems: "center" },
  sheetPrimaryBtnText: { color: "#fff", fontWeight: "bold" },
  sheetRowBtns: { flexDirection: "row", gap: 10 },
  sheetSecondaryBtn: { padding: 15, borderRadius: R.lg, borderWidth: 1, borderColor: C.borderStrong, justifyContent: "center" }
});