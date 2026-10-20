import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "./useAuth";

const tabs = [
  { path: "/tienda", label: "Tienda", icon: "storefront-outline", activeIcon: "storefront" },
  { path: "/catalogo", label: "Inicio", icon: "home-outline", activeIcon: "home" },
  { path: "/mis-citas", label: "Citas", icon: "calendar-outline", activeIcon: "calendar" },
  { path: "/configuracion", label: "Configuración", icon: "settings-outline", activeIcon: "settings" },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, cargando } = useAuth();
  const activeTab = tabs.find(tab => tab.path === pathname);

  if (cargando || !user || !activeTab) return null;

  return (
    <SafeAreaView edges={["bottom"]} pointerEvents="box-none" style={styles.safeArea}>
      <BlurView
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={75}
        style={styles.glass}
        tint="dark"
      >
        <View accessibilityRole="tablist" style={styles.bar}>
          {tabs.map(tab => {
            const active = tab.path === activeTab.path;
            return (
              <Pressable
                key={tab.path}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  if (!active) router.replace(tab.path);
                }}
                style={({ pressed }) => [styles.tab, active && styles.activeTab, pressed && styles.pressed]}
              >
                <Ionicons
                  color={active ? "#46d995" : "#aab4ad"}
                  name={active ? tab.activeIcon : tab.icon}
                  size={21}
                />
                <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    alignItems: "center",
    paddingBottom: 8,
  },
  glass: {
    width: "92%",
    maxWidth: 480,
    height: 70,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(220,239,226,0.16)",
    borderRadius: 36,
    backgroundColor: "rgba(23,29,25,0.9)",
    shadowColor: "#101a14",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  bar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 5,
    backgroundColor: "rgba(16,19,18,0.32)",
  },
  tab: { flex: 1, height: 54, alignItems: "center", justifyContent: "center", gap: 3, marginHorizontal: 2, borderRadius: 28 },
  activeTab: { backgroundColor: "rgba(32,199,122,0.16)" },
  label: { color: "#aab4ad", fontSize: 9, fontWeight: "500" },
  activeLabel: { color: "#46d995", fontWeight: "700" },
  pressed: { opacity: 0.64 },
});