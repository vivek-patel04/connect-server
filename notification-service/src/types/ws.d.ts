import "ws";

declare module "ws" {
    interface WebSocket {
        userID?: string;
    }
}
