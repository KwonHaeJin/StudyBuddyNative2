import React, { useEffect } from 'react';
import { View, Text, Button, Linking, Alert, Image, StyleSheet, Pressable } from 'react-native';

const App = () => {

  let titleS = require('./assets/image/title_study.png');
  let titleB = require('./assets/image/title_buddy.png');

  const handleDeepLink = (event) => {
    Alert.alert('딥 링크 URL', event.url);  // 딥 링크 URL 처리
  };

  useEffect(() => {
    // 앱이 백그라운드에서 열릴 때 딥 링크를 처리
    const handleLinking = (event) => {
      handleDeepLink(event);
    };

    // URL 리스너 추가
    Linking.addEventListener('url', handleLinking);

    // 앱이 처음 열릴 때 딥 링크를 확인
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // 컴포넌트가 언마운트되면 이벤트 리스너 제거
    return () => {
      Linking.removeEventListener('url', handleLinking);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Image source={titleS} style={styles.image1} resizeMode='contain'/>
      <Image source={titleB}  style={styles.image2} resizeMode='contain'/>

      <Pressable style={styles.button}
        onPress={() => Linking.openURL('https://15.164.74.145:5001/')} // 웹 페이지로 이동
      > <Text style={styles.buttonText}>Go To Study</Text></Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image1: {
    width: 100, // 원하는 너비
    height:50,
    marginRight:150
  },
  image2: {
    width: 200, // 원하는 너비
    height:45,
    marginBottom:80
  },
  button:{
    width:300,
    height:30,
    backgroundColor:"#FF9500",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
  }
});

export default App;
