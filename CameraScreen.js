import React, { useEffect, useState } from 'react';
import { View, Button, PermissionsAndroid, StyleSheet, Platform } from 'react-native';
import { RTCView, mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import io from 'socket.io-client';

const socket = io('http://43.202.203.36:5001', { transports: ['websocket'] });

const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const CameraScreen = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [roomId, setRoomId] = useState('test-room');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    requestPermissions();
    startLocalStream().then(() => {
      setupSocketListeners();
      socket.emit('join', roomId);
    });

    return () => {
      if (peerConnection) peerConnection.close();
      if (localStream) localStream.getTracks().forEach((track) => track.stop());
      if (remoteStream) remoteStream.getTracks().forEach((track) => track.stop());
      socket.disconnect();
    };
  }, []);

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

  const startLocalStream = async () => {
    const stream = await mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStream(stream);
    console.log('Local stream started');
  };

  const setupSocketListeners = () => {
    socket.on('connect', () => console.log('Connected to signaling server'));
    socket.on('room_created', () => console.log('Room created:', roomId));
    socket.on('room_joined', () => startCall());
    socket.on('webrtc_offer', handleReceiveOffer);
    socket.on('webrtc_answer', handleReceiveAnswer);
    socket.on('webrtc_ice_candidate', handleNewICECandidateMsg);
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(configuration);
    pc.onicecandidate = (event) => event.candidate && socket.emit('webrtc_ice_candidate', { roomId, candidate: event.candidate });
    pc.ontrack = (event) => setRemoteStream(event.streams[0]);
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    setPeerConnection(pc);
    return pc;
  };

  const startCall = async () => {
    const pc = createPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc_offer', { roomId, sdp: offer });
  };

  const handleReceiveOffer = async (sdp) => {
    const pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc_answer', { roomId, sdp: answer });
  };

  const handleReceiveAnswer = async (sdp) => {
    peerConnection && (await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp)));
  };

  const handleNewICECandidateMsg = async ({ candidate }) => {
    const iceCandidate = new RTCIceCandidate(candidate);
    peerConnection && (await peerConnection.addIceCandidate(iceCandidate));
  };

  return (
    <View style={styles.container}>
      {isRecording ? (
        <>
          {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} />}
          {localStream && <RTCView streamURL={localStream.toURL()} style={styles.localVideo} mirror />}
        </>
      ) : (
        <Button title="Start Recording" onPress={() => setIsRecording(true)} />
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
