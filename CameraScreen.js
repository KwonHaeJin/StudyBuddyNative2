import React, { useEffect, useState } from 'react';
import { View, Button, PermissionsAndroid, StyleSheet, Platform, Text, Alert } from 'react-native';
import { RTCView, mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import axios from 'axios';

// Constants
const SOCKET_URL = 'http://43.203.252.52:5001';
const API_URL = 'http://43.203.252.52:3000/api/users';
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// Initialize socket
const socket = io(SOCKET_URL, { transports: ['websocket'] });

const CameraScreen = ({ route }) => {
    const { sendingRequestUserId, receivedRequestUserId } = route.params || {}; // Navigation params
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [peerConnection, setPeerConnection] = useState(null);
    const [roomId, setRoomId] = useState('');
    const [userId, setUserId] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('');

    useEffect(() => {
        (async () => {
            await requestPermissions();
            await fetchUserInfo();

            // receivedRequestUserId가 있다면 해당 방에 참여
            if (receivedRequestUserId) {
                console.log(`Joining room: ${receivedRequestUserId}`);
                joinRoom(receivedRequestUserId);
            }
        })();

        setupSocketListeners();

        return () => cleanupResources();
    }, [receivedRequestUserId]);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
            const audioGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

            if (!granted || !audioGranted) {
                const permissions = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ]);

                if (
                    permissions['android.permission.CAMERA'] !== PermissionsAndroid.RESULTS.GRANTED ||
                    permissions['android.permission.RECORD_AUDIO'] !== PermissionsAndroid.RESULTS.GRANTED
                ) {
                    Alert.alert(
                        '권한 필요',
                        '앱에서 카메라 및 마이크 권한이 필요합니다. 설정으로 이동하여 권한을 활성화하세요.',
                        [{ text: '설정 열기', onPress: () => OpenAppSettings.open() }]
                    );
                    throw new Error('Camera or audio permissions not granted');
                }
            }
        } else {
            console.log('iOS 권한은 Info.plist에서 설정됩니다.');
        }
    };

    const fetchUserInfo = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('Token not found in AsyncStorage');
                return;
            }

            const response = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setUserId(response.data.userId);
        } catch (error) {
            console.error('Error fetching user info:', error.message);
        }
    };

    const setupSocketListeners = () => {
        socket.on('connection_success', (data) => {
            setConnectionStatus(`Connected: ${data.message}`);
        });

        socket.on('webrtc_offer', handleReceiveOffer);
        socket.on('webrtc_answer', handleReceiveAnswer);
        socket.on('webrtc_ice_candidate', handleNewICECandidateMsg);

        socket.on('disconnect', async () => {
            console.log('Socket disconnected.');
            await updateStudyStatus(false);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error.message);
        });
    };

    const cleanupResources = async () => {
        peerConnection?.close();
        localStream?.getTracks().forEach((track) => track.stop());
        remoteStream?.getTracks().forEach((track) => track.stop());
        socket.disconnect();
    };

    const updateStudyStatus = async (status) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('Token not found in AsyncStorage');
                return;
            }

            await axios.put(`${API_URL}/${userId}`, { isStudy: status }, {
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (error) {
            console.error('Error updating study status:', error.message);
        }
    };

    const handleStartRecording = async () => {
        setRoomId(userId);
        await startLocalStream();

        socket.emit('create_room', { roomId: userId, userId }, async (response) => {
            if (response?.status === 'success') {
                setIsRecording(true);
                await updateStudyStatus(true);
            } else {
                console.error('Room creation failed:', response?.error);
            }
        });
    };

    const startLocalStream = async () => {
        try {
            const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
            setLocalStream(stream);
        } catch (error) {
            console.error('Error accessing media devices:', error.message);
        }
    };

    const handleLeaveRoom = async () => {
        cleanupResources();
        setIsRecording(false);
    };

    const handleReceiveOffer = async (sdp) => {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { roomId, sdp: answer });
    };

    const handleReceiveAnswer = async (sdp) => {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        }
    };

    const handleNewICECandidateMsg = async ({ candidate }) => {
        if (peerConnection) {
            const iceCandidate = new RTCIceCandidate(candidate);
            await peerConnection.addIceCandidate(iceCandidate);
        }
    };

    const createPeerConnection = () => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_ice_candidate', { roomId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        };

        localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream));
        setPeerConnection(pc);
        return pc;
    };

    // 방 참여 로직
    const joinRoom = (roomId) => {
        socket.emit('join_room', { roomId }, (response) => {
            if (response?.status === 'success') {
                console.log(`Successfully joined room: ${roomId}`);
                initializeWebRTC(roomId);
            } else {
                console.error('Failed to join room:', response?.error);
            }
        });
    };

    const initializeWebRTC = async (roomId) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        if (!localStream) {
            const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
            setLocalStream(stream);
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc_ice_candidate', { roomId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            console.log('Received remote stream:', event.streams[0]);
            setRemoteStream(event.streams[0]);
        };

        socket.on('webrtc_offer', async (offer) => {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc_answer', { roomId, sdp: answer });
        });

        socket.on('webrtc_ice_candidate', async ({ candidate }) => {
            if (candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        setPeerConnection(pc);
    };

    return (
        <View style={styles.container}>
            <Text>{connectionStatus}</Text>
            {isRecording || receivedRequestUserId ? (
                <>
                    {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} />}
                    {localStream && <RTCView streamURL={localStream.toURL()} style={styles.localVideo} mirror />}
                    <Button title="Leave Room" onPress={handleLeaveRoom} color="red" />
                </>
            ) : (
                <Button title="Start Recording" onPress={handleStartRecording} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    remoteVideo: { width: '80%', height: undefined, aspectRatio: 16 / 9, backgroundColor: 'black' },
    localVideo: { width: '80%', height: undefined, aspectRatio: 16 / 9, backgroundColor: 'black' },
});

export default CameraScreen;
