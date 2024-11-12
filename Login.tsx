import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { Button, StyleSheet, Dimensions, View, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import CustomText from "./CustomText";
import AsyncStorage from "@react-native-async-storage/async-storage";

const deviceHeight = (Dimensions.get('window').height);
const deviceWidth = (Dimensions.get('window').width);

const Login = () => {
  const navigation = useNavigation();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');


  function Login() {
    console.log("ID:", id, "Password:", pw);
    axios.post(
      `${BaseURL}/login`,
      { "userId": id, "password": pw },
      {
        'headers': {
          'Content-Type': 'application/json'
        }
      }
    ).then(async (response) => {
      if (response.status == 200) {
        try {
          await AsyncStorage.setItem("id", id);
          await AsyncStorage.setItem("token", response.data.token);
          console.log(await AsyncStorage.getItem("token"));
          navigation.navigate("Main" as never);
          console.log('로그인 성공');
        } catch (error) { console.log("AsyncStorage error:", error); }
      }

    }).catch((error) => {
      console.log(error.response);

    });
  }


  return (
    <SafeAreaView style={styles.main}>
      <CustomText style={{ fontSize: 60, fontStyle: "italic", color: "#B3B3B3", marginRight: deviceWidth * 0.3 }}>study</CustomText>
      <View style={{ display: "flex", flexDirection: "row" }}>
        <View style={styles.dot1}></View><View style={styles.dot2}></View>
      </View>
      <CustomText style={{ fontSize: 72, fontStyle: "italic", color: "#FF7A00", marginTop: -15 }}>BUDDY</CustomText>
      <View style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
        <CustomText style={{ fontSize: 22, marginRight: deviceWidth * 0.1 }}>아이디</CustomText>
        <TextInput value={id} onChangeText={(text) => { setId(text); console.log("ID:", text); }} style={styles.textInput}></TextInput>
      </View>
      <View style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
        <CustomText style={{ fontSize: 22, marginRight: deviceWidth * 0.05 }}>비밀번호</CustomText>
        <TextInput value={pw} onChangeText={(text) => { setPw(text); console.log("PW:", text); }} style={styles.textInput}></TextInput>
      </View>
      <TouchableOpacity style={styles.loginButton} onPress={() => { Login(); }}>
        <CustomText style={{ fontSize: 15, color: "black" }}>login</CustomText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.signupButton} onPress={() => { }}>
        <CustomText style={{ fontSize: 15, color: "white" }}>sign up</CustomText>
      </TouchableOpacity>



    </SafeAreaView>
  );
};

export default Login;
export const BaseURL = "http://43.202.203.36:3000/api";

const styles = StyleSheet.create({
  main: {
    display: 'flex',
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
    paddingLeft: 2,
    paddingRight: 2,
    width: deviceWidth,
    minHeight: deviceHeight,
  },
  dot1: {
    height: 7,
    width: 7,
    borderRadius: "50%",
    backgroundColor: "#2EC316",
    marginLeft: deviceWidth * 0.13,
    marginTop: 0,
    marginBottom: 0

  },
  dot2: {
    height: 7,
    width: 7,
    borderRadius: "50%",
    backgroundColor: "#2EC316",
    marginLeft: deviceWidth * 0.09,
    marginTop: 0,
    marginBottom: 0
  },
  textInput: {
    width: deviceWidth * 0.55,
    padding: 10,
    marginBottom: 15,
    borderRadius: deviceHeight * 0.1,
    height: deviceHeight * 0.05,
    borderColor: "#ccc",
    borderWidth: 1,
    backgroundColor: "#FFFFFF"
  },
  loginButton: {
    width: deviceWidth * 0.75,
    height: deviceHeight * 0.035,
    borderColor: "#FF7A00",
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: deviceHeight * 0.1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  signupButton: {
    width: deviceWidth * 0.75,
    height: deviceHeight * 0.035,
    borderColor: "#FF7A00",
    borderWidth: 1,
    backgroundColor: "#FF7A00",
    borderRadius: deviceHeight * 0.1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }
});