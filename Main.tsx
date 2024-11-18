import { Dimensions, View, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const deviceHeight = (Dimensions.get('window').height);
const deviceWidth = Dimensions.get('window').width;
const Tab = createBottomTabNavigator();

const BaseURL = 'http://192.168.0.37:3000';

interface WebViewWithTokenProps {
  url: string;
}

function WebViewWithToken({ url }: WebViewWithTokenProps) {
  const [token, setToken] = useState('');

  useEffect(() => {
    // AsyncStorage에서 토큰 가져오기
    const fetchToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      console.log(await AsyncStorage.getItem('token'))
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
    true; // 주입 코드가 성공적으로 완료되었음을 보장하기 위해
  `;


  return (
    <View style={styles.container}>
      <WebView
        style={styles.webview}
        source={{ uri: url }}
        injectedJavaScript={injectedJS} // 토큰을 주입
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

function List(){
  return <WebViewWithToken url={`${BaseURL}/todolist`} />;
}

function Myfeed () {
  return <WebViewWithToken url={`${BaseURL}/feed`} />;
}

function Camera() {

  return (
    <View style={styles.container}>
      <WebView
          style={styles.webview}
          source={{ uri: 'http://43.202.203.36:5001' }} />
    </View>
  );
};


const Main = () =>{
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
            style={{width:24, height:24,tintColor:color}}
            resizeMode='contain'/>
          );
        },
        headerShown:false,
        tabBarShowLabel:false,
        tabBarActiveTintColor:"#FF7A00",
        tabBarInactiveTintColor:"black",
      })}>
        <Tab.Screen name="HomeScreen" component={Home}/>
        <Tab.Screen name="ListScreen" component={List}/>
        <Tab.Screen name="CameraScreen" component={Camera}/>
        <Tab.Screen name="MyfeedScreen" component={Myfeed}/>
      </Tab.Navigator>
  );
};

export default Main;



const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  webview: {
    flex: 1,
    width: deviceWidth,
    height: deviceHeight,
  },
});