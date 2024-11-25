import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import WebView from "react-native-webview";
import { useNavigation } from "@react-navigation/native";

const deviceHeight = Dimensions.get("window").height;
const deviceWidth = Dimensions.get("window").width;

const Login = () => {
  const navigation = useNavigation();

  const url = "http://172.30.1.64:3000"; // React 웹 앱 URL

  const [token, setToken] = useState("");

  useEffect(() => {
    const fetchToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      console.log("Stored token:", storedToken);
      if (storedToken) {
        setToken(storedToken); 
      }
    };
    fetchToken();
  }, []);

  const injectedJS = `
  (function() {
    const token = window.localStorage.getItem('token');
    const message = JSON.stringify({ token });
    window.ReactNativeWebView.postMessage(message);
  })();
  true;
`;

  const handleWebViewMessage = async (event: any) => {
    try {
      const message = event.nativeEvent.data;
      console.log("웹에서 받은 메시지:", message);

      // 메시지가 JSON 형식인지 확인
      const parsedMessage = JSON.parse(message);

      if (parsedMessage.token && parsedMessage.token.trim() !== "") {
        // 토큰을 AsyncStorage에 저장
        await AsyncStorage.setItem("token", parsedMessage.token);
        console.log("토큰 저장 성공:", parsedMessage.token);
        // 여기서 메인으로 넘어가야함 
        navigation.replace("Main");
      } else {
      }
    } catch (error) {
      console.error("메시지 처리 중 오류:", error); 
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        style={styles.webview}
        source={{ uri: url }}
        injectedJavaScript={injectedJS}
        onMessage={handleWebViewMessage} // 메시지 핸들러 연결
      />
    </View>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  webview: {
    flex: 1,
    width: deviceWidth,
    height: deviceHeight,
  },
});
