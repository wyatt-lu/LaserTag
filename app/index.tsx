import React, { useState, useEffect } from "react";
import {
  Text,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  View,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, database } from "../firebaseconfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { ref, set } from "firebase/database";

const index = () => {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      if (userCredential.user) {
        router.replace("/(tabs)/home");
      }
    } catch (error: any) {
      console.log(error);
      alert("Signin failed: " + error.message);
    }
  };

  const signUp = async () => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    try {
      if (userCredential.user) {
        const displayName = email.split("@")[0].toLowerCase();
        await updateProfile(userCredential.user, { displayName });

        set(ref(database, `players/${userCredential.user.uid}`), {
          username: userCredential.user.displayName,
          email,
          room: null,
        });

        router.replace("/(tabs)/home");
      }
    } catch (error: any) {
      console.log(error);
      alert("Signup failed: " + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.logo}>laser tag | on the go</Text>
      <View style={styles.inputContainer}>
        <View style={styles.input}>
          <TextInput
            placeholder="email"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View style={styles.input}>
          <TextInput
            placeholder="password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        <View style={styles.buttonContainer}>
          <View style={styles.signin}>
            <TouchableOpacity onPress={signIn}>
              <Text style={styles.text}>login</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.signup}>
            <TouchableOpacity onPress={signUp}>
              <Text style={styles.text}>create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#b69352",
  },
  inputContainer: {
    alignItems: "center",
    padding: 20,
    width: "50%",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 10,
    fontWeight: "bold",
    textAlign: "center",
    borderRadius: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#cccccc",
  },
  buttonContainer: {
    flexDirection: "row",
    top: 10,
  },
  signin: {
    backgroundColor: "#BB0088",
    padding: 10,
    borderRadius: 5,
    right: 5,
  },
  signup: {
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 5,
    left: 5,
  },
  text: {
    color: "#fff",
    fontFamily: "Bungee",
  },
  logo: {
    fontFamily: "Bungee",
    bottom: 5,
  },
});
