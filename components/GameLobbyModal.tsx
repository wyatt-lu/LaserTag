import { auth, database } from "@/firebaseconfig";
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import ReusableButton from "./ReusableButton";
import { get, onValue, ref } from "firebase/database";
import { globalStyles } from "@/constants/styles";
import { IconSymbol } from "./ui/IconSymbol";
import AppText from "./AppText";
import * as Clipboard from "expo-clipboard";
import { RopeIcon } from "@/constants/icons";

type Props = {
  visible: boolean;
  roomCode: string | null;
  enterGame: () => void;
  closeLobby: () => void;
};

export default function GameLobbyModal({
  visible,
  roomCode,
  enterGame,
  closeLobby,
}: Props) {
  const [roomInfo, setRoomInfo] = useState<any>(null);

  useEffect(() => {
    if (roomCode) {
      const roomRef = ref(database, `rooms/${roomCode}`);

      const unsubscribe = onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        setRoomInfo(roomData);
      });

      return () => unsubscribe();
    }
  }, [roomCode]);

  if (!roomInfo) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={globalStyles.container}>
        <View style={styles.topContainer}>
          <TouchableOpacity onPress={closeLobby}>
            <IconSymbol name="x.circle.fill" size={60} color={"#3a160e"} />
          </TouchableOpacity>
          <AppText>Room Code: </AppText>
          <TouchableOpacity
            onPress={() => {
              if (roomCode) {
                Clipboard.setStringAsync(roomCode);
              }
              Alert.alert("Copied.");
            }}
          >
            <AppText style={styles.code}>{roomCode}</AppText>
          </TouchableOpacity>
        </View>
        <RopeIcon style={styles.rope} width={"100%"} />
        <View style={styles.middleContainer}>
          {Object.values(roomInfo.players)
            .sort((a: any, b: any) => {
              if (a.uid === roomInfo.host) return -1;
              if (b.uid === roomInfo.host) return 1;
              return 0;
            })
            .map((player: any) => (
              <View key={player.username} style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  style={[
                    styles.playerContainer,
                    player.uid === roomInfo.host && styles.hostPlayer,
                  ]}
                >
                  <AppText>{player.username}</AppText>
                </TouchableOpacity>
              </View>
            ))}
        </View>

        <View style={styles.bottomContainer}>
          <ReusableButton
            label={
              auth.currentUser?.uid === roomInfo.host
                ? "Start Game"
                : "Waiting for host to start..."
            }
            onPress={
              auth.currentUser?.uid === roomInfo.host ? enterGame : () => {}
            }
            buttonStyle={
              auth.currentUser?.uid === roomInfo.host
                ? {}
                : { backgroundColor: "#968e84" }
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topContainer: {
    top: 50,
    width: "100%",
    height: 75,
    justifyContent: "space-evenly",
    alignItems: "center",
    position: "absolute",
    flexDirection: "row",
  },
  middleContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  bottomContainer: {
    bottom: 50,
    position: "absolute",
    width: "100%",
    alignItems: "center",
  },
  code: {
    right: "30%",
    color: "#0EE",
    textDecorationLine: "underline",
  },
  rope: {
    top: "15%",
    position: "absolute",
  },
  playerContainer: {
    width: "75%",
    backgroundColor: "#ac7148",
    borderRadius: 15,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  hostPlayer: {
    backgroundColor: "#824a32",
  },
});
