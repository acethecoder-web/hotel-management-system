import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { fetchRooms,fetchRoomById } from "./services/roomService";

fetchRooms().then(console.log).catch(console.error);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
