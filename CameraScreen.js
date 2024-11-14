import React, { useEffect, useState } from 'react';
import { View, Button, PermissionsAndroid, StyleSheet } from 'react-native';
import { RTCView, mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import io from 'socket.io-client';

const socket = io('http://43.202.203.36:5001', { transports: ['websocket'] }); // 시그널링 서버 주소 및 websocket 사용 설정

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

const CameraScreen = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [roomId, setRoomId] = useState('test-room'); // 임의의 방 ID 설정
  const [isRecording, setIsRecording] = useState(false); // 녹화 시작 여부

  useEffect(() => {
    requestPermissions();
    setupSocketListeners();
  }, []);

  const requestPermissions = async () => {
    try {
      // 카메라와 오디오 권한을 요청
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
    } catch (error) {
      console.warn('Permission error:', error);
    }
  };

  const setupSocketListeners = () => {
    socket.on('connect', () => {
      console.log('Connected to signaling server');
      socket.emit('join', roomId); // 방에 참여 요청
    });

    socket.on('room_created', () => {
      console.log('Room created:', roomId);
    });

    socket.on('room_joined', () => {
      console.log('Joined room:', roomId);
      startCall();
    });

    socket.on('webrtc_offer', handleReceiveOffer);
    socket.on('webrtc_answer', handleReceiveAnswer);
    socket.on('webrtc_ice_candidate', handleNewICECandidateMsg);
  };

  const startLocalStream = async () => {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setLocalStream(stream);
    sendLogToServer('Local stream started');
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate');
        socket.emit('webrtc_ice_candidate', { roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log('Remote stream received');
      setRemoteStream(event.streams[0]);
    };

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    setPeerConnection(pc);
    return pc;
  };

  const startCall = async () => {
    const pc = createPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(new RTCSessionDescription(offer));

    console.log('Sending offer:', offer); // Offer 생성 확인
    socket.emit('webrtc_offer', { roomId, sdp: offer });
    console.log('Offer sent to server'); // Offer 서버 전송 확인
    sendLogToServer('Call started');
  };

  const handleReceiveOffer = async (sdp) => {
    const pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(new RTCSessionDescription(answer));

    console.log('Sending answer');
    socket.emit('webrtc_answer', { roomId, sdp: answer });
  };

  const handleReceiveAnswer = async (sdp) => {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log('Remote description set with answer');
    }
  };

  const handleNewICECandidateMsg = async ({ candidate }) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    if (peerConnection) {
      await peerConnection.addIceCandidate(iceCandidate);
      console.log('Added ICE candidate');
    }
  };

  const sendLogToServer = (logMessage) => {
    console.log(logMessage); // 로컬에서 로그 출력
    socket.emit('log', { message: logMessage, roomId }); // 서버로 로그 전송
  };

  const startRecording = () => {
    setIsRecording(true);
    startLocalStream();
  };

  return (
    <View style={styles.container}>
      {isRecording ? (
        <>
          {/* 상대방 화면 (상단에 배치) */}
          {remoteStream && (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
            />
          )}
          {/* 로컬 화면 (하단에 배치) */}
          {localStream && (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              mirror={true} // 좌우반전 처리
            />
          )}
        </>
      ) : (
        <Button title="Start Recording" onPress={startRecording} />
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
  remoteVideo: {
    width: '100%',
    height: '60%',
    marginBottom: 10,
  },
  localVideo: {
    width: 100,
    height: 150,
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
});

export default CameraScreen;
