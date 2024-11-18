import React, { useEffect, useState } from 'react';
import { View, Button, PermissionsAndroid, StyleSheet, Platform, Text } from 'react-native';
import { RTCView, mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import axios from 'axios';

// Signaling 서버 URL
const socket = io('http://43.202.203.36:5001', { transports: ['websocket'] });

// WebRTC Configuration
const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const CameraScreen = () => {
    const [localStream, setLocalStream] = useState(null); // 로컬 스트림
    const [remoteStream, setRemoteStream] = useState(null); // 원격 스트림
    const [peerConnection, setPeerConnection] = useState(null); // PeerConnection 객체
    const [roomId, setRoomId] = useState(''); // 방 ID
    const [userId, setUserId] = useState(''); // 유저 ID
    const [isRecording, setIsRecording] = useState(false); // 녹화 여부
    const [serverResponse, setServerResponse] = useState(''); // 서버 응답 메시지
    const [connectionStatus, setConnectionStatus] = useState(''); // 소켓 연결 상태

    useEffect(() => {
        // 권한 요청 및 유저 정보 가져오기
        requestPermissions();
        fetchUserInfo();

        // 소켓 이벤트 설정
        setupSocketListeners();

        return () => {
            // 컴포넌트 언마운트 시 리소스 정리
            if (peerConnection) peerConnection.close();
            if (localStream) localStream.getTracks().forEach((track) => track.stop());
            if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop());
            socket.disconnect();
        };
    }, []);

    // 권한 요청 함수
    const requestPermissions = async () => {
        try {
            if (Platform.OS === 'android') {
                await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ]);
            } else {
                console.log('iOS 권한은 Info.plist에서 설정됩니다.');
            }
        } catch (error) {
            console.warn('Permission error:', error);
        }
    };

    // 유저 정보를 가져오는 함수
    const fetchUserInfo = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('Token not found in AsyncStorage');
                return;
            }

            const response = await axios.get('http://43.202.203.36:3000/api/users', {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`, // Bearer 토큰 추가
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
    };

    // 소켓 이벤트 설정
    const setupSocketListeners = () => {
        // 소켓 연결 확인
        socket.on('connection_success', (data) => {
            console.log('Connection Success:', data);
            setConnectionStatus(`Connected: ${data.message}`);
        });

        // 방 상태 메시지 수신
        socket.on('room_status', (data) => {
            console.log('Room Status:', data.message);
            setServerResponse(data.message);
        });

        // WebRTC 관련 이벤트
        socket.on('webrtc_offer', handleReceiveOffer);
        socket.on('webrtc_answer', handleReceiveAnswer);
        socket.on('webrtc_ice_candidate', handleNewICECandidateMsg);

        // 이벤트 해제
        return () => {
            socket.off('connection_success');
            socket.off('room_status');
            socket.off('webrtc_offer');
            socket.off('webrtc_answer');
            socket.off('webrtc_ice_candidate');
        };
    };

    // Start Recording 버튼 클릭 시 호출
    const handleStartRecording = async () => {
        if (!userId) {
            console.error('유저 ID가 없습니다. 로그인을 확인하세요.');
            setServerResponse('로그인이 필요합니다.');
            return;
        }

        setRoomId(userId); // 방 ID를 유저 ID로 설정
        console.log('Room ID set to:', userId);

        // WebRTC 초기화 및 로컬 스트림 시작
        await startLocalStream();

        // 방 정보를 서버로 전송
        const roomInfo = { roomId: userId, userId };
        socket.emit('create_room', roomInfo, (response) => {
            if (response.status === 'success') {
                console.log('방 생성 성공:', response);
                setServerResponse(`방 생성 성공: ${response.roomId}`);
                setIsRecording(true); // 녹화 상태로 전환
            } else {
                console.error('방 생성 실패:', response);
                setServerResponse(`방 생성 실패: ${response.error}`);
            }
        });
    };

    // 로컬 스트림 시작
    const startLocalStream = async () => {
        const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
        setLocalStream(stream);
        console.log('Local stream started');
    };

    // WebRTC PeerConnection 생성
    const createPeerConnection = () => {
        const pc = new RTCPeerConnection(configuration);

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

    // 서버로부터 Offer 수신 처리
    const handleReceiveOffer = async (sdp) => {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { roomId, sdp: answer });
    };

    // 서버로부터 Answer 수신 처리
    const handleReceiveAnswer = async (sdp) => {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        }
    };

    // ICE Candidate 수신 처리
    const handleNewICECandidateMsg = async ({ candidate }) => {
        if (peerConnection) {
            const iceCandidate = new RTCIceCandidate(candidate);
            await peerConnection.addIceCandidate(iceCandidate);
        }
    };

    return (
        <View style={styles.container}>
            <Text>{connectionStatus}</Text> {/* 소켓 연결 상태 표시 */}
            {isRecording ? (
                <>
                    <Text>{serverResponse}</Text>
                    {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} />}
                    {localStream && <RTCView streamURL={localStream.toURL()} style={styles.localVideo} mirror />}
                </>
            ) : (
                <Button title="Start Recording" onPress={handleStartRecording} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    remoteVideo: { width: '100%', height: '60%', marginBottom: 10 },
    localVideo: { width: 100, height: 150, position: 'absolute', bottom: 10, right: 10 },
});

export default CameraScreen;
