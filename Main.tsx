import React, { useState, useEffect } from "react";
import { Dimensions, View, StyleSheet, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import WebView from "react-native-webview";
import { Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CameraScreen from "./CameraScreen";

const deviceHeight = Dimensions.get("window").height;
const deviceWidth = Dimensions.get("window").width;
const Tab = createBottomTabNavigator();
const BaseURL = "http://192.168.0.37:3000";

interface WebViewWithTokenProps {
  url: string;
}

function WebViewWithToken({ url }: WebViewWithTokenProps) {
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
      window.localStorage.setItem('token', '${token}');
      window.ReactNativeWebView.postMessage('토큰이 설정되었습니다: ' + window.localStorage.getItem('token'));
    })();
    true;
  `;

  if (!url) {
    return (
      <View style={styles.container}>
        <Text>URL이 설정되지 않았습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        style={styles.webview}
        source={{ uri: url }}
        injectedJavaScript={injectedJS}
        onMessage={(event) => {
          console.log("웹에서 받은 메시지:", event.nativeEvent.data);
        }}
      />
    </View>
  );
}

function Home() {
  return <WebViewWithToken url={`${BaseURL}/studyroom`} />;
}

function List() {
  return <WebViewWithToken url={`${BaseURL}/todolist`} />;
}

function Myfeed() {
  return <WebViewWithToken url={`${BaseURL}/feed`} />;
}

const Main = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: any }) => ({
        tabBarIcon: ({ color }: { color: string }) => {
          const icons = {
            HomeScreen: require("./assets/image/homeIcon.png"),
            ListScreen: require("./assets/image/todooIcon.png"),
            CameraScreen: require("./assets/image/cameraIcon.png"),
            MyfeedScreen: require("./assets/image/feedIcon.png"),
          };
          return (
            <Image
              source={icons[route.name]}
              style={{ width: 24, height: 24, tintColor: color }}
            />
          );
        },
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#FF7A00",
        tabBarInactiveTintColor: "black",
      })}
    >
      <Tab.Screen name="HomeScreen" component={Home} />
      <Tab.Screen name="ListScreen" component={List} />
      <Tab.Screen name="CameraScreen" component={CameraScreen} />
      <Tab.Screen name="MyfeedScreen" component={Myfeed} />
    </Tab.Navigator>
  );
};

export default Main;

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
