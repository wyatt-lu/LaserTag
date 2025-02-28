import { auth, database } from "@/firebaseconfig";
import { router } from "expo-router";
import { globalStyles } from "@/constants/styles";
import AppText from "@/components/AppText";
import React, { useState } from "react";
import { useEffect } from "react";
import {
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  View,
  Alert,
  Image,
  Modal,
} from "react-native";
import {
  ref,
  get,
  set,
  update,
  onValue,
  onDisconnect,
} from "firebase/database";
import { SignIcon } from "@/constants/icons";
import InputModal from "../../components/InputModal";
import ReusableButton from "@/components/ReusableButton";
import ImageViewer from "@/components/ImageViewer";
import {
  getStorage,
  ref as ref_storage,
  getDownloadURL,
  uploadBytes,
} from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { IconSymbol } from "@/components/ui/IconSymbol";

export default function HomeScreen() {
  const [show, setShow] = useState<boolean>(false); // show room lobby
  const [roomInfo, setRoomInfo] = useState<any>(null); // room information shown in room lobby
  const [loading, setLoading] = useState<boolean>(false); // loading screen state
  const [code, setCode] = useState<string>("");
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);

  const openModal = () => setIsModalVisible(true);
  const closeModal = () => setIsModalVisible(false);

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const openSettings = () => setIsSettingsVisible(true);
  const closeSettings = () => setIsSettingsVisible(false);

  useEffect(() => {
    if (!roomCode) return;

    const roomRef = ref(database, `rooms/${roomCode}`);
    const startRef = ref(database, `rooms/${roomCode}/gameStarted`);

    const unsubscribeRoom = onValue(roomRef, (roomSnapshot) => {
      if (!roomSnapshot.exists()) {
        Alert.alert("Room Deleted", "Please join again.");
        setRoomInfo(null);
        setShow(false);
        setRoomCode(null);
      } else {
        if (!roomSnapshot.val().gameStarted) {
          const room = roomSnapshot.val();
          const hostRef = ref(database, `players/${room.host}`);

          get(hostRef).then((hostSnapshot) => {
            if (hostSnapshot.exists()) {
              setRoomInfo({
                roomCode,
                host: hostSnapshot.val().username,
                players: room.players,
              });
            }
          });
        }
      }
    });

    const unsubscribeStart = onValue(startRef, (startSnapshot) => {
      setRoomInfo(null);
      setShow(false);
      if (startSnapshot.exists() && startSnapshot.val()) {
        router.replace("/(tabs)/gameplay");
      }
    });

    return () => {
      unsubscribeRoom();
      unsubscribeStart();
    };
  }, [roomCode]);

  const createRoom = async () => {
    if (!auth.currentUser) return;

    setLoading(true);

    try {
      const generateRoomCode = () => {
        const letters = "0123456789";
        return Array.from(
          { length: 6 },
          () => letters[Math.floor(Math.random() * letters.length)]
        ).join("");
      };

      const newRoomCode = generateRoomCode();
      setRoomCode(newRoomCode);
      setShow(true);

      const roomRef = ref(database, `rooms/${newRoomCode}`);
      const playerRef = ref(database, `players/${auth.currentUser.uid}`);

      await set(roomRef, {
        host: auth.currentUser.uid,
        gameStarted: false,
        players: {
          [auth.currentUser.uid]: {
            username: auth.currentUser.displayName,
            score: 0,
            latitude: null,
            longitude: null,
            direction: null,
            eliminated: false,
          },
        },
      });

      await update(playerRef, { room: newRoomCode });

      const playerInRoomRef = ref(
        database,
        `rooms/${newRoomCode}/players/${auth.currentUser.uid}`
      );

      onDisconnect(roomRef).remove();
      onDisconnect(playerRef).update({ room: null });

      setRoomInfo({
        roomCode: newRoomCode,
        host: auth.currentUser.displayName,
        players: {
          [auth.currentUser.uid]: {
            username: auth.currentUser.displayName,
          },
        },
      });
    } catch (error) {
      console.error("Error creating room: ", error);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (roomCode: string) => {
    closeModal();
    if (!auth.currentUser) return;
    if (roomCode.length !== 6) {
      Alert.alert("Too short. Room code must be 6 characters");
      return;
    }

    setLoading(true);

    const roomRef = ref(database, `rooms/${roomCode}`);
    const roomSnapshot = await get(roomRef);

    if (!roomSnapshot.exists()) {
      Alert.alert("Room not found");
      setLoading(false);
      return;
    }

    const gameStartedRef = ref(database, `rooms/${roomCode}/gameStarted`);
    const gameStartedSnapshot = await get(gameStartedRef);
    const gameStarted = gameStartedSnapshot.val();

    if (roomSnapshot.val().host === auth.currentUser.uid) {
      if (gameStarted) {
        router.replace("/(tabs)/gameplay");
        setLoading(false);
      } else {
        setRoomInfo({
          roomCode,
          host: auth.currentUser.displayName,
          players: roomSnapshot.val().players,
        });
        setShow(true);
        setLoading(false);
      }
      return;
    }

    const room = roomSnapshot.val();
    if (room.players && room.players[auth.currentUser.uid]) {
      if (gameStarted) {
        router.replace("/(tabs)/gameplay");
      } else {
        setRoomInfo({
          roomCode,
          host: auth.currentUser.displayName,
          players: roomSnapshot.val().players,
        });
        setShow(true);
        setLoading(false);
      }
    }

    if (Object.keys(roomSnapshot.val().players).length >= 4) {
      Alert.alert("Room is full");
      setLoading(false);
      return;
    }

    try {
      await update(ref(database, `rooms/${roomCode}/players`), {
        [auth.currentUser.uid]: {
          username: auth.currentUser.displayName,
          score: 0,
        },
      });

      await update(ref(database, `players/${auth.currentUser.uid}`), {
        room: roomCode,
      });

      const playerRef = ref(database, `players/${auth.currentUser.uid}`);
      const playerInRoomRef = ref(
        database,
        `rooms/${roomCode}/players/${auth.currentUser.uid}`
      );
      onDisconnect(playerInRoomRef).remove();
      onDisconnect(playerRef).update({ room: null });

      const hostRef = ref(database, `players/${room.host}`);
      const hostSnapshot = await get(hostRef);
      let hostUsername = "Unknown Host";
      if (hostSnapshot.exists()) {
        hostUsername = hostSnapshot.val().username;
      }

      setRoomInfo({
        roomCode,
        host: hostUsername,
        players: {
          ...room.players,
          [auth.currentUser.uid]: {
            username: auth.currentUser.displayName,
          },
        },
      });

      setRoomCode(roomCode);
      setShow(true);
    } catch (error) {
      console.error("Error joining room: ", error);
    } finally {
      setLoading(false);
    }
  };

  const enterGame = async () => {
    if (!roomInfo || !roomCode) return;

    const roomRef = ref(database, `rooms/${roomCode}`);
    await update(roomRef, { gameStarted: true });
  };

  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);

      if (auth.currentUser !== null) {
        const currentUid = auth.currentUser.uid;
        const currentUserRef = ref_storage(storage, `${currentUid}/pfp.jpg`);

        const image = await fetch(result.assets[0].uri);
        const imageBlob = await image.blob();
        await uploadBytes(currentUserRef, imageBlob);
      }
    } else {
      alert("Nothing changed");
    }
  };

  const storage = getStorage();
  const fetchImageURL = async () => {
    try {
      if (auth.currentUser !== null) {
        const currentUid = auth.currentUser.uid;
        const placeholderRef = ref_storage(storage, `${currentUid}/pfp.jpg`);
        const url = await getDownloadURL(placeholderRef);
        return url;
      }
    } catch (error) {
      console.error("Error fetching image URL:", error);
    }
  };
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    async function loadImage() {
      const url = await fetchImageURL();
      setImageUrl(url);
    }
    loadImage();
  }, [isSettingsVisible]);

  const handleSettings = () => {
    openSettings();
  };

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={[settingsStyles.topContainer, { position: "absolute" }]}>
        <TouchableOpacity onPress={handleSettings}>
          <Image
            source={{ uri: imageUrl }}
            style={settingsStyles.profileIcon}
          />
        </TouchableOpacity>
      </View>

      <Modal visible={isSettingsVisible} animationType="fade">
        <View style={settingsStyles.container}>
          <TouchableOpacity
            style={settingsStyles.topContainer}
            onPress={closeSettings}
          >
            <IconSymbol
              name="x.circle.fill"
              size={60}
              color={"#3a160e"}
              style={settingsStyles.closeButton}
            />
          </TouchableOpacity>
          <View style={settingsStyles.profileHolder}>
            {imageUrl ? (
              <ImageViewer
                source={{ uri: imageUrl }}
                selectedImage={selectedImage}
              />
            ) : (
              <AppText style={styles.loadingText}>Loading image...</AppText>
            )}
          </View>

          <ReusableButton
            label="Choose Profile"
            theme="pfp"
            onPress={pickImage}
          />
        </View>
      </Modal>

      {loading ? (
        <AppText style={styles.loadingText}>Loading...</AppText>
      ) : roomInfo ? (
        <View style={styles.defaultContainer}>
          <View style={styles.roomCodeContainer}>
            <Text style={styles.roomCodeLabel}>Room Code: </Text>
            <Text style={styles.roomCodeValue}>{roomInfo.roomCode}</Text>
          </View>
          <View>
            <View style={styles.playersRow}>
              {Object.values(roomInfo.players)
                .sort((a: any, b: any) => {
                  if (a.username === roomInfo.host) return -1;
                  if (b.username === roomInfo.host) return 1;
                  return 0;
                })
                .map((player: any) => (
                  <View key={player.username} style={{ flexDirection: "row" }}>
                    <View
                      style={[
                        styles.playerContainer,
                        player.username === roomInfo.host && styles.hostPlayer,
                      ]}
                    >
                      <Text style={styles.playerName}>{player.username}</Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.enterButton,
              { backgroundColor: "#e84a5f", marginTop: 20 },
              auth.currentUser?.displayName === roomInfo.host
                ? {}
                : styles.disabledButton,
            ]}
            onPress={
              auth.currentUser?.displayName === roomInfo.host
                ? enterGame
                : () => {}
            }
            disabled={auth.currentUser?.displayName !== roomInfo.host}
          >
            <Text style={styles.buttonText}>
              {auth.currentUser?.displayName === roomInfo.host
                ? "Start Game"
                : "Waiting for host to start..."}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.enterButton}>
            <Text
              style={styles.buttonText}
              onPress={() => {
                setRoomInfo(null);
              }}
            >
              Leave Room
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        !show && (
          <View style={styles.joinContainer}>
            <AppText style={{ bottom: 75 }}>Adventure is waiting...</AppText>

            <SignIcon />

            <ReusableButton label="Create a Room" onPress={createRoom} />
            <ReusableButton
              label="Join a Room"
              onPress={openModal}
              buttonStyle={{ backgroundColor: "transparent", marginTop: -20 }}
              buttonTextStyle={{ color: "#824a32" }}
            />

            <InputModal
              visible={isModalVisible}
              title="Join Room"
              placeholder="Enter Code"
              onClose={closeModal}
              onConfirm={joinRoom}
              confirmText="Enter"
              closeText="Cancel"
              inputType="numeric"
            />
          </View>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  joinContainer: {
    position: "absolute",
    bottom: 30,
    alignItems: "center",
    width: "100%",
  },
  defaultContainer: {
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    padding: 20,
    borderRadius: 20,
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  neonText: {
    fontSize: 110,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "#FFFF00",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    marginBottom: 20,
    textDecorationLine: "underline",
    fontFamily: "Bungee",
  },
  buttonText: {
    fontSize: 18,
    color: "#fff",
    fontFamily: "Bungee",
  },
  roomCodeInput: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 10,
    fontWeight: "bold",
    textAlign: "center",
    borderRadius: 20,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#cccccc",
  },
  roomCodeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  roomCodeLabel: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    fontFamily: "Bungee",
  },
  roomCodeValue: {
    fontSize: 22,
    fontWeight: "normal",
    color: "#666",
    textDecorationLine: "underline",
    fontFamily: "Bungee",
  },
  enterButton: {
    backgroundColor: "#333333",
    padding: 10,
    borderRadius: 20,
    marginTop: 5,
    width: "100%",
    alignItems: "center",
  },
  playerContainer: {
    backgroundColor: "#333333",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    margin: 5,
    alignItems: "center",
    justifyContent: "center",
    height: 35,
    width: 100,
  },
  playersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  playerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  hostPlayer: {
    backgroundColor: "#b35f10",
    borderWidth: 2,
    borderColor: "#333",
  },
  disabledButton: {
    backgroundColor: "#ddd",
  },
});

const settingsStyles = StyleSheet.create({
  container: {
    height: "100%",
    alignItems: "center",
    backgroundColor: "#faf6ea",
  },
  topContainer: {
    top: 50,
    width: "100%",
    height: 75,
    justifyContent: "center",
    alignItems: "center",
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderColor: "#3a160e",
    borderRadius: 30,
    borderWidth: 2,
    left: "35%",
  },
  closeButton: { right: "35%" },
  profileHolder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#3a160e",
    marginTop: 75,
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: 25,
    overflow: "hidden",
  },
});
