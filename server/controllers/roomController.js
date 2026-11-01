import Room from "../models/Room.js";

export async function getActiveRooms(req, res) {
    try{
        const rooms = await Room.find({active: true}).sort({roomNumber: 1});
        res.json(rooms);
    }catch(error){
        console.error("Error fetching rooms",error);
        res.status(500).json({message: "Error fetching rooms"});
    }
}

export async function getRoomById(req, res) {
    try{
        const room = await Room.findById(req.params.id);
        if(!room){
            return res.status(404).json({message: "Room not found"});
        }
        res.json(room);
    }catch(error){
        console.error("Error fetching room",error);
        res.status(500).json({message: "Error fetching room"});
    }
}