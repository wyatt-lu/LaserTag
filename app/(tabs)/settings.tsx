import React, { useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  View,
} from "react-native";

import { Link, useRouter } from "expo-router";
import { ref, get, remove, update } from "firebase/database";
import { auth, database } from "../../firebaseconfig";
import { getAuth } from "firebase/auth";

export default function SettingsScreen() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = getAuth().onAuthStateChanged((user) => {
      if (!user) {
        router.replace("/");
        // router.replace('/_sitemap');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (auth.currentUser) {
      try {
        const playerRef = ref(database, `players/${auth.currentUser.uid}`);
        const playerSnapshot = await get(playerRef);

        if (playerSnapshot.exists()) {
          const playerData = playerSnapshot.val();

          await update(playerRef, { room: null });

          if (playerData.room !== null) {
            const roomRef = ref(database, `rooms/${playerData.room}`);
            const roomSnapshot = await get(roomRef);

            if (roomSnapshot.exists()) {
              const roomData = roomSnapshot.val();
              if (roomData.host === auth.currentUser.uid) {
                await remove(roomRef);
              } else {
                await remove(
                  ref(
                    database,
                    `rooms/${playerData.room}/players/${auth.currentUser.uid}`
                  )
                );
              }
            }
          }
        }

        await auth.signOut();
        router.replace("/");
      } catch (error) {
        console.error("Error signing out: ", error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.signout}>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.text}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#faf6ea",
  },
  signout: {
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 5,
  },
  text: {
    color: "#fff",
    fontFamily: "Bungee",
  },
});
