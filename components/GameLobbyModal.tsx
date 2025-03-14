import { auth, database } from "@/firebaseconfig";
import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native";
import ReusableButton from "./ReusableButton";
import { onValue, ref, update } from "firebase/database";
import { globalStyles } from "@/constants/styles";
import { IconSymbol } from "./ui/IconSymbol";
import AppText from "./AppText";
import * as Clipboard from "expo-clipboard";
import { RopeIcon } from "@/constants/icons";
import SliderComponent from "@react-native-community/slider";

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
  const [playerTeams, setPlayerTeams] = useState<{ [key: string]: number }>({});
  const [numTeams, setNumTeams] = useState(2);

  useEffect(() => {
    if (roomCode) {
      const roomRef = ref(database, `rooms/${roomCode}`);

      const unsubscribe = onValue(
        roomRef,
        (snapshot) => {
          const roomData = snapshot.val();
          setRoomInfo(roomData);

          if (!roomData) return;

          const initialTeams: { [key: string]: number } = {};
          Object.keys(roomData.players).forEach((player: any) => {
            initialTeams[player] = roomData.players[player].team || 1;
          });
          setPlayerTeams(initialTeams);

          const maxTeams = Math.floor(Object.keys(roomData.players).length / 2);
          setNumTeams(maxTeams > 1 ? maxTeams : 2);
        },
        (error) => {
          console.error("Error fetching room data:", error);
        }
      );

      return () => unsubscribe();
    }
  }, [roomCode]);

  if (!roomInfo) {
    return null;
  }

  const handleTeams = (uid: string) => {
    if (roomInfo.roomType === "solo") return;

    const currentTeam = playerTeams[uid];
    let newTeam = (currentTeam % numTeams) + 1;
    setPlayerTeams((prev) => ({
      ...prev,
      [uid]: newTeam,
    }));

    const playerRef = ref(database, `rooms/${roomCode}/players/${uid}`);
    update(playerRef, {
      team: newTeam,
    }).catch((error) => {
      console.error("Error updating player team:", error);
    });
  };

  const handleNumTeamsChange = (value: number) => {
    setNumTeams(value);
    const roomRef = ref(database, `rooms/${roomCode}`);
    update(roomRef, {
      numTeams: value,
    }).catch((error) => {
      console.error("Error updating number of teams:", error);
    });
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={globalStyles.container}>
        <View style={styles.topContainer}>
          <TouchableOpacity onPress={closeLobby}>
            <IconSymbol name="x.circle.fill" size={60} color={"#3a160e"} />
          </TouchableOpacity>
          <AppText>Room Code: </AppText>
          <TouchableOpacity
            onPress={async () => {
              if (roomCode) {
                await Clipboard.setStringAsync(roomCode);
                Alert.alert("Room code copied to clipboard.");
              }
            }}
          >
            <AppText style={styles.code}>{roomCode}</AppText>
          </TouchableOpacity>
        </View>
        <RopeIcon style={styles.rope} width={"100%"} />
        <View style={styles.middleContainer}>
          {auth.currentUser?.uid === roomInfo.host &&
            roomInfo.roomType !== "solo" && (
              <View style={styles.sliderContainer}>
                <AppText>Select Number of Teams:</AppText>
                <SliderComponent
                  style={{ width: 200, height: 40 }}
                  minimumValue={2}
                  maximumValue={Math.floor(
                    Object.keys(roomInfo.players).length / 2
                  )}
                  step={1}
                  value={numTeams}
                  onValueChange={handleNumTeamsChange}
                />
                <AppText>Number of Teams: {numTeams}</AppText>
              </View>
            )}
          {Object.keys(roomInfo.players)
            .sort((a: any, b: any) => {
              if (a === roomInfo.host) return -1;
              if (b === roomInfo.host) return 1;
              return 0;
            })
            .map((userId) => {
              const player = roomInfo.players[userId];
              const teamColor =
                playerTeams[userId] === 1 ? "#FFD700" : "#8BAAFF";
              return (
                <View key={userId} style={{ flexDirection: "row" }}>
                  <Pressable
                    style={[
                      styles.playerContainer,
                      { backgroundColor: teamColor },
                    ]}
                    onPress={
                      auth.currentUser?.uid === roomInfo.host
                        ? () => handleTeams(userId)
                        : undefined
                    }
                  >
                    <AppText>{player.username}</AppText>
                    <AppText style={{ marginLeft: 10 }}>
                      [Team {playerTeams[userId]}]
                    </AppText>
                  </Pressable>
                </View>
              );
            })}
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
    paddingHorizontal: 20,
  },
  middleContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 100,
  },
  bottomContainer: {
    bottom: 50,
    position: "absolute",
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  code: {
    right: "30%",
    color: "#32CD32",
    textDecorationLine: "underline",
  },
  rope: {
    top: "15%",
    position: "absolute",
  },
  playerContainer: {
    width: "75%",
    borderRadius: 15,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    flexDirection: "row",
  },
  sliderContainer: {
    width: "80%",
    marginBottom: 20,
    alignItems: "center",
  },
});
