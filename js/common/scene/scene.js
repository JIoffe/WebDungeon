import { MessageBus } from "../messaging/message-bus";
import { MessageType } from "../messaging/message-type";
import { Animations } from "../rendering/animation";

export class Scene{
    constructor(){
        this.players = [];

        MessageBus.subscribe(MessageType.PLAYER_ADDED, data => this.onPlayerAdded(data))
    }

    /* 
        PLAYER SCHEMA:
        {
            "nickname": string,
            //0 - HEAD
            //1 - TORSO
            //2 - LEGS
            //3 - HANDS
            "gear": []
        }
    */
    onPlayerAdded(data){
        const player = {...data}
        player.anim = Animations.getInstance('ARM_PLAYER');
        player.anim.set('Idle');

        this.players.push(player);
    }
}