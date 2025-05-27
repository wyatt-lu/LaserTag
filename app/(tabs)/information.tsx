import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StatusBar,
  View,
  StyleSheet,
  Text,
} from "react-native";
import { globalStyles } from "@/constants/styles";
import AppText from "@/components/AppText";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BootsIcon, CactusIcon, HatIcon } from "@/constants/icons";

export default function InformationScreen() {
  return (
    <SafeAreaProvider>
      <StatusBar hidden={true} />
      <SafeAreaView style={styles.mainContainer}>
        <View style={styles.textContainer}>
          <AppText style={{ fontSize: 20, color: "#b81157", marginBottom: 20 }}>
            How to play{" "}
            <Text style={{ fontSize: 25, color: "#68dbcc" }}>[NAME]</Text>
          </AppText>
          <AppText style={styles.paragraph}>
            First, select a host to{" "}
            <Text style={{ color: "#000" }}>create a room</Text>.
          </AppText>
          <AppText style={styles.paragraph}>
            The host will be in charge of assigning teams, adjusting game
            settings, and starting the game.
          </AppText>
          <AppText style={styles.paragraph}>
            Additional players join the room through the room's{" "}
            <Text style={{ color: "#88cb54" }}>room code</Text>.
          </AppText>
          <AppText style={styles.paragraph}>
            <Text style={{ color: "#ffe08b" }}>Start</Text> the game and run to
            your starting locations!
          </AppText>
          <View style={styles.divider} />
          <AppText style={[styles.paragraph, { fontSize: 18 }]}>
            How do PowerUps work?
          </AppText>
          <AppText style={styles.paragraph}>
            <HatIcon width={30} height={30} />
            {""}
            <Text style={{ color: "#b81157" }}>Cowboy Hat</Text> grants
            invisibility, concealing the user for{" "}
            <Text style={{ color: "#894646" }}>10 seconds</Text>.
          </AppText>
          <AppText style={styles.paragraph}>
            <BootsIcon width={30} height={30} />
            <Text style={{ fontWeight: "bold", color: "#b81157" }}>
              {" "}
              Cowboy Boots
            </Text>{" "}
            creates a doppelganger for{" "}
            <Text style={{ color: "#894646" }}>10 seconds</Text>!
          </AppText>
          <AppText style={styles.paragraph}>
            <CactusIcon width={30} height={30} />
            <Text style={{ color: "#b81157" }}>Cactus</Text> acts as a{" "}
            <Text style={{ color: "#894646" }}>landmine</Text> eliminating
            players it contacts.
          </AppText>
          <View style={styles.divider} />
          <AppText
            style={[styles.paragraph, { fontSize: 18, color: "#8baaff" }]}
          >
            Have fun, and happy hunting!
          </AppText>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: "#faf6ea",
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    margin: 16,
  },
  paragraph: {
    marginBottom: 10,
  },
  divider: {
    height: 3,
    width: "100%",
    backgroundColor: "#ccc",
    marginVertical: 10,
  },
});
