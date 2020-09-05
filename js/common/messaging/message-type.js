export const MessageType = {
    GAME_INIT: 0,
    RENDERER_READY: 0,
    PLAYER_ADDED: 0,
    ASSET_DOWNLOADED: 0,

    //INPUT
    MOVE_LEFT: 0,
    MOVE_RIGHT: 0,
    MOVE_UP: 0,
    MOVE_DOWN: 0
}

Object.keys(MessageType).forEach((k, i) => MessageType[k] = i);