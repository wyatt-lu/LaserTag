import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardType,
} from "react-native";

type InputModalProps = {
  visible: boolean;
  title: string;
  placeholder?: string;
  onClose: () => void;
  onConfirm: (inputText: string) => void;
  confirmText?: string;
  closeText?: string;
  inputType?: KeyboardType;
};

const InputModal: React.FC<InputModalProps> = ({
  visible,
  title,
  placeholder = "Enter text...",
  onClose,
  onConfirm,
  confirmText = "Confirm",
  closeText = "Close",
  inputType = "default",
}) => {
  const [inputText, setInputText] = useState<string>("");

  const handleInputChange = (text: string) => {
    setInputText(text);
  };

  const handleConfirm = () => {
    onConfirm(inputText);
    setInputText("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder={placeholder}
            keyboardType={inputType}
          />

          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>{closeText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleConfirm}>
              <Text style={[styles.buttonText, { color: "#3a160e" }]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "75%",
    padding: 30,
    backgroundColor: "#824a32",
    borderRadius: 20,
    alignItems: "center",
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#faf6ea",
    fontFamily: "Bungee-Regular",
  },
  input: {
    height: 40,
    borderWidth: 0,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginTop: 20,
    marginBottom: 20,
    width: "100%",
    backgroundColor: "#faf6ea",
    padding: 10,
    textAlign: "center",
    color: "#c3976a",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    padding: 10,
    marginHorizontal: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "#faf6ea",
    fontSize: 16,
    fontFamily: "Bungee-Regular",
  },
});

export default InputModal;
