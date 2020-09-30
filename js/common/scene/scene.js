import { MessageBus } from "../messaging/message-bus";
import { MessageType } from "../messaging/message-type";
import { Animations } from "../rendering/animation";
import { Input } from "../input/input";
import { Camera } from "../camera";
import { vec3, quat } from "gl-matrix";
import { VEC3_TEMP, RadToDeg, VEC3_UP, DegToRad } from "../math";
import { PlayerState } from "./player-state";
import { ARM_PLAYER } from "../constants/armatures";
import { ActorFactory } from "../actors/actor-factory";

const PLAYER_SPEED = 0.04;
const PLAYER_SLERP_SPEED = 0.3;

const cameraOffset = vec3.fromValues(0, 40, 60);

export class Scene{
    constructor(){
        this.players = [];
        this.actors = [];

        this.localPlayer = null;
        this.mainCamera = new Camera();

        MessageBus.subscribe(MessageType.PLAYER_ADDED, data => this.onPlayerAdded(data))
        MessageBus.subscribe(MessageType.ACTOR_ADDED, data => this.onActorAdded(data));
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
        player.anim = Animations.getInstance(ARM_PLAYER);
        player.anim.set('Idle', 0.02);

        this.players.push(player);
        this.localPlayer = player;

        this.cameraToPlayer(player);
    }

    onActorAdded(...data){
        if(!data)
            return;

        data.forEach(actorDef => this.actors.push(ActorFactory.create(actorDef)));
    }

    update(time, dT){
        if(!!this.localPlayer){
            switch(this.localPlayer.state){
                case PlayerState.MATTACK:
                {
                    if(!this.localPlayer.anim.isPlaying)
                        this.localPlayer.state = PlayerState.IDLE;
                    break;
                }

                case PlayerState.IDLE:
                case PlayerState.RUNNING:
                default: 
                {
                    if(Input.state[4]){
                        this.localPlayer.state = PlayerState.MATTACK;
                    }else{
                        const velocityX = Input.axisH;
                        const velocityY = Input.axisV;
            
                        this.localPlayer.pos[0] += dT * Input.axisH * PLAYER_SPEED;
                        this.localPlayer.pos[2] -= dT * Input.axisV * PLAYER_SPEED;
            
                        if(!!velocityX || !!velocityY){
                            const angle = Math.atan2(velocityY, velocityX) + 1.5707963267948966;
                            quat.setAxisAngle(this.localPlayer.rot, VEC3_UP, angle);
                            quat.slerp(this.localPlayer.rRot, this.localPlayer.rRot, this.localPlayer.rot, PLAYER_SLERP_SPEED);
                            this.localPlayer.state = PlayerState.RUNNING;
                            this.cameraToPlayer(this.localPlayer);
                        }else{
                            this.localPlayer.state = PlayerState.IDLE;
                        }       
                    }             
                    break;
                }
            }

            //Update animation based on state change
            if(this.localPlayer.prevState !== this.localPlayer.state){
                switch(this.localPlayer.state){
                    case PlayerState.RUNNING:
                        this.localPlayer.anim.set('Running', 0.02);
                        break;
                    case PlayerState.MATTACK:
                        this.localPlayer.anim.set('Attack_Slash_R', 0.04);
                        break;
                    default:
                        this.localPlayer.anim.set('Idle', 0.02);
                        break;
                }
                this.localPlayer.prevState = this.localPlayer.state;
            }

            //Loop or one shot animation as appropriate
            switch(this.localPlayer.state){
                case PlayerState.MATTACK:
                    this.localPlayer.anim.play(dT);
                    break;
                default:
                    this.localPlayer.anim.loop(dT);
                    break;

            }
        }
    }

    validatePosition(pos, delta){
        
    }

    cameraToPlayer(player){
        vec3.add(this.mainCamera.pos, player.pos, cameraOffset);
        vec3.copy(this.mainCamera.lookat, player.pos);
    }
}