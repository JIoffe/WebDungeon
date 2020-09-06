import { MessageBus } from "../messaging/message-bus";
import { MessageType } from "../messaging/message-type";
import { Animations } from "../rendering/animation";
import { Input } from "../input/input";
import { Camera } from "../camera";
import { vec3, quat } from "gl-matrix";
import { VEC3_TEMP, RadToDeg, VEC3_UP, DegToRad } from "../math";
import { PlayerState } from "./player-state";

const PLAYER_SPEED = 0.04;
const PLAYER_SLERP_SPEED = 0.2;

const cameraOffset = vec3.fromValues(0, 40, 60);

export class Scene{
    constructor(){
        this.players = [];
        this.localPlayer = null;
        this.mainCamera = new Camera();

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
        this.localPlayer = player;
    }

    update(time, dT){
        if(!!this.localPlayer){
            const velocityX = Input.axisH;
            const velocityY = Input.axisV;

            this.localPlayer.pos[0] += dT * Input.axisH * PLAYER_SPEED;
            this.localPlayer.pos[2] -= dT * Input.axisV * PLAYER_SPEED;

            if(!!velocityX || !!velocityY){
                const angle = Math.atan2(velocityY, velocityX) + 1.5707963267948966;
                quat.setAxisAngle(this.localPlayer.rot, VEC3_UP, angle);
                this.localPlayer.state = PlayerState.RUNNING;
            }else{
                this.localPlayer.state = PlayerState.IDLE;
            }

            quat.slerp(this.localPlayer.rRot, this.localPlayer.rRot, this.localPlayer.rot, PLAYER_SLERP_SPEED);

            if(this.localPlayer.prevState !== this.localPlayer.state){
                switch(this.localPlayer.state){
                    case PlayerState.RUNNING:
                        this.localPlayer.anim.set('Running');
                        break;
                    default:
                        this.localPlayer.anim.set('Idle');
                        break;
                }
                this.localPlayer.prevState = this.localPlayer.state;
            }

            //Update camera
            vec3.add(this.mainCamera.pos, this.localPlayer.pos, cameraOffset);
            vec3.copy(this.mainCamera.lookat, this.localPlayer.pos);
        }
    }
}