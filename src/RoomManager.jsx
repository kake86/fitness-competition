import React, { useState } from 'react';
import './RoomManager.css';

function RoomManager({ onJoinRoom, currentRoomId, onLeaveRoom }) {
  const [roomId, setRoomId] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const handleCreateRoom = () => {
    // Generate a random room ID
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onJoinRoom(newRoomId);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      onJoinRoom(roomId.trim().toUpperCase());
      setRoomId('');
      setShowJoin(false);
    }
  };

  if (currentRoomId) {
    return (
      <div className="room-manager">
        <div className="room-info">
          <span className="room-label">Room:</span>
          <span className="room-id">{currentRoomId}</span>
          <button className="leave-room-button" onClick={onLeaveRoom}>
            Leave Room
          </button>
        </div>
        <div className="room-share">
          <p className="share-instructions">
            Share this room code with your friend: <strong>{currentRoomId}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="room-manager">
      <div className="room-setup">
        <h3>Connect with Friend</h3>
        <p>Create a room or join an existing one to sync data in real-time</p>
        
        <div className="room-actions">
          <button className="create-room-button" onClick={handleCreateRoom}>
            Create New Room
          </button>
          <button 
            className="join-room-button" 
            onClick={() => setShowJoin(!showJoin)}
          >
            Join Existing Room
          </button>
        </div>

        {showJoin && (
          <div className="join-room-form">
            <input
              type="text"
              placeholder="Enter room code"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
              className="room-input"
              maxLength={6}
            />
            <button className="join-submit-button" onClick={handleJoinRoom}>
              Join
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomManager;
