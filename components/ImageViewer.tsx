import { View, StyleSheet } from "react-native";
import { Image, type ImageSource } from "expo-image";

type Props = {
  source: ImageSource;
  selectedImage?: string;
};

export default function ImageViewer({ source, selectedImage }: Props) {
  const imageSource = selectedImage ? { uri: selectedImage } : source;

  return <Image style={styles.image} source={imageSource} />;
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});
