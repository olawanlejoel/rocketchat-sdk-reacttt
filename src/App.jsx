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
  const [loggedIn, setLoggedIn] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState({
    username: 'funke.test',
    password: 'hola',
  });

  const loginUser = async (username, password) => {
    await sdk.connection.connect();
    await sdk.account.loginWithPassword(username, await hashPassword(password));
    setLoggedIn(true);

    const userDetails = sdk.account.user;
    console.log(userDetails);

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
    const channelMessages = await sdk.rest.get(
      '/v1/channels.history', { roomId: rid }
    );

    setMessages(channelMessages.messages);
  };

  const logoutUser = async () => {
    await sdk.account.logout();
    setLoggedIn(false);
  };

  return (
    <div>
      {loggedIn ? (
        <button onClick={logoutUser}>Logout</button>
      ) : (
        <button
          onClick={() => {
            loginUser(user.username, user.password);
          }}
        >
          Login
        </button>
      )}

      <div>
        <h1>Rooms</h1>
        <ul>
          {rooms.map((room) => (
            <li key={room.rid} onClick={() => fetchRoomData(room.rid)}>
              {room.name}
            </li>
          ))}
        </ul>
        <h1>Messages</h1>
        <ul>
          {[...messages.values()].map((message) => (
            <li key={message._id}>{message.msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
