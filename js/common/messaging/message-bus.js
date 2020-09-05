import { MessageType } from "./message-type";

class MessageBugSingleton{
    constructor(){
        this.subs = new Array(Object.keys(MessageType).length).fill(0).map(x => []);
    }

    subscribe(msgType, callback){
        this.subs[msgType].push(callback)
    }

    listen(msgType, owner, callback){
        this.subs[msgType].push(owner);
    }

    post(msgType, data){
        let i = this.subs[msgType].length;
        while(i--) this.subs[msgType][i](data);
    }
}

export const MessageBus = new MessageBugSingleton();