export const MessageType = {
    GAME_INIT: 0,
    RENDERER_READY: 0,
    PLAYER_ADDED: 0,
    ASSET_DOWNLOADED: 0
}

Object.keys(MessageType).forEach((k, i) => MessageType[k] = i);