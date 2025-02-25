import React from "react";
import { Tabs } from "expo-router";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { View, Text, StyleSheet } from "react-native";

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
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Bungee",
        },
      }}
    >
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <View style={styles.unfocused}>
                <IconSymbol
                  size={38}
                  name="line.3.horizontal.circle.fill"
                  color="#4b3b3b"
                />
              </View>
            ) : (
              <IconSymbol
                style={styles.unfocused}
                size={38}
                name="line.3.horizontal.circle"
                color={"#a2adba"}
              />
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
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              // <View style={[styles.circle, styles.focused]}>
              //   <IconSymbol size={32} name="house.fill" color="#faf6ea" />
              //   <Text style={styles.label}>Home</Text>
              // </View>
              <View
                style={[
                  styles.circle,
                  styles.focused,
                  { borderRadius: 30, width: 100, height: 50, marginTop: 12 },
                ]}
              >
                <IconSymbol size={38} name="house" color="#faf6ea" />
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
                <IconSymbol size={38} name="house.fill" color="#faf6ea" />
              </View>
            ),
          tabBarLabelStyle: {
            display: "none",
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) =>
            focused ? (
              <View style={styles.unfocused}>
                <IconSymbol
                  size={38}
                  name="person.circle.fill"
                  color="#4b3b3b"
                />
              </View>
            ) : (
              <IconSymbol
                style={styles.unfocused}
                size={38}
                name="person.circle"
                color={"#a2adba"}
              />
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
          tabBarIcon: ({ color }) => (
            <IconSymbol size={32} name="compass.drawing" color={color} />
          ),
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
    backgroundColor: "#4b3b3b",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#4b3b3b",
    flexDirection: "column",
  },
  focused: {
    backgroundColor: "#4b3b3b",
    borderColor: "#4b3b3b",
    borderWidth: 4,
  },
  label: {
    fontSize: 14,
    fontFamily: "Bungee",
    color: "#faf6ea",
    marginTop: 3,
    marginBottom: 5,
  },
  unfocused: {
    marginTop: 12,
  },
});
