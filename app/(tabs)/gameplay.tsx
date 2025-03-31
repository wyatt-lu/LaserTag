import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { Magnetometer } from "expo-sensors";
import * as Location from "expo-location";
import {
  get,
  getDatabase,
  onValue,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import { auth, database } from "../../firebaseconfig";
import * as FileSystem from "expo-file-system";
import MapView, { Marker, Polygon } from "react-native-maps";
import React from "react";
import {
  getStorage,
  ref as ref_storage,
  getDownloadURL,
} from "firebase/storage";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import AppText from "@/components/AppText";
import ReusableButton from "@/components/ReusableButton";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect, useRouter } from "expo-router";
import PowerUpMarker from "@/components/PowerUpMarker";
import SelectTargetModal from "@/components/StampedeModal";

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

  const [playerURLArray, setPlayersURL] = useState<any[]>([]);
  const [playerLocationArray, setPlayersLocation] = useState<any[]>([]);
  const [playerTeams, setPlayerTeams] = useState<{ [key: string]: number }>({});
  const [playerArray, setPlayerArray] = useState<any[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);

  const generatePowerUpIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    magnetometerDataRef.current = magnetometerData;
  }, [magnetometerData]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const updateLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied.");
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0.001,
        },
        (newLocation) => {
          setLocation(newLocation);
          setMagnetometerData((prevData) => {
            const direction = degree(prevData.x, prevData.y);
            updatePlayerLocation(
              newLocation.coords.latitude,
              newLocation.coords.longitude,
              direction
            );
            return prevData;
          });
        }
      );
    };

    const getCurrentDirection = () => {
      if (magnetometerSubscriptionRef.current) {
        magnetometerSubscriptionRef.current?.remove();
      }

      magnetometerSubscriptionRef.current = Magnetometer.addListener((data) => {
        setMagnetometerData(data);
      });
    };

    updateLocation();
    getCurrentDirection();

    return () => {
      locationSubscription?.remove();
      magnetometerSubscriptionRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    const database = getDatabase();

    interface PlayerData {
      direction: number;
      latitude: number;
      longitude: number;
      username: string;
      team: number;
    }

    const fetchRoomRef = async () => {
      if (!auth.currentUser) return;

      const playerId = auth.currentUser.uid;
      const playerRef = ref(database, `players/${playerId}`);
      const playerInfo = await get(playerRef);

      if (!playerInfo.exists()) return;

      const playerData = playerInfo.val();
      setRoomCode(playerData.room);
      const roomRef = ref(database, `rooms/${playerData.room}/players`);

      const unsubscribeRoom = onValue(roomRef, async (snapshotRoom) => {
        const roomData = snapshotRoom.val();

        if (roomData) {
          const playersLocationList = await Promise.all(
            Object.entries(roomData).map(async ([key, userData]) => {
              const player = userData as PlayerData;

              setPlayerTeams((prevTeams) => ({
                ...prevTeams,
                [key]: player.team,
              }));

              return {
                id: key,
                latitude: player.latitude,
                longitude: player.longitude,
              };
            })
          );
          setPlayersLocation(playersLocationList);
        }
      });
      return unsubscribeRoom;
    };

    fetchRoomRef();
    return () => {
      fetchRoomRef().then((unsubscribe) => unsubscribe?.());
    };
  }, []);

  const degree = (x: number, y: number): number => {
    let degree = 0;
    if (Math.atan2(y, x) >= 0) {
      degree = Math.atan2(y, x) * (180 / Math.PI);
    } else {
      degree = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
    }
    degree = Math.round(degree - 90 >= 0 ? degree - 90 : degree + 271);
    return degree;
  };

  const cardinal = (degree: number): string => {
    if (degree >= 22.5 && degree < 67.5) return "NE";
    if (degree >= 67.5 && degree < 112.5) return "E";
    if (degree >= 112.5 && degree < 157.5) return "SE";
    if (degree >= 157.5 && degree < 202.5) return "S";
    if (degree >= 202.5 && degree < 247.5) return "SW";
    if (degree >= 247.5 && degree < 292.5) return "W";
    if (degree >= 292.5 && degree < 337.5) return "NW";
    return "N";
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
        if (!playerData.room) {
          return;
        }
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

  const fireLaser = async () => {
    //when button pressed, via snapshots, get the laser type and code
    //feed this code into generateLaserLine, which returns mock geometry that has a radius of the circle on the map
    //with the mock geometry code, then feed that code into eliminatePlayer method
    //checks whether player coordinates when laser was shot falls into mock geometry
    //if yes, eliminate player, if not, then nothing happens
    const roomRef = ref(database, `rooms/${roomCode}/players`);
    const roomInfo = await get(roomRef);
    const roomsgklj = roomInfo.val();
    Object.entries(roomsgklj).forEach(([playerId, roomData]) => {
      console.log(`Player ID: ${playerId}`);

      // Loop through each property of the room
      Object.entries(roomData as { [key: string]: any }).forEach(
        ([key, value]) => {
          console.log(`  ${key}: ${value}`);
        }
      );
    });
  };

  const generateLaserLine = async () => {
    //via laser code, get laser information stored in the laser code and save into variables
    //do some math that creates the geometry mockup for default and 2x width
    //the length of the rectangle will be the length
    //rectangle will be pointing in the direction that the player is pointing, and it will branch out from the point where the player is
  };

  const fetchUserURL = async (id: any) => {
    try {
      const placeholderRef = ref_storage(storage, `${id}/pfp.jpg`);
      const url = await getDownloadURL(placeholderRef);
      /*
      const localUri = `${FileSystem.documentDirectory}pfp.jpg`;

      const { uri } = await FileSystem.downloadAsync(url, localUri);
      */
      return url;
    } catch (error) {
      console.error("Error fetching image URL:", error);
    }
  };

  useEffect(() => {
    const getPlayersURL = async () => {
      try {
        if (!auth.currentUser) return;

        const playerId = auth.currentUser.uid;
        const playerRef = ref(database, `players/${playerId}`);
        const playerInfo = await get(playerRef);

        if (playerInfo.exists()) {
          const playerData = playerInfo.val();
          const roomRef = ref(database, `rooms/${playerData.room}/players`);
          const roomInfo = await get(roomRef);
          if (roomInfo.exists()) {
            const roomData = roomInfo.val();
            const playersList = await Promise.all(
              Object.entries(roomData).map(async ([key]) => {
                let userURL = await fetchUserURL(key);
                return { id: key, profile: userURL };
              })
            );
            setPlayersURL(playersList);
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
          latitudeDelta: 0.003022,
          longitudeDelta: 0.002521,
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

  const teamColors = [
    { team: 1, color: "#8baaff" }, // blue
    { team: 2, color: "#ffe08b" }, // yellow
    { team: 3, color: "#ffbb8b" }, // orange
    { team: 4, color: "#bd99e6" }, // purple
    { team: 5, color: "#99d199" }, // green
    { team: 6, color: "#68dbcc" }, // teal
    { team: 7, color: "#e481c8" }, // pink
    { team: 8, color: "#ff9090" }, // red
  ];

  const getTeamColor = (teamNumber: number): string => {
    const teamColor = teamColors.find((team) => team.team === teamNumber);
    return teamColor ? teamColor.color : "#8baaff";
  };

  type LatLng = {
    latitude: number;
    longitude: number;
  };

  type PowerUp = {
    id: string;
    type: string;
    coordinate: LatLng;
  };

  const powerUpTypes = [
    { type: "Lasso" },
    { type: "Horseshoe" },
    { type: "Cowboy Boots" },
    { type: "Bounty" },
    { type: "Sheriff Badge" },
    { type: "Cowboy Hat" },
    { type: "Cactus" },
    { type: "Ox Stampede" },
    { type: "Money" },
  ];

  const generateCircleCoordinates = (
    center: LatLng,
    radius: number,
    numPoints: number
  ): LatLng[] => {
    const coordinates: LatLng[] = [];
    const earthRadius = 6378137;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * (2 * Math.PI);
      const deltaLat = (radius / earthRadius) * Math.sin(angle);
      const deltaLng =
        (radius / (earthRadius * Math.cos((center.latitude * Math.PI) / 180))) *
        Math.cos(angle);

      coordinates.push({
        latitude: center.latitude + (deltaLat * 180) / Math.PI,
        longitude: center.longitude + (deltaLng * 180) / Math.PI,
      });
    }
    coordinates.push(coordinates[0]);
    return coordinates;
  };

  const generateRandomCoordinate = (center: LatLng, radius: number): LatLng => {
    const earthRadius = 6378137; // Earth's radius in meters
    const randomAngle = Math.random() * 2 * Math.PI; // Random angle in radians
    const randomRadius = Math.sqrt(Math.random()) * radius; // Random radius within the circle

    const deltaLat = (randomRadius / earthRadius) * Math.sin(randomAngle);
    const deltaLng =
      (randomRadius /
        (earthRadius * Math.cos((center.latitude * Math.PI) / 180))) *
      Math.cos(randomAngle);

    return {
      latitude: center.latitude + (deltaLat * 180) / Math.PI,
      longitude: center.longitude + (deltaLng * 180) / Math.PI,
    };
  };

  const getCenter = async () => {
    if (!auth.currentUser) return;

    const playerId = auth.currentUser.uid;
    const playerInfo = await get(ref(database, `players/${playerId}`));

    if (!playerInfo.exists()) return;

    const roomRef = ref(
      database,
      `rooms/${playerInfo.val().room}/initialLocation`
    );
    const roomInfo = await get(roomRef);
    return roomInfo.val();
  };

  const [center, setCenter] = useState<LatLng>({
    latitude: 47.732473984376654,
    longitude: -122.32739349311144,
  }); // default center at lakeside

  useFocusEffect(
    useCallback(() => {
      const initializeGame = async () => {
        const center = await getCenter();
        if (center) {
          setCenter(center);
        }
      };
      initializeGame();
    }, [])
  );

  const circleCoordinates = generateCircleCoordinates(center, 160, 100);

  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);

  const getRandomPowerUp = (center: LatLng, radius: number): PowerUp => {
    const randomType =
      powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    return {
      id: Math.random().toString(36).substring(7), // Random ID
      type: randomType.type,
      coordinate: generateRandomCoordinate(center, radius),
    };
  };

  useEffect(() => {
    generatePowerUpIntervalRef.current = setInterval(async () => {
      if (!roomCode) return;

      const newPowerUp = getRandomPowerUp(center, 160);
      const powerUpsRef = ref(
        database,
        `rooms/${roomCode}/powerUps/${newPowerUp.id}`
      );
      await set(powerUpsRef, newPowerUp);

      const despawnTime = Math.random() * (18000 - 3000) + 3000;
      setTimeout(async () => {
        await remove(powerUpsRef);
      }, despawnTime);
    }, Math.random() * (18000 - 3000) + 3000);

    return () => {
      if (generatePowerUpIntervalRef.current) {
        clearInterval(generatePowerUpIntervalRef.current);
      }
    };
  }, [roomCode, center]);

  useEffect(() => {
    const fetchPowerUps = async () => {
      if (!roomCode) return;

      const powerUpsRef = ref(database, `rooms/${roomCode}/powerUps`);
      const unsubscribe = onValue(powerUpsRef, (snapshot) => {
        const powerUpsData = snapshot.val();
        if (powerUpsData) {
          const powerUpsList = Object.values(powerUpsData).map(
            (powerUp: any) => ({
              id: powerUp.id,
              type: powerUp.type,
              coordinate: {
                latitude: powerUp.coordinate.latitude,
                longitude: powerUp.coordinate.longitude,
              },
            })
          );
          setPowerUps(powerUpsList);
        } else {
          setPowerUps([]);
        }
      });

      return () => unsubscribe();
    };

    fetchPowerUps();
  }, [roomCode]);

  const resetGame = async () => {
    if (!auth.currentUser) return;

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

    // Clear the interval that generates power-ups
    if (generatePowerUpIntervalRef.current) {
      clearInterval(generatePowerUpIntervalRef.current);
    }

    setPowerUps([]);
    setPlayersURL([]);
    setPlayersLocation([]);
    setPlayerTeams({});
    setRoomCode(null);

    router.replace("/(tabs)/home");
  };

  const [isOxStampedeModalVisible, setOxStampedeModalVisible] = useState(false);

  const useOx = () => {
    console.log("Using Ox Stampede power-up");
    setOxStampedeModalVisible(true);
  };

  const handleTargetSelect = (targetId: string) => {
    setOxStampedeModalVisible(false);
    // do stuff on target's screen
    setDustStormActive(true);
  };

  const [isDustStormActive, setDustStormActive] = useState(false);

  const useHorseshoe = () => {
    console.log("Using Horseshoe power-up");
    // horseshoe logic
  };

  const useBadge = () => {
    console.log("Using Sheriff's Badge power-up");
    // sheriff's badge
  };

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
            <Text
              style={[
                styles.buttonText,
                {
                  color: auth.currentUser
                    ? getTeamColor(playerTeams[auth.currentUser.uid || ""] || 1)
                    : "#FFFFAA",
                },
              ]}
            >
              {"  "}
              [TEAM {playerTeams[auth.currentUser?.uid || ""] || 1}]
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
            latitudeDelta: 0.002222,
            longitudeDelta: 0.001521,
          }}
          showsScale={true}
          mapPadding={{ top: 10, right: 10, bottom: 10, left: 10 }}
          mapType="hybrid"
          rotateEnabled={false}
          loadingEnabled={true}
        >
          <Polygon
            coordinates={circleCoordinates}
            strokeColor="#FF0000"
            strokeWidth={2}
            fillColor="#FF000040"
          />
          {powerUps.map((powerUp) => (
            <PowerUpMarker
              key={powerUp.id}
              coordinate={powerUp.coordinate}
              name={powerUp.type}
            />
          ))}
          {playerURLArray.map((player) => {
            const playerLocation = playerLocationArray.find(
              (location) => location.id === player.id
            );
            return playerLocation ? (
              <Marker
                key={player.id}
                coordinate={{
                  latitude: playerLocation.latitude,
                  longitude: playerLocation.longitude,
                }}
              >
                <Image
                  source={{ uri: player.profile }}
                  style={styles.user}
                ></Image>
              </Marker>
            ) : (
              <Text>Loading...</Text>
            );
          })}
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

          <ReusableButton label="Use Ox" onPress={useOx} />
          <ReusableButton label="Use Horseshoe" onPress={useHorseshoe} />
          <ReusableButton label="Use Badge" onPress={useBadge} />

          <TouchableOpacity onPress={resetGame} style={styles.exit}>
            <AppText>Exit Game</AppText>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>

      <SelectTargetModal
        visible={isOxStampedeModalVisible}
        onClose={() => setOxStampedeModalVisible(false)}
        players={playerTeams}
        onSelect={handleTargetSelect}
        currentPlayerTeam={playerTeams[auth.currentUser?.uid || ""] || 1}
      />
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
    borderColor: "#000",
    borderWidth: 2,
    borderRadius: 20,
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
