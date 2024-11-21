import React, { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Text, PermissionsAndroid, Alert, Platform } from 'react-native';
import { RTCView, mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import axios from 'axios';


const socket = io('http://43.203.252.52:5001', { transports: ['websocket'] });

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const CameraScreen = ({ route }) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [peerConnection, setPeerConnection] = useState(null);
    const [roomId, setRoomId] = useState('');
    const [userId, setUserId] = useState('');
    const [serverResponse, setServerResponse] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('');

    useEffect(() => {
        setupSocketListeners();
        requestPermissions();

        // route.params에서 userId 가져오기
        if (route.params) {
            const { userId: userIdFromParams } = route.params;
            setUserId(userIdFromParams || '');
        }

        return () => {
            socket.disconnect();
            if (localStream) localStream.getTracks().forEach((track) => track.stop());
            if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop());
        };
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const permissions = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.CAMERA,
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ]);

            if (
                permissions['android.permission.CAMERA'] !== PermissionsAndroid.RESULTS.GRANTED ||
                permissions['android.permission.RECORD_AUDIO'] !== PermissionsAndroid.RESULTS.GRANTED
            ) {
                Alert.alert('Permission Denied', 'Camera and Microphone permissions are required.');
            }
        }
    };

    const setupSocketListeners = () => {
        socket.on('connection_success', (data) => {
            setConnectionStatus(data.message);
        });

        socket.on('room_status', (data) => {
            setServerResponse(data.message);
        });

        socket.on('webrtc_offer', handleReceiveOffer);
        socket.on('webrtc_answer', handleReceiveAnswer);
        socket.on('webrtc_ice_candidate', handleNewICECandidate);

        return () => { 
            socket.off('connection_success'); 
            socket.off('room_status');
            socket.off('webrtc_offer');
            socket.off('webrtc_answer');
            socket.off('webrtc_ice_candidate');
        };
    };

    const handleCreateRoom = async () => {
        if (!userId) {
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    console.error('Token not found in AsyncStorage');
                    return;
                }

                const response = await axios.get('http://43.203.252.52:3000/api/users', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`, // Bearer 토큰 추가
                    },
                });

                if (response.data && response.data.userId) {
                    setUserId(response.data.userId); // 유저 ID 저장
                    console.log('Fetched User ID:', response.data.userId);
                } else {
                    console.error('User ID not found in response');
                }
            } catch (error) {
                if (error.response) {
                    console.error('Error Response:', error.response.data);
                    console.error('Status:', error.response.status);
                } else if (error.request) {
                    console.error('No Response from server:', error.request);
                } else {
                    console.error('Error:', error.message);
                }
            }
            return;
        }

        const newRoomId = userId;
        setRoomId(newRoomId);

        socket.emit('create_room', { roomId: newRoomId, userId }, async (response) => {
            console.log('Response received from server:', response); // 서버 응답 확인
            if (response.status === 'success') {
                setServerResponse(`Room created successfully: ${response.roomId}`);
                console.log(`Room created successfully: ${response.roomId}`);

                try {
                    const token = await AsyncStorage.getItem('token');
                    console.log('Token:', token); // 토큰 확인
                    if (!token) {
                        console.error('Token not found in AsyncStorage');
                        return;
                    }

                    const apiResponse = await axios.put( 
                        `http://43.203.252.52:3000/api/users/${userId}`,
                        { isStudy: true },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                    console.log('API Response:', apiResponse.status); // 응답 상태 코드 확인
                    if (apiResponse.status === 200) {
                        console.log('Success Creating room');
                    } else {
                        console.error('Unexpected API Response:', apiResponse);
                    }
                } catch (error) {
                    console.error('Error updating isStudy status:', error.message);
                }
            } else {
                Alert.alert('Error', response.error || 'Failed to create room.');
            }
        });

        try {
            const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
        } catch (error) {
            Alert.alert('Error', 'Failed to access camera or microphone.');
        }
    };

    const handleJoinRoom = async () => {
        if (!roomId) {
            Alert.alert('Error', 'Room ID is required to join a room.');
            return;
        }

        try {
            const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            const pc = new RTCPeerConnection(configuration);
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('webrtc_ice_candidate', { roomId, candidate: event.candidate });
                }
            };

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };

            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
            setPeerConnection(pc);

            socket.emit('join', roomId);
            socket.on('room_status', (data) => {
                console.log('Room Status:', data);
                if (data.message === 'Joined room successfully') {
                    createOffer(pc);
                } else {
                    Alert.alert('Room Join Error', data.message);
                }
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to access camera or microphone.');
        }
    };

    const createOffer = async (pc) => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { roomId, sdp: offer });
    };

    const handleReceiveOffer = async (data) => {
        const pc = peerConnection || new RTCPeerConnection(configuration);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { roomId, sdp: answer });
    };

    const handleReceiveAnswer = async (data) => {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
    };

    const handleNewICECandidate = async (data) => {
        const candidate = new RTCIceCandidate(data.candidate);
        if (peerConnection) {
            await peerConnection.addIceCandidate(candidate);
        }
    };

    return (
        <View style={styles.container}>
            <Text>{connectionStatus}</Text>
            <Button title="Create Room" onPress={handleCreateRoom} />
            {/* 조건부로 Join Room 버튼 렌더링 */}
            {roomId && userId ? (
                <Button title="Join Room" onPress={handleJoinRoom} />
            ) : (
                <Text style={styles.warningText}>Room ID and User ID are required to join a room.</Text>
            )}
            <Text>{serverResponse}</Text>
            {localStream && (
                <RTCView streamURL={localStream.toURL()} style={styles.localVideo} />
            )}
            {remoteStream && (
                <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} />
            )}
        </View>
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    localVideo: {
        width: '100%',
        height: '40%',
        backgroundColor: 'black',
    },
    remoteVideo: {
        width: '100%',
        height: '40%',
        backgroundColor: 'gray',
    },
});

export default CameraScreen;
