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
import { get, ref, set, update, remove } from "firebase/database";
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

import * as FileSystem from "expo-file-system";
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const magnetometerSubscriptionRef = useRef<any>(null);

  const storage = getStorage();

  const [userImageURI, setUserImageURI] = useState<any>();

  useEffect(() => {
    magnetometerDataRef.current = magnetometerData;
  }, [magnetometerData]);

  useEffect(() => {
    let interval: string | number | NodeJS.Timeout | undefined;
    let magnetometerSubscription: { remove: any };

    async function updateLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied.");
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0.01,
        },
        (newLocation) => {
          setLocation(newLocation);
          const direction = degree(
            magnetometerDataRef.current.x,
            magnetometerDataRef.current.y
          );

          updatePlayerLocation(
            newLocation.coords.latitude,
            newLocation.coords.longitude,
            direction
          );
        }
      );
    }

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
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (magnetometerSubscriptionRef.current)
        magnetometerSubscriptionRef.current.remove();
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
      console.error("Error updating player location:", error);
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

  //todo
  const fireLaser = () => {};

  const fetchUserURI = async (id: any) => {
    try {
      const placeholderRef = ref_storage(storage, `${id}/pfp.jpg`);
      const url = await getDownloadURL(placeholderRef);

      const localUri = `${FileSystem.documentDirectory}pfp.jpg`;

      const { uri } = await FileSystem.downloadAsync(url, localUri);
      return url;
    } catch (error) {
      console.error("Error fetching image URL:", error);
    }
  };

  useEffect(() => {
    const getCurrentUserURI = async () => {
      if (auth.currentUser) {
        setUserImageURI(await fetchUserURI(auth.currentUser.uid));
      }
    };

    getCurrentUserURI();
  }, [userImageURI]);

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
          // showsUserLocation={true}
          // followsUserLocation={true}
          showsMyLocationButton={true}
          showsScale={true}
          mapPadding={{ top: 10, right: 10, bottom: 10, left: 10 }}
          mapType="hybrid"
          // zoomEnabled={false}
          rotateEnabled={false}
          loadingEnabled={true}
        >
          {userImageURI ? (
            <Marker
              style={styles.user}
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              image={{ uri: userImageURI }}
            ></Marker>
          ) : (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
            >
              <Text>Loading...</Text>
            </Marker>
          )}
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
