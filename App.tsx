/* eslint-disable @typescript-eslint/no-unused-vars */
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Dimensions} from "react-native";
import Login from "./Login";
import Main from "./Main";
import Mypage from "./Mypage";

const App = () =>{
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