import { useState, useEffect, useRef } from "react";
import {
  Button,
  GestureResponderEvent,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Magnetometer } from "expo-sensors"; // https://docs.expo.dev/versions/latest/sdk/magnetometer/#setupdateintervalintervalms
import * as Location from "expo-location"; // https://docs.expo.dev/versions/latest/sdk/location/
import { get, ref, set, update } from "firebase/database";
import { auth, database } from "../../firebaseconfig";
import { onAuthStateChanged } from "@firebase/auth";
import MapView, { Marker} from "react-native-maps";
import { globalStyles } from "@/constants/styles";
import React from "react";
import {
  getStorage,
  ref as ref_storage,
  getDownloadURL,
  uploadBytes,
} from "firebase/storage";

import * as FileSystem from 'expo-file-system';

export default function PlayScreen() {
  const [location, setLocation] = useState<Location.LocationObject>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });
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
    let magnetometerSubscription: { remove: any; };

    async function updateLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied.");
        return;
      }
/*
      interval = setInterval(async () => {
        let newLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation(newLocation);
  
        const direction = degree(magnetometerDataRef.current.x, magnetometerDataRef.current.y);
        console.log("Updating location:", {
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
          direction,
        });
  
        updatePlayerLocation(newLocation.coords.latitude, newLocation.coords.longitude, direction);
      }, 1000);
    }
      */

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,  // The time interval to get updated location data
        distanceInterval: 0.01,  // The minimum distance (in meters) before updating the location
      },
      (newLocation) => {
        setLocation(newLocation);
        const direction = degree(magnetometerDataRef.current.x, magnetometerDataRef.current.y);
    
          updatePlayerLocation(newLocation.coords.latitude, newLocation.coords.longitude, direction);
      }
      
    )};

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
      if (magnetometerSubscriptionRef.current) magnetometerSubscriptionRef.current.remove();
    };
  }, []);

  /*
  const magnetometerDataRef = useRef({ x: 0, y: 0, z: 0 });

  Magnetometer.setUpdateInterval(1000);
  useEffect(() => {
    let interval: string | number | NodeJS.Timeout | undefined;
    let magnetometerSubscription: { remove: any; };
  
    async function updateLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied.");
        return;
      }
  
      interval = setInterval(async () => {
        let newLocation = await Location.getCurrentPositionAsync();
        setLocation(newLocation);

        // Access latest magnetometer values
        const { x, y } = magnetometerDataRef.current;
        const direction = degree(x, y);

        updatePlayerLocation(newLocation.coords.latitude, newLocation.coords.longitude, direction);
      }, 500);
    }
  
    function getCurrentDirection() {
      magnetometerSubscription = Magnetometer.addListener((data) => {
        magnetometerDataRef.current = data;
      });
    }
  
    updateLocation();
    getCurrentDirection();
  
    // Cleanup interval and magnetometer subscription on unmount
    return () => {
      clearInterval(interval);
      if (magnetometerSubscription) {
        magnetometerSubscription.remove();
      }
    };
  }, []);*/

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

  function fireLaser(event: GestureResponderEvent): void {
    interface Coordinates {
      latitude: number;
      longitude: number;
    }

    // function haversine(
    //   lat1: number,
    //   lon1: number,
    //   lat2: number,
    //   lon2: number
    // ): number {
    //   const R = 6371; // Earth radius in kilometers
    //   const dLat = ((lat2 - lat1) * Math.PI) / 180;
    //   const dLon = ((lon2 - lon1) * Math.PI) / 180;
    //   Math.sin(dLon / 2);
    //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    //   const distance = R * c; // Distance in kilometers
    //   return distance;
    // }

    // function calculateBearing(
    //   lat1: number,
    //   lon1: number,
    //   lat2: number,
    //   lon2: number
    // ) {
    //   const φ1 = (lat1 * Math.PI) / 180; // Convert latitude from degrees to radians
    //   const φ2 = (lat2 * Math.PI) / 180; // Convert latitude from degrees to radians
    //   const Δλ = ((lon2 - lon1) * Math.PI) / 180; // Difference in longitude (in radians)

    //   const y = Math.sin(Δλ) * Math.cos(φ2);
    //   const x =
    //     Math.cos(φ1) * Math.sin(φ2) -
    //     Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    //   const θ = Math.atan2(y, x); // Calculate the angle in radians
    //   const bearing = ((θ * 180) / Math.PI + 360) % 360; // Convert radians to degrees and normalize between 0-360

    //   return bearing;
    // }

    /*
    
          <View style={styles.topContainer}>
        <Text>Latitude: {location?.coords.latitude || errorMsg}</Text>
        <Text>Longitude: {location?.coords.longitude || errorMsg}</Text>
        <Text>
          Direction: {degree(magnetometerDataRef.current.x, magnetometerDataRef.current.y)}° {cardinal(degree(magnetometerDataRef.current.x, magnetometerDataRef.current.y))}
        </Text>
      </View>
      <Button
        color="red"
        title="Update in Database"
        onPress={() => {
          if (location?.coords.latitude && location?.coords.longitude) {
            updatePlayerLocation(
              location?.coords.latitude,
              location?.coords.longitude,
              degree(magnetometerDataRef.current.x, magnetometerData.current.y)
            );
          }
        }}
      />
      */
  }
  /*CHANGE REGION
  const [region, setRegion] = useState({
    latitude: location?.coords.latitude,
    longitude: hostLocation?.coords.longitude,
    latitudeDelta: 0.001,
    longitudeDelta: 0.001,
  });
  
  useEffect(() => {
    if (location) {
      setRegion({
        latitude: location?.coords.latitude,
        longitude: location?.coords.longitude,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      });
      console.log("region", region);
    }
    console.log("inside");
  }, [location]);

  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location?.coords.latitude,
        longitude: location?.coords.longitude,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      }, 500); // Duration in ms
      console.log("Map ref!" + mapRef);
    }
  }, [location]);*/

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

  useEffect(() =>{
    const getCurrentUserURI = async ()=> {
      if (auth.currentUser) {
        setUserImageURI(await fetchUserURI(auth.currentUser.uid));
      }
    };

    getCurrentUserURI();
    console.log("hello!",userImageURI);
  }, [userImageURI]);
  
  console.log("hello!",userImageURI);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      
      <Text>Latitude: {location?.coords.latitude || errorMsg}</Text>
        <Text>Longitude: {location?.coords.longitude || errorMsg}</Text>
        <Text>
          Direction: {degree(magnetometerDataRef.current.x, magnetometerDataRef.current.y)}° {cardinal(degree(magnetometerDataRef.current.x, magnetometerDataRef.current.y))}
        </Text>

      <View>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.001222,
            longitudeDelta: 0.000821,
          }}
          showsUserLocation={true}
          followsUserLocation={true}
        >
          {userImageURI ? (
            <Marker 
              style={styles.userProfile}
              coordinate={{ latitude: location?.coords.latitude, longitude: location?.coords.longitude }}
              image={{ uri: userImageURI }}>
            </Marker>
            ) : (
              <Marker coordinate={{ latitude: location?.coords.latitude, longitude: location?.coords.longitude }}>
                <Text>Loading...</Text>
              </Marker>
          )}

        </MapView>
      ) : (
        <Text>Loading map...</Text>
      )}
      </View>

      <View style = {styles.mapContainer}>
        <View style={styles.circleButton}>
          <Button title="Fire Laser" color="red" onPress={fireLaser} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topContainer: {
    alignItems: "center",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  circleButton: {
    position: "absolute",
    bottom: 25,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#b69352",
    justifyContent: "center",
    alignItems: "center",
  },
  mapContainer: {
    position: "absolute",  // Ensure it overlays on the map
    bottom: 50,            // Move it above the screen edge
    left: 0,
    right: 0,
    alignItems: "center",
  },
  userProfile: {
    width: 30,
    height: 30,
    borderColor: "#3a160e",
    borderRadius: 15,
    left: "35%",
  },
});
