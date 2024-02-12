import { Socket } from "socket.io";
import { v4 as uuidV4 } from "uuid";

const rooms: Record<string, Record<string, IUser>> = {};
const chats: Record<string, IMessage[]> = {};
interface IUser {
    peerId: string;
    userName: string;
    microPhoneEnabled: boolean;

}
interface IRoomParams {
    roomId: string;
    peerId: string;
}
interface IJoinRoomParams extends IRoomParams {
    userName: string;
    microPhoneEnabled: boolean;
}
interface IMessage {
    content: string;
    author: string;
    timestamp: string;
}
export const roomHandler = (socket: Socket) => {
    const createRoom = () => {
        const roomId = uuidV4();
        rooms[roomId] = {};
        chats[roomId] = [];
        socket.emit("room-created", { roomId });
        console.log("user created the room");
    };
    const joinRoom = ({ roomId, peerId, userName, microPhoneEnabled }: IJoinRoomParams) => {
        if (!rooms[roomId]) rooms[roomId] = {};
        console.log("user joined the room", roomId, peerId, userName);
        rooms[roomId][peerId] = { peerId, userName, microPhoneEnabled }
        socket.join(roomId);
        socket.to(roomId).emit("user-joined", { peerId, userName, microPhoneEnabled });
        socket.emit("get-users", {
            roomId,
            participants: rooms[roomId],
        });

        socket.on("disconnect", () => {
            console.log("user left the room", peerId);
            leaveRoom({ roomId, peerId });
        });
    };

    const toggleMicrophone = ({ roomId, peerId }: IRoomParams) => {
        const user = rooms[roomId][peerId];
        if (user) {
            user.microPhoneEnabled = !user.microPhoneEnabled;
            rooms[roomId][peerId] = user;
            socket.to(roomId).emit("microphone-toggled", { peerId, microPhoneEnabled: user.microPhoneEnabled });
            socket.emit("get-users", {
                roomId,
                participants: rooms[roomId],
            });
        }
    };

    const leaveRoom = ({ peerId, roomId }: IRoomParams) => {
        // rooms[roomId] = rooms[roomId]?.filter((id) => id !== peerId);
        socket.to(roomId).emit("user-disconnected", peerId);
    };

    const startSharing = ({ peerId, roomId }: IRoomParams) => {
        console.log({ roomId, peerId });
        socket.to(roomId).emit("user-started-sharing", peerId);
    };

    const stopSharing = (roomId: string) => {
        socket.to(roomId).emit("user-stopped-sharing");
    };

    const addMessage = (roomId: string, message: IMessage) => {
        if (chats[roomId]) {
            chats[roomId].push(message);
        } else {
            chats[roomId] = [message];
        }
        console.log("send message back", chats[roomId]);
        socket.to(roomId).emit("add-message", message);
    };
    socket.on("create-room", createRoom);
    socket.on("join-room", joinRoom);
    socket.on("start-sharing", startSharing);
    socket.on("stop-sharing", stopSharing);
    socket.on("send-message", addMessage);
    socket.on("toggle-microphone", toggleMicrophone);
};
