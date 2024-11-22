import React, { useState, useEffect } from 'react';
import { Dimensions, View, StyleSheet, Text, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WebView from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CameraScreen from './CameraScreen';

const Tab = createBottomTabNavigator();
const BaseURL = 'http://172.16.1.95:3000';

function WebViewWithToken({ url }: { url: string }) {
  const [token, setToken] = useState('');

  useEffect(() => {
    const fetchToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
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

  if (!url) {
    return (
      <View style={styles.container}>
        <Text>URL is not set.</Text>
      </View>
    );
  }

  return (
    <WebView
      style={styles.webview}
      source={{ uri: url }}
      injectedJavaScript={injectedJS}
      onMessage={(event) => {
        console.log('Message from Web:', event.nativeEvent.data);
      }}
    />
  );
}

function Home() {
  return (
    <View style={styles.screenContainer}>
      <WebViewWithToken url={`${BaseURL}/studyroom`} />
    </View>
  );
}

function List() {
  return (
    <View style={styles.screenContainer}>
      <WebViewWithToken url={`${BaseURL}/todolist`} />
    </View>
  );
}

function Myfeed() {
  return (
    <View style={styles.screenContainer}>
      <WebViewWithToken url={`${BaseURL}/feed`} />
    </View>
  );
}

const Main = () => {
   return(
      <Tab.Navigator screenOptions={({route}:{route:any})=>({
        tabBarIcon:({color}:{color:string})=>{
          let iconSource;

          if(route.name == 'HomeScreen'){
            iconSource = require('./assets/image/homeIcon.png');
          } else if(route.name == 'ListScreen'){
            iconSource = require('./assets/image/todooIcon.png');
          } else if(route.name == 'CameraScreen'){
            iconSource = require('./assets/image/cameraIcon.png');
          } else if(route.name == 'MyfeedScreen'){
            iconSource = require('./assets/image/feedIcon.png');
          } 
          return(
            <Image source={iconSource}
            style={{width:24, height:24,tintColor:color,}}
            resizeMode='contain'/>
          );
        },
        headerShown:false,
        tabBarShowLabel:false,
        tabBarActiveTintColor:"#FF7A00",
        tabBarInactiveTintColor:"black",
        tabBarStyle: {
          height: 60, 
          paddingTop:10
          
        },
      })}>
        <Tab.Screen name="HomeScreen" component={Home}/>
        <Tab.Screen name="ListScreen" component={List}/>
        <Tab.Screen name="CameraScreen" component={CameraScreen}/>
        <Tab.Screen name="MyfeedScreen" component={Myfeed}/>
      </Tab.Navigator>
  );
};

export default Main;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
