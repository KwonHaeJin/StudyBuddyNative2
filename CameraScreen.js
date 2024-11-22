/* eslint-disable no-shadow */
import React, { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Text, PermissionsAndroid, Alert, Platform } from 'react-native';
import { RTCView, mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://15.164.74.145:5001', { transports: ['websocket'] });

const configuration = {
    iceServers: [
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ],
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
        const initializeScreen = async () => {
            try {
                // 권한 요청
                await requestPermissions();

                // 소켓 연결 상태 확인
                if (!socket.connected) {
                    socket.connect();
                    console.log('Socket connected');
                }

                // route.params에서 roomId와 userId 가져오기
                if (route.params) {
                    const { receivedRequestUserId, sendingRequestUserId } = route.params;
                    setRoomId(receivedRequestUserId || ''); // 룸 ID 설정
                    setUserId(sendingRequestUserId || ''); // 유저 ID 설정
                    console.log(`Room ID: ${receivedRequestUserId}, User ID: ${sendingRequestUserId}`);
                }

                // 로컬 미디어 스트림 시작
                const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
            } catch (error) {
                Alert.alert('Initialization Error', error.message || 'Failed to initialize Camera Screen.');
            }
        };

        initializeScreen();

        return () => {
            socket.disconnect();
            if (localStream) { localStream.getTracks().forEach((track) => track.stop()); }
            if (remoteStream) { remoteStream.getTracks().forEach((track) => track.stop()); }
        };
    }, []);

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
        };
    }, []);

    const requestPermissions = async () => {
        try {
            if (Platform.OS === 'android') {
                const permissions = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ]);

                if (
                    permissions['android.permission.CAMERA'] !== PermissionsAndroid.RESULTS.GRANTED ||
                    permissions['android.permission.RECORD_AUDIO'] !== PermissionsAndroid.RESULTS.GRANTED
                ) {
                    console.error('Camera or audio permissions not granted');
                    Alert.alert(
                        'Permission Denied',
                        'Camera and Microphone permissions are required. Please enable them in your device settings.',
                    );
                    throw new Error('Camera and Microphone permissions not granted');
                }
            } else {
                console.log('Permissions not required for iOS');
            }
        } catch (error) {
            console.error('Permission error:', error.message);
            throw error; // 초기화 중단
        }
    };

    const handleCreateRoom = async () => {
        if (!userId) {
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) {
                    console.error('Token not found in AsyncStorage');
                    return;
                }

                const response = await axios.get('http://15.164.74.145:3000/api/users', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.data && response.data.userId) {
                    setUserId(response.data.userId);
                    console.log('Fetched User ID:', response.data.userId);
                } else {
                    console.error('User ID not found in response');
                }
            } catch (error) {
                console.error('Error fetching user info:', error.message);
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
                    if (!token) {
                        console.error('Token not found in AsyncStorage');
                        return;
                    }

                    const apiResponse = await axios.put(
                        `http://15.164.74.145:3000/api/users/${userId}`,
                        { isStudy: true },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );

                    if (apiResponse.status === 200) {
                        console.log('Success Creating room');
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

    // Offer 생성 및 전송
    const createOffer = async (pc) => {
        try {
            console.log('Creating WebRTC Offer...');
            console.log('PeerConnection state before offer:', pc.connectionState);
            const offer = await pc.createOffer();
            console.log('Offer created:', offer);


            console.log("-----------------------------\n");

            if (!offer || !offer.sdp) {
                console.error('Invalid offer received:', offer);
                return;
            }            

            if (offer && offer.sdp) {
                // setLocalDescription 호출
               //await pc.setLocalDescription(offer); // 여기서 오류가 잇는듯...


                console.log("-----------------------------\n");

                console.log('Local description set:', offer);

                // 서버로 Offer 전송
                console.log('Sending WebRTC Offer to server:', { roomId, sdp: offer });
                socket.emit('webrtc_offer', { roomId, sdp: offer });

                // 서버로부터 응답을 기다리고, 그 응답을 setRemoteDescription에 적용
                socket.on('webrtc_answer', async (data) => {
                    console.log('Received Answer from server:', data);
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                        console.log('Remote description set for Answer:', data.sdp);
                    }
                });

                console.log('PeerConnection state after sending offer:', pc.connectionState);
            } else {
                console.error('Offer creation failed or invalid offer.');
            }
        } catch (error) {
            console.error('Error creating WebRTC Offer:', error);
            Alert.alert('Error', 'Failed to create offer.');
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE Candidate:', event.candidate);
                socket.emit('webrtc_ice_candidate', { roomId, candidate: event.candidate });
            } else {
                console.log('ICE Candidate gathering complete.');
            }
        };
    };


    const handleReceiveAnswer = async (data) => {
        try {
            console.log('Received Answer from server:', data);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                console.log('Remote description set for Answer:', data.sdp);
            }
        } catch (error) {
            console.error('Error handling Answer:', error.message);
        }
    };

    const handleNewICECandidate = (event) => {
        if (event.candidate) {
            console.log('Sending ICE Candidate to server:', event.candidate);
            socket.emit('webrtc_ice_candidate', { roomId, candidate: event.candidate });
        }
    };

    const handleJoinRoom = async () => {
        if (!roomId) {
            Alert.alert('Error', 'Room ID is required to join a room.');
            return;
        }

        try {
            console.log(`Joining Room: ${roomId}`);
            // 로컬 미디어 스트림 가져오기
            console.log('Requesting local media stream...');
            const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            console.log('Local stream acquired:', stream);

            // WebRTC PeerConnection 생성
            console.log('Creating RTCPeerConnection...');
            const pc = new RTCPeerConnection(configuration);
            console.log('RTCPeerConnection created:', pc);

            // 이벤트 리스너 설정
            pc.onicecandidate = (event) => {
                console.log('ICE Candidate received:', event.candidate);
                if (event.candidate) {
                    console.log('Sending ICE Candidate:', event.candidate);
                    socket.emit('webrtc_ice_candidate', { roomId, candidate: event.candidate });
                } else {
                    console.log('ICE Candidate gathering complete.');
                }
            };

            pc.ontrack = (event) => {
                console.log('Remote track received:', event.streams[0]);
                setRemoteStream(event.streams[0]);
            };

            pc.onconnectionstatechange = () => {
                console.log('PeerConnection state changed:', pc.connectionState);
            };

            pc.oniceconnectionstatechange = () => {
                console.log('ICE Connection state changed:', pc.iceConnectionState);
            };

            // 로컬 트랙 추가
            stream.getTracks().forEach((track) => {
                console.log('Adding track to PeerConnection:', track);
                pc.addTrack(track, stream);
            });

            // PeerConnection 상태 저장
            setPeerConnection(pc);

            // 방 참여 요청
            console.log(`Sending join request to server for Room ID: ${roomId}`);
            socket.emit('join', roomId);

            // 서버 응답 처리
            socket.on('room_status', (data) => {
                console.log('Room status received from server:', data);
                if (data.message === 'Joined room successfully') {
                    console.log('Successfully joined room:', roomId);
                    createOffer(pc); // WebRTC Offer 생성 및 전송
                } else {
                    console.error('Error joining room:', data.message);
                    Alert.alert('Room Join Error', data.message);
                }
            });
        } catch (error) {
            console.error('Error joining room:', error.message);
            Alert.alert('Error', 'Failed to join the room.');
        }
    };

    const handleLeaveRoom = () => {
        // 방을 떠나기 위한 처리
        console.log('Leaving room...');
        socket.emit('leave', roomId); // 서버에 'leave' 이벤트 전송

        // 로컬 상태 초기화
        setRoomId('');  // 방 ID 초기화
        setRemoteStream(null);  // 원격 스트림 초기화
        setPeerConnection(null);  // 피어 연결 초기화
        setLocalStream(null);  // 로컬 스트림 초기화

        console.log('Left the room');
    };




    return (
        <View style={styles.container}>
            <Text>{connectionStatus}</Text>
            {/* Create Room 버튼은 roomId가 있을 때만 숨겨짐 */}
            {!roomId && (
                <Button title="Create Room" onPress={handleCreateRoom} />
            )}
            {roomId && userId ? (
                <>
                    <Button title="Join Room" onPress={handleJoinRoom} />
                    <Button title="Leave Room" onPress={handleLeaveRoom} />
                </>
            ) : (
                <Text style={styles.warningText}>Room ID and User ID are required to join a room.</Text>
            )}
            <Text>{serverResponse}</Text>
            <View style={styles.videoContainer}>
                {remoteStream ? (
                    <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} />
                ) : (
                    <Text>Waiting for remote stream...</Text>
                )}
                {localStream && (
                    <RTCView streamURL={localStream.toURL()} style={styles.localVideo} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
    },
    videoContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        height: '50%',
    },
    localVideo: {
        width: '90%',
        height: '40%',
        backgroundColor: 'black',
        marginBottom: 20,
    },
    remoteVideo: {
        width: '90%',
        height: '40%',
        backgroundColor: 'gray',
    },
    warningText: {
        color: 'red',
        marginTop: 10,
        fontSize: 14,
    },
});

export default CameraScreen;
