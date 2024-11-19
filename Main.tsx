import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, Image } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import WebView from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CameraScreen from "./CameraScreen";

const Tab = createBottomTabNavigator();
const BaseURL = "http://192.168.0.37:3000";

function WebViewWithToken({ url }: { url: string }) {
  const [token, setToken] = useState("");

  useEffect(() => {
    const fetchToken = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
      }
    };
    fetchToken();
  }, []);

  const injectedJS = `
    (function() {
      window.localStorage.setItem('token', '${token}');
      window.ReactNativeWebView.postMessage('Token has been set: ' + window.localStorage.getItem('token'));
    })();
    true;
  `;

  return (
    <View style={{ flex: 1 }}>
      {url ? (
        <WebView
          style={styles.webview}
          source={{ uri: url }}
          injectedJavaScript={injectedJS}
          onMessage={(event) => console.log("Message from Web:", event.nativeEvent.data)}
        />
      ) : (
        <View style={styles.container}>
          <Text>URL is not set.</Text>
        </View>
      )}
    </View>
  );
}

const Home = () => <WebViewWithToken url={`${BaseURL}/studyroom`} />;
const List = () => <WebViewWithToken url={`${BaseURL}/todolist`} />;
const Myfeed = () => <WebViewWithToken url={`${BaseURL}/feed`} />;

const Main = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => {
          const icons: { [key: string]: any } = {
            HomeScreen: require("./assets/image/homeIcon.png"),
            ListScreen: require("./assets/image/todooIcon.png"),
            CameraScreen: require("./assets/image/cameraIcon.png"),
            MyfeedScreen: require("./assets/image/feedIcon.png"),
          };
          return <Image source={icons[route.name]} style={{ width: 24, height: 24, tintColor: color }} />;
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
  },
});
