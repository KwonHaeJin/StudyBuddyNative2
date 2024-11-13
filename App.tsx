/* eslint-disable @typescript-eslint/no-unused-vars */
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { useEffect } from "react";
import { Alert, Dimensions} from "react-native";
import Login from "./Login";
import Main from "./Main";
import Mypage from "./Mypage";
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
 });

const App = () =>{
  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
	//android의 경우 기본값이 authorizaed

    if (enabled) {
      await messaging()
        .getToken()
        .then(fcmToken => {
          console.log(fcmToken); //fcm token을 활용해 특정 device에 push를 보낼 수 있다.
        })
        .catch(e => console.log('error: ', e));
    }
  }

  const onDisplayNotification = async ({
    title = '',
    body = '',
  }: {
    title?: string;
    body?: string;
  }) => {
    const channelId = await notifee.createChannel({
      id: 'channelId',
      name: 'channelName',
    });

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
      },
    });
  };

  useEffect(() => {
    //push notification permission 요청
    requestUserPermission();

    // 포그라운드에서 푸시메시지 수신
    return messaging().onMessage(async remoteMessage => {
      const title = remoteMessage?.notification?.title;
      const body = remoteMessage?.notification?.body;
      await onDisplayNotification({title, body});
    });
  }, []);

  const Stack = createNativeStackNavigator();
  const deviceHeight = (Dimensions.get('window').height);
  const deviceWidth = (Dimensions.get('window').width);

  return(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown:false}}>
        <Stack.Screen name="Login" component={Login}/>
        <Stack.Screen name="Main" component={Main}/>
        <Stack.Screen name="Mypage" component={Mypage}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;