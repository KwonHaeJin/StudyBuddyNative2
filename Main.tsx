import { Dimensions, View, StyleSheet } from "react-native";
import WebView from "react-native-webview";
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image } from "react-native";

const deviceHeight = (Dimensions.get('window').height);
const deviceWidth = Dimensions.get('window').width;
const Tab = createBottomTabNavigator();
const BaseURL = 'http://172.16.1.109:3000';

function Home() {
  return (
    <View style={styles.container}>
      <WebView
          style={styles.webview}
          source={{ uri: `${BaseURL}/studyroom` }} />
    </View>
  );
}

function List(){
  return (
    <View style={styles.container}>
      <WebView
          style={styles.webview}
          source={{ uri: `${BaseURL}/todolist` }} />
    </View>
  );
};

function Myfeed () {
  return (
    <View style={styles.container}>
      <WebView
          style={styles.webview}
          source={{ uri: `${BaseURL}/feed` }} />
    </View>
  );
};

function Camera() {
  return (
    <View style={styles.container}>
      <WebView
          style={styles.webview}
          source={{ uri: `${BaseURL}/camera` }} />
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