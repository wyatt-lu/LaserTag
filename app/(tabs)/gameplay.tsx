import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Button,
  GestureResponderEvent,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { Magnetometer } from "expo-sensors"; // https://docs.expo.dev/versions/latest/sdk/magnetometer/#setupdateintervalintervalms
import * as Location from "expo-location"; // https://docs.expo.dev/versions/latest/sdk/location/
import { get, getDatabase, onValue, ref, remove, set, update } from "firebase/database";
import { auth, database } from "../../firebaseconfig";
import { onAuthStateChanged } from "@firebase/auth";
import MapView, { Marker } from "react-native-maps";
import { globalStyles } from "@/constants/styles";
import React from "react";
import {
  getStorage,
  ref as ref_storage,
  getDownloadURL,
  uploadBytes,
} from "firebase/storage";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import AppText from "@/components/AppText";
import ReusableButton from "@/components/ReusableButton";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";

export default function PlayScreen() {
  const [location, setLocation] = useState<Location.LocationObject>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [magnetometerData, setMagnetometerData] = useState({
    x: 0,
    y: 0,
    z: 0,
  });
  Magnetometer.setUpdateInterval(1000);

  const magnetometerDataRef = useRef(magnetometerData);
  const magnetometerSubscriptionRef = useRef<any>(null);

  const storage = getStorage();

  const [playerURLArray, setPlayersURL] = useState<any>([]);
  const [playerLocationArray, setPlayersLocation] = useState<any>([]);


  useEffect(() => {
    magnetometerDataRef.current = magnetometerData;
  }, [magnetometerData]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    async function updateLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied.");
        return;
      }

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,  // The time interval to get updated location data
        distanceInterval: 0.001,  // The minimum distance (in meters) before updating the location
      },
      (newLocation) => {
        setLocation(newLocation);
        setMagnetometerData((prevData) => {
        const direction = degree(prevData.x, prevData.y);
        console.log(prevData.x, prevData.y, direction);
        updatePlayerLocation(newLocation.coords.latitude, newLocation.coords.longitude, direction);
        return prevData;
      });
    })
  };

    function getCurrentDirection() {
      if (magnetometerSubscriptionRef.current) {
        magnetometerSubscriptionRef.current?.remove();
      }

      magnetometerSubscriptionRef.current = Magnetometer.addListener((data) => {
        setMagnetometerData(data);
      });
    }

    updateLocation();
    getCurrentDirection();

    return () => {
      if (locationSubscription) locationSubscription.remove();
      if (magnetometerSubscriptionRef.current)
        magnetometerSubscriptionRef.current.remove();
    };
  }, []);

  useEffect (() => {
    const database = getDatabase();

    interface PlayerData {
      direction: number;
      latitude: number;
      longitude: number;
      username: string;
    }
    if (!auth.currentUser) return;

    //current user's ref
    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `players/${playerId}`);

    const fetchRoomRef = async () => {
      const playerInfo = await get(playerRef);

      if (!playerInfo.exists()) return;

      const playerData = playerInfo.val();
      const roomRef = ref(database, `rooms/${playerData.room}/players`);
        
      const unsubscribeRoom = onValue(roomRef, async (snapshotRoom) => {
        const roomData = snapshotRoom.val();

        //find the room
        if (roomData){
          const playersList = await Promise.all(Object.entries(roomData)
            .map(async ([key, userData]) => {
            const player = userData as PlayerData;

            return { id: key, latitude: player.latitude, longitude: player.longitude };
          }));
          setPlayersLocation(playersList);

        }
      })
      return unsubscribeRoom;
    }

    fetchRoomRef();
    return () => {
      fetchRoomRef().then((unsubscribe) => unsubscribe && unsubscribe());
    };
  }, []);

  const degree = (x: number, y: number): number => {
    // https://stackoverflow.com/questions/55034145/how-can-i-calculate-the-heading-n-w-s-e-given-x-y-z-magnetometer-and-acceler
    let degree = 0;
    if (Math.atan2(y, x) >= 0) {
      degree = Math.atan2(y, x) * (180 / Math.PI);
    } else {
      degree = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
    }
    degree = Math.round(degree - 90 >= 0 ? degree - 90 : degree + 271);
    return degree;
  };

  const cardinal = (degree: number) => {
    if (degree >= 22.5 && degree < 67.5) {
      return "NE";
    } else if (degree >= 67.5 && degree < 112.5) {
      return "E";
    } else if (degree >= 112.5 && degree < 157.5) {
      return "SE";
    } else if (degree >= 157.5 && degree < 202.5) {
      return "S";
    } else if (degree >= 202.5 && degree < 247.5) {
      return "SW";
    } else if (degree >= 247.5 && degree < 292.5) {
      return "W";
    } else if (degree >= 292.5 && degree < 337.5) {
      return "NW";
    } else {
      return "N";
    }
  };

  const updatePlayerLocation = async (
    latitude: number,
    longitude: number,
    direction: number
  ) => {
    if (!auth.currentUser) return;

    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `players/${playerId}`);

    try {
      const snapshot = await get(playerRef);

      if (snapshot.exists()) {
        const playerData = snapshot.val();
        const roomRef = ref(
          database,
          `rooms/${playerData.room}/players/${playerId}`
        );

        await update(roomRef, {
          latitude,
          longitude,
          direction,
        });
      }
    } catch (error) {
      console.log("Error updating player location:", error);
    }
  };

  const eliminatePlayer = async (username: string) => {
    const usernameRef = ref(database, `usernames/${username}/uid`);
    get(usernameRef).then((snapshot) => {
      if (snapshot.exists()) {
        const uid = snapshot.val();
        update(ref(database, `players/${uid}`), { eliminated: true });
      } else {
        console.log("Username not found!");
      }
    });
  };

  const fireLaser = async () => {
    if (!auth.currentUser) return;
    const playerId = auth.currentUser.uid;
    const playerRef = ref(database, `players/${playerId}`);
    const playerSnapshot = await get(playerRef);
    if (playerSnapshot.exists()) {
      const playerData = playerSnapshot.val();

    } 
  }

  const fetchUserURL = async (id: any) => {
    try {
        const placeholderRef = ref_storage(storage, `${id}/pfp.jpg`);
        const url = await getDownloadURL(placeholderRef);
        return url;
    } catch (error) {
      console.error("Error fetching image URL:", error);
    }
  };

  useEffect(() =>{
    const getPlayersURL = async ()=> {
      try {
        if (auth.currentUser) {
          //current user's URL
          const playerId = auth.currentUser.uid;
          const playerRef = ref(database, `players/${playerId}`);
          const playerInfo = await get(playerRef);

          if (playerInfo.exists()) {
            //find room info inside the player
            const playerData = playerInfo.val();
            const roomRef = ref(
              database,
              `rooms/${playerData.room}/players`
            );
            const roomInfo = await get(roomRef);
            if (roomInfo.exists()){
              const roomData = roomInfo.val();
              const playersList = await Promise.all(
                Object.entries(roomData)
                .map(async ([key]) => {
                  let userURL = await fetchUserURL(key);
                  return { id: key, profile: userURL };
                })
              );
              setPlayersURL(playersList);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching player data:", error);
      }
    };

    getPlayersURL();
  }, []);

  const mapRef = useRef<MapView | null>(null);

  const focusOnUserLocation = () => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.001222,
          longitudeDelta: 0.000821,
        },
        1000
      );
    }
  };

  const sheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ["18%", "28%", "75%"], []);

  const handleSnapPress = useCallback((index: any) => {
    sheetRef.current?.snapToIndex(index);
  }, []);
  const handleClosePress = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  const router = useRouter();

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.topButtonsContainer}>
        <View style={styles.topButtonsContainerRow}>
          <View
            style={[
              styles.button,
              { aspectRatio: 1, borderRadius: 30, padding: 10 },
            ]}
          >
            <TouchableOpacity onPress={() => handleSnapPress(2)}>
              <FontAwesome name="gear" size={26} style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
          <View style={styles.button}>
            <Text style={styles.buttonText}>
              {auth.currentUser?.displayName}
            </Text>
            <Text style={[styles.buttonText, { color: "#FFFFAA" }]}>
              {"  "}
              [TEAM 1]
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.topButtonsContainerRow,
            { justifyContent: "flex-end" },
          ]}
        >
          <View
            style={[
              styles.button,
              { aspectRatio: 1, borderRadius: 30, padding: 15 },
            ]}
          >
            <TouchableOpacity onPress={focusOnUserLocation}>
              <FontAwesome name="map" size={26} style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.001222,
            longitudeDelta: 0.000821,
          }}
          showsUserLocation={true}
        >
          
          <>
            {playerURLArray.map((player: { id: any; profile: any }) => {
              const playerLocation = playerLocationArray.find(
                (location: { id: any }) => location.id === player.id
              );

              return playerLocation ? (
                <Marker
                  style={styles.user}
                  key={player.id}
                  coordinate={{
                    latitude: playerLocation.latitude,
                    longitude: playerLocation.longitude,
                  }}
                  image={{ uri: player.profile }}
                />
              ) : <Text>Loading...</Text>;
            })}
          </>

        </MapView>
      ) : (
        <Text>Loading map...</Text>
      )}

      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
      >
        <BottomSheetView style={styles.contentContainer}>
          <ReusableButton label="Fire" onPress={fireLaser} />
          <AppText>
            Direction:{" "}
            {degree(
              magnetometerDataRef.current.x,
              magnetometerDataRef.current.y
            )}
            °{" "}
            {cardinal(
              degree(
                magnetometerDataRef.current.x,
                magnetometerDataRef.current.y
              )
            )}
          </AppText>
          <AppText>Latitude: {location?.coords.latitude || errorMsg}</AppText>
          <AppText>Longitude: {location?.coords.longitude || errorMsg}</AppText>
          ''
          {/* <Button title="Snap To 90%" onPress={() => handleSnapPress(2)} /> */}
          <TouchableOpacity
            onPress={async () => {
              if (auth.currentUser) {
                const playerRef = ref(
                  database,
                  `players/${auth.currentUser.uid}`
                );
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
              }
              router.replace("/(tabs)/home");
            }}
            style={styles.exit}
          >
            <AppText>Exit Game</AppText>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 25,
    alignItems: "center",
    backgroundColor: "#faf6ea",
  },
  topButtonsContainer: {
    position: "absolute",
    top: 50,
    zIndex: 1,
    width: "100%",
    paddingHorizontal: 20,
  },
  topButtonsContainerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  map: {
    flex: 1,
  },
  fireButton: {
    alignSelf: "center",
    backgroundColor: "#FF3B30",
    width: "50%",
    height: "8%",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 25,
  },
  fireButtonText: {
    color: "white",
    marginTop: 4,
    fontWeight: "bold",
  },
  user: {
    width: 60,
    height: 60,
    borderColor: "#fff",
    borderWidth: 2,
    borderRadius: 20,
    overflow: "hidden",
    zIndex: 1,
  },
  button: {
    width: "auto",
    backgroundColor: "#3a160e",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#3a160e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 18,
    color: "#faf6ea",
    fontFamily: "Bungee-Regular",
  },
  buttonIcon: {
    color: "#faf6ea",
  },
  exit: {
    bottom: 30,
    position: "absolute",
  },
});
