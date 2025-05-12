import React from "react";
import { Tabs } from "expo-router";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { View, StyleSheet, Platform } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: "#4b3b3b",
        tabBarStyle: {
          backgroundColor: "#faf6ea",
          height: 100,
          borderColor: "#faf6ea",
          paddingBottom: Platform.OS === "android" ? 20 : 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Bungee-Regular",
        },
      }}
    >
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) =>
            focused ? (
              <View style={styles.unfocused}>
                {Platform.OS === "ios" ? (
                  <IconSymbol
                    size={38}
                    name="line.3.horizontal.circle.fill"
                    color="#3a160e"
                  />
                ) : (
                  <Icon name="settings" size={38} color="#3a160e" />
                )}
              </View>
            ) : (
              <View style={styles.unfocused}>
                {Platform.OS === "ios" ? (
                  <IconSymbol
                    size={38}
                    name="line.3.horizontal.circle"
                    color="#a2adba"
                  />
                ) : (
                  <Icon name="settings" size={38} color="#a2adba" />
                )}
              </View>
            ),
          tabBarLabelStyle: {
            display: "none",
          },
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) =>
            focused ? (
              <View
                style={[
                  styles.circle,
                  styles.focused,
                  { borderRadius: 30, width: 100, height: 50, marginTop: 12 },
                ]}
              >
                {Platform.OS === "ios" ? (
                  <IconSymbol size={38} name="house" color="#faf6ea" />
                ) : (
                  <Icon name="home" size={38} color="#faf6ea" />
                )}
              </View>
            ) : (
              <View
                style={[
                  styles.circle,
                  styles.focused,
                  {
                    borderRadius: 30,
                    width: 100,
                    height: 50,
                    marginTop: 12,
                  },
                ]}
              >
                {Platform.OS === "ios" ? (
                  <IconSymbol size={38} name="house.fill" color="#faf6ea" />
                ) : (
                  <Icon name="home" size={38} color="#faf6ea" />
                )}
              </View>
            ),
          tabBarLabelStyle: {
            display: "none",
          },
        }}
      />
      <Tabs.Screen
        name="equipment"
        options={{
          title: "Equipment",
          tabBarIcon: ({ focused }) =>
            focused ? (
              <View style={styles.unfocused}>
                {Platform.OS === "ios" ? (
                  <IconSymbol
                    size={38}
                    name="person.circle.fill"
                    color="#3a160e"
                  />
                ) : (
                  <Icon name="build" size={38} color="#3a160e" />
                )}
              </View>
            ) : (
              <View style={styles.unfocused}>
                {Platform.OS === "ios" ? (
                  <IconSymbol size={38} name="person.circle" color="#a2adba" />
                ) : (
                  <Icon name="build" size={38} color="#a2adba" />
                )}
              </View>
            ),
          tabBarLabelStyle: {
            display: "none",
          },
        }}
      />
      <Tabs.Screen
        name="gameplay"
        options={{
          title: "Gameplay",
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="gameplayOLD"
        options={{
          title: "GameplayOLD",
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 150,
    height: 80,
    borderRadius: 30,
    backgroundColor: "#3a160e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#3a160e",
    flexDirection: "column",
  },
  focused: {
    backgroundColor: "#3a160e",
    borderColor: "#3a160e",
    borderWidth: 4,
  },
  label: {
    fontSize: 14,
    fontFamily: "Bungee-Regular",
    color: "#faf6ea",
    marginTop: 3,
    marginBottom: 5,
  },
  unfocused: {
    marginTop: 12,
  },
});
