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
import MapView from "react-native-maps";
import { globalStyles } from "@/constants/styles";

export default function PlayScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [{ x, y, z }, setData] = useState({ x: 0, y: 0, z: 0 });

  Magnetometer.setUpdateInterval(1000);

  useEffect(() => {
    async function getCurrentlLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied.");
        return;
      }

      let location = await Location.getCurrentPositionAsync();
      setLocation(location);
    }

    async function getCurrentDirection() {
      const subscription = Magnetometer.addListener((result) => {
        setData(result);
      });

      return () => {
        subscription.remove();
      };
    }

    getCurrentlLocation();
    getCurrentDirection();
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
  }

  const mapRef = useRef<any>();

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.topContainer}>
        <Text>Latitude: {location?.coords.latitude || errorMsg}</Text>
        <Text>Longitude: {location?.coords.longitude || errorMsg}</Text>
        <Text>
          Direction: {degree(x, y)}° {cardinal(degree(x, y))}
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
              degree(x, y)
            );
          }
        }}
      />
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 47.73235046715927,
            longitude: -122.32779295374982,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          }}
          showsUserLocation
          ref={mapRef}
        />
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
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
});
