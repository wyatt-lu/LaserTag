import React, { useState } from "react";
import { SafeAreaView, View, StyleSheet, TextStyle } from "react-native";
import { globalStyles } from "@/constants/styles";
import AppText from "@/components/AppText";
import { get, ref, set, onDisconnect, update } from "firebase/database";
import { auth, database } from "../../firebaseconfig";
import ReusableButton from "@/components/ReusableButton";

export default function EquipmentScreen() {
  const [userLaserType, setUserLaserType] = useState<any>();

  /*const laserRef = ref(database, `lasers/Default`);

  const createLasers = async ()=>{
    if (!auth.currentUser) return;
    await set(laserRef, {
      length: 2,
      width: 1,
    });
  }
  createLasers();*/

  const getLaser = async () => {
    if (!auth.currentUser) return;
    const laserRef = ref(database, `players/${auth.currentUser.uid}/laser`);
    const laserData = await get(laserRef);
    setUserLaserType(laserData.val());
  };
  getLaser();

  const changeLaser = async (newLaser: string) => {
    if (!auth.currentUser) return;

    const laserRef = ref(database, `players/${auth.currentUser.uid}`);

    try {
      await update(laserRef, { laser: newLaser });
    } catch (error) {
      console.error("Error updating laser:", error);
    }
    setUserLaserType(newLaser);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.buttons}>
        <AppText style={styles.text}>Current Laser: {userLaserType}</AppText>

        <ReusableButton
          theme="laser"
          label="Default"
          onPress={() => {
            changeLaser("Default");
          }}
        />
        <ReusableButton
          theme="laser"
          label="2x Width"
          onPress={() => {
            changeLaser("2xWidth");
          }}
        />
        <ReusableButton
          theme="laser"
          label="2x Length"
          onPress={() => {
            changeLaser("2xLength");
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#faf6ea",
    flex: 1,
    justifyContent: "center",
  },
  buttons: {
    alignItems: "center",
  },
  text: {
    marginBottom: 20,
    fontSize: 20,
  },
});
