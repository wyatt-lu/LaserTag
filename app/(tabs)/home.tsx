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
import RoomSettingsModal from "@/components/RoomSettingsModal";
import GameLobbyModal from "@/components/GameLobbyModal";

export default function HomeScreen() {
  // HOME SCREEN //

  const [isLobbyVisible, setIsLobbyVisible] = useState(false);

  const openLobby = () => setIsLobbyVisible(true);
  const closeLobby = () => setIsLobbyVisible(false);

  const [roomCode, setRoomCode] = useState<string | null>(null);

  const [isCodeInputVisible, setIsCodeInputVisible] = useState(false);

  const openInput = () => setIsCodeInputVisible(true);
  const closeInput = () => setIsCodeInputVisible(false);

  useEffect(() => {
    if (!roomCode) return;

    const roomRef = ref(database, `rooms/${roomCode}`);
    const startRef = ref(database, `rooms/${roomCode}/gameStarted`);

    const unsubscribeRoom = onValue(roomRef, (roomSnapshot) => {
      if (!roomSnapshot.exists()) {
        Alert.alert("Room Deleted", "Please join again.");
        closeLobby();
        setRoomCode(null);
      }
    });

    const unsubscribeStart = onValue(startRef, (startSnapshot) => {
      if (startSnapshot.exists() && startSnapshot.val()) {
        router.replace("/(tabs)/gameplay");
        closeLobby();
      }
    });

    return () => {
      unsubscribeRoom();
      unsubscribeStart();
    };
  }, [roomCode]);

  const createRoom = async (roomType: string) => {
    if (!auth.currentUser) return;
    closeRoomSettings();

    const generateRoomCode = () => {
      const letters = "0123456789";
      return Array.from(
        { length: 6 },
        () => letters[Math.floor(Math.random() * letters.length)]
      ).join("");
    };

    const newRoomCode = generateRoomCode();
    setRoomCode(newRoomCode);

    const roomRef = ref(database, `rooms/${newRoomCode}`);
    const playerRef = ref(database, `players/${auth.currentUser.uid}`);

    await set(roomRef, {
      host: auth.currentUser.uid,
      gameStarted: false,
      roomType,
      players: {
        [auth.currentUser.uid]: {
          username: auth.currentUser.displayName,
        },
      },
    });

    await update(playerRef, { room: newRoomCode });

    onDisconnect(roomRef).remove();
    onDisconnect(playerRef).update({ room: null });

    openLobby();
  };

  const joinRoom = async (roomCode: string) => {
    closeInput();
    if (!auth.currentUser) return;
    if (roomCode.length !== 6) {
      Alert.alert("Too short. Room code must be 6 characters");
      return;
    }

    const roomRef = ref(database, `rooms/${roomCode}`);
    const roomSnapshot = await get(roomRef);
    const roomData = roomSnapshot.val();

    if (!roomSnapshot.exists()) {
      Alert.alert("Room not found");
      return;
    }

    const gameStartedRef = ref(database, `rooms/${roomCode}/gameStarted`);
    const gameStartedSnapshot = await get(gameStartedRef);
    const gameStarted = gameStartedSnapshot.val();

    if (roomData.host === auth.currentUser.uid) {
      if (gameStarted) {
        router.replace("/(tabs)/gameplay");
      } else {
        openLobby();
      }
      return;
    }

    if (roomData.players && roomData.players[auth.currentUser.uid]) {
      if (gameStarted) {
        router.replace("/(tabs)/gameplay");
      } else {
        openLobby();
      }
    }

    if (Object.keys(roomData.players).length >= 4) {
      Alert.alert("Room is full");
      return;
    }

    await update(ref(database, `rooms/${roomCode}/players`), {
      [auth.currentUser.uid]: {
        username: auth.currentUser.displayName,
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

    const hostRef = ref(database, `players/${roomData.host}`);
    const hostSnapshot = await get(hostRef);
    let hostUsername = "Unknown Host";
    if (hostSnapshot.exists()) {
      hostUsername = hostSnapshot.val().username;
    }

    setRoomCode(roomCode);
    setIsLobbyVisible(true);
  };

  // GAME LOBBY //

  const [isRoomSettingsVisible, setIsRoomSettingsVisible] = useState(false);

  const openRoomSettings = () => setIsRoomSettingsVisible(true);
  const closeRoomSettings = () => setIsRoomSettingsVisible(false);

  const enterGame = async () => {
    if (!roomCode) return;

    const roomRef = ref(database, `rooms/${roomCode}`);
    await update(roomRef, { gameStarted: true });
  };

  // SETTINGS PAGE //

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const openSettings = () => setIsSettingsVisible(true);
  const closeSettings = () => setIsSettingsVisible(false);

  const storage = getStorage();

  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

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

  useEffect(() => {
    async function loadImage() {
      const url = await fetchImageURL();
      setImageUrl(url);
    }
    loadImage();
  }, [isSettingsVisible]);

  return (
    <SafeAreaView style={globalStyles.container}>
      {/* // SETTINGS PAGE // */}
      <View style={[settingsStyles.topContainer, { position: "absolute" }]}>
        <TouchableOpacity onPress={openSettings}>
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

      {/* // GAME LOBBY // */}

      <GameLobbyModal
        visible={isLobbyVisible}
        roomCode={roomCode}
        enterGame={enterGame}
        closeLobby={closeLobby}
      />

      {/* // HOME SCREEN // */}
      <View style={styles.joinContainer}>
        <AppText style={{ bottom: 75 }}>Adventure is waiting...</AppText>

        <SignIcon />

        <ReusableButton label="Create a Room" onPress={openRoomSettings} />
        <ReusableButton
          label="Join a Room"
          onPress={openInput}
          buttonStyle={{ backgroundColor: "transparent", marginTop: -20 }}
          buttonTextStyle={{ color: "#824a32" }}
        />

        <InputModal
          visible={isCodeInputVisible}
          title="Join Room"
          placeholder="Enter Code"
          onClose={closeInput}
          onConfirm={joinRoom}
          confirmText="Enter"
          closeText="Cancel"
          inputType="numeric"
        />

        <RoomSettingsModal
          visible={isRoomSettingsVisible}
          solo={() => createRoom("solo")}
          team={() => createRoom("team")}
        />
      </View>
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
  loadingText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
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
