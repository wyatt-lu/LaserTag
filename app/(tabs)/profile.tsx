import { auth, database } from "../../firebaseconfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  getStorage,
  ref as ref_storage,
  StorageReference,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import ReusableButton from "@/components/ReusableButton";
import ImageViewer from "../../components/ImageViewer";
import { globalStyles } from "@/constants/styles";

export default function ProfileScreen() {
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
  }, []);

  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmail(user.email);
      } else {
        setEmail(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={styles.profileHolder}>
        {imageUrl ? (
          <ImageViewer
            source={{ uri: imageUrl }}
            selectedImage={selectedImage}
          />
        ) : (
          <Text style={styles.loading}>Loading image...</Text>
        )}
      </View>

      <ReusableButton label="Choose Profile" theme="pfp" onPress={pickImage} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileHolder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 75,
    marginLeft: "auto",
    marginRight: "auto",
    marginBottom: 25,
    overflow: "hidden",
  },
  loading: {
    textAlign: "center",
    flexWrap: "wrap",
    padding: 15,
  },
});
