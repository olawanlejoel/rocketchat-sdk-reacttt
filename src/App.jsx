import { DDPSDK } from '@rocket.chat/ddp-client';

import { useState, useEffect } from 'react';

const sdk = DDPSDK.create('https://writing-demo.dev.rocket.chat');

async function hashPassword(password) {
  // Step 1: Convert the input string to a Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Step 2: Use the SubtleCrypto API to create a hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Step 3: Convert the hash buffer to a hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  // Step 4: Return the hashed string
  return hashHex;
}

const App = () => {
  // State for login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // State for chat
  const [loggedIn, setLoggedIn] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  const loginUser = async (e) => {
    e.preventDefault();
    await sdk.connection.connect();
    await sdk.account.loginWithPassword(username, await hashPassword(password));
    setLoggedIn(true);

    setUsername('');
    setPassword('');

    fetchRooms();
  };

  const fetchRooms = async () => {
    const rooms = await sdk.rest.get('/v1/subscriptions.get');
    console.log(rooms.update);
    setRooms(rooms.update);
  };

  useEffect(() => {
    return sdk.stream('room-messages', roomId, (args) => {
      setMessages((messages) => {
        messages.set(args._id, args);
        return new Map(messages);
      });
    }).stop;
  }, [roomId]);

  const fetchRoomData = async (rid) => {
    setRoomId(rid);
    setSelectedRoom(rid);
    const channelMessages = await sdk.rest.get(
      '/v1/channels.history', { roomId: rid }
    );

    setMessages(channelMessages.messages);
  };

  const logoutUser = async () => {
    await sdk.account.logout();
    setLoggedIn(false);
  };

  // Format ISO date
  const formatIsoDate = (isoDate) => {
    const date = new Date(isoDate);
    // format for chat time, remove seconds
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    await sdk.rest.post('/v1/chat.sendMessage', {
      message: {
        rid: roomId,
        msg: messageInput
      }
    });

    setMessageInput('');
  }

  return (
    <div className="container">
      <div className="title-section">
        <h1>React-RocketChat</h1>
        <p>Rocket.Chat client using React and WebSockets</p>
      </div>
      {!loggedIn ? (
        <form onSubmit={loginUser} className="login-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Login</button>
        </form>
      ) : (
        <div className="flex-chat-section">
          <div className="rooms">
            <h2>Rooms</h2>
            <hr />
            <ul>
              {rooms.map((room) => (
                <li
                  key={room._id}
                  onClick={() => fetchRoomData(room.rid)}
                  className={selectedRoom === room.rid ? 'selected' : ''}
                >
                  {room.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="messages">
            {selectedRoom ? (
              <div className="messages-col">
                <ul className="messages-container">
                  {[...messages.values()].map((message) => (
                    <li key={message._id} className="box">
                      <div className="message">
                        <p className="user">
                          {message.u.name} - {formatIsoDate(message.ts)}
                        </p>
                        <p className="text">{message.msg}</p>
                      </div>
                    </li>
                  ))}

                </ul>
                <div className="form">
                  <textarea
                    placeholder="Type your message here..."
                    rows="2"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                  ></textarea>
                  <button
                    onClick={sendChatMessage}
                    className="send-button"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <p className="load-message-alert">
                Select a room to start chatting!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
