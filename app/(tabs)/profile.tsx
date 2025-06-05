import React, { useEffect, useState } from "react";
import { SafeAreaView, View, StyleSheet, StatusBar } from "react-native";
import { globalStyles } from "@/constants/styles";
import AppText from "@/components/AppText";
import { auth, database } from "@/firebaseconfig";
import { ref, get, onValue } from "firebase/database";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LassoIcon } from "@/constants/icons";

export default function ProfileScreen() {
  const [points, setPoints] = useState<number>();

  useEffect(() => {
    if (!auth.currentUser) return;
  
    const playerRef = ref(database, `players/${auth.currentUser.uid}`);
  
    const unsubscribe = onValue(playerRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const playerData = snapshot.val();
      setPoints(playerData.points);
    });
  
    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar hidden={true} />
      <SafeAreaView style={styles.container}>

        <AppText style={styles.points}>Points: {points}</AppText>

        <View style={styles.text}>
          <AppText>Choose your weapon!</AppText>
          <AppText>Sorry, you only have one choice... Lasso!!!</AppText>
          <LassoIcon width={30} height={30} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#faf6ea",
    flex: 1,
  },

  points: {
    position: "absolute",
    top: 54,
    left: 20,
    fontSize: 20,
    color: "#3a160e",
    fontWeight: "bold",
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  text: {
    marginLeft: 40,
    marginTop: 100,
    fontSize: 20,
  }
});
