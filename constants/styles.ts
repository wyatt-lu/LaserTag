import { Platform, StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#faf6ea",
  },
});

// export const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   contentContainer: {
//     flex: 1,
//     padding: 25,
//     alignItems: "center",
//     backgroundColor: "#faf6ea",
//   },

//   topButtonsContainer: {
//     position: "absolute",
//     top: 50,
//     zIndex: 1,
//     width: "100%",
//     paddingHorizontal: 20,
//     backgroundColor: "rgba(255, 255, 255, 0.1)",
//     borderRadius: 15,
//     marginHorizontal: 10,
//     paddingVertical: 15,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 10,
//     elevation: 8,
//   },

//   topButtonsContainerRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     width: "100%",
//   },

//   map: {
//     flex: 1,
//   },

//   persistentButtonContainer: {
//     position: "absolute",
//     top: 50,
//     left: 20,
//     zIndex: 1001,
//   },

//   iconButtonSpacer: {
//     width: 60,
//     height: 60,
//   },

//   button: {
//     backgroundColor: "#3a160e",
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderRadius: 25,
//     alignItems: "center",
//     justifyContent: "center",
//     shadowColor: "#3a160e",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 6,
//     marginBottom: 12,
//     minHeight: 50,
//     borderWidth: 1,
//     borderColor: "rgba(250, 246, 234, 0.2)",
//   },

//   iconButton: {
//     width: 60,
//     height: 60,
//     backgroundColor: "#3a160e",
//     borderRadius: 30,
//     alignItems: "center",
//     justifyContent: "center",
//     shadowColor: "#3a160e",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 6,
//     borderWidth: 2,
//     borderColor: "rgba(250, 246, 234, 0.3)",
//   },

//   userInfoButton: {
//     backgroundColor: "rgba(58, 22, 14, 0.9)",
//     paddingVertical: 8,
//     paddingHorizontal: 16,
//     borderRadius: 20,
//     flexDirection: "row",
//     alignItems: "center",
//     shadowColor: "#3a160e",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 4,
//     borderWidth: 1,
//     borderColor: "rgba(250, 246, 234, 0.2)",
//   },

//   buttonText: {
//     fontSize: 16,
//     color: "#faf6ea",
//     fontFamily: "Bungee-Regular",
//     fontWeight: "600",
//   },

//   buttonIcon: {
//     color: "#faf6ea",
//   },

//   timerContainer: {
//     alignItems: "center",
//     justifyContent: "center",
//     marginVertical: 12,
//     width: "100%",
//     backgroundColor: "rgba(0, 0, 0, 0.2)",
//     borderRadius: 15,
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//   },

//   timerText: {
//     fontSize: 20,
//     fontWeight: "bold",
//     color: "#FFFFFF",
//     marginBottom: 8,
//     textShadowColor: "rgba(0, 0, 0, 0.8)",
//     textShadowOffset: { width: 1, height: 1 },
//     textShadowRadius: 3,
//     fontFamily: "Bungee-Regular",
//   },

//   timerProgressBackground: {
//     width: "90%",
//     height: 8,
//     backgroundColor: "rgba(0, 0, 0, 0.4)",
//     borderRadius: 4,
//     overflow: "hidden",
//     borderWidth: 1,
//     borderColor: "rgba(255, 255, 255, 0.2)",
//   },

//   fireButtonContainer: {
//     width: "80%",
//     height: 60,
//     backgroundColor: "rgba(58, 22, 14, 0.9)",
//     borderRadius: 20,
//     overflow: "hidden",
//     marginBottom: 20,
//     shadowColor: "#3a160e",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 6,
//   },

//   fireButtonText: {
//     fontSize: 18,
//     color: "#faf6ea",
//     fontFamily: "Bungee-Regular",
//     textAlign: "center",
//     fontWeight: "600",
//   },

//   marker: {
//     width: 28,
//     height: 28,
//     borderRadius: 14,
//     borderWidth: 3,
//     borderColor: "#FFFFFF",
//     alignItems: "center",
//     justifyContent: "center",
//     zIndex: 1,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 5,
//   },

//   powerUpItem: {
//     padding: 12,
//     marginVertical: 6,
//     marginHorizontal: 8,
//     backgroundColor: "#FFFFFF",
//     borderColor: "rgba(58, 22, 14, 0.2)",
//     borderWidth: 1,
//     borderRadius: 12,
//     flexDirection: "row",
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//     minHeight: 60,
//   },

//   powerUpIconContainer: {
//     marginRight: 8,
//     padding: 4,
//   },

//   powerUpName: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#3a160e",
//     flex: 1,
//   },

//   powerUpList: {
//     marginTop: 20,
//     width: "100%",
//   },

//   powerUpCount: {
//     fontSize: 14,
//     fontWeight: "bold",
//     color: "#FFFFFF",
//     backgroundColor: "#3a160e",
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     overflow: "hidden",
//     minWidth: 24,
//     textAlign: "center",
//   },

//   modalContainer: {
//     flex: 1,
//     backgroundColor: "#faf6ea",
//   },

//   modalButtonContainer: {
//     position: "absolute",
//     bottom: 30,
//     alignSelf: "center",
//     flexDirection: "row",
//     gap: 15,
//   },

//   modalButton: {
//     backgroundColor: "#3a160e",
//     paddingVertical: 12,
//     paddingHorizontal: 24,
//     borderRadius: 20,
//     shadowColor: "#3a160e",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 4,
//   },

//   modalButtonText: {
//     color: "#faf6ea",
//     fontSize: 16,
//     fontWeight: "600",
//     fontFamily: "Bungee-Regular",
//   },

//   loadingText: {
//     fontSize: 18,
//     color: "#3a160e",
//     fontFamily: "Bungee-Regular",
//     textAlign: "center",
//     marginTop: 50,
//   },

//   safeTopArea: {
//     paddingTop: Platform.OS === "ios" ? 44 : 24,
//   },
// });
