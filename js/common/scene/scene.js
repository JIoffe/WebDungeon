import { MessageBus } from "../messaging/message-bus";
import { MessageType } from "../messaging/message-type";
import { Animations } from "../rendering/animation";
import { Input } from "../input/input";
import { Camera } from "../camera";
import { vec3, quat } from "gl-matrix";
import { VEC3_TEMP, RadToDeg, DegToRad } from "../math";
import { PlayerState } from "./player-state";
import { ARM_PLAYER } from "../constants/armatures";
import { ActorFactory } from "../actors/actor-factory";

const PLAYER_SPEED = 0.04;
const PLAYER_SLERP_SPEED = 0.3;
const PLAYER_RADIUS = 8;

const cameraOffset = vec3.fromValues(0, 100, 60);
const VEC3_UP = new Float32Array([0,1,0]);

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

    onActorAdded(data){
        if(!data)
            return;

        data.forEach(actorDef => this.actors.push(ActorFactory.create(actorDef)));
        console.log(`Added ${data.length} actor(s)`);
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
                        let velX = Input.axisH,
                            velY = Input.axisV;
            
                        if(!!velX || !!velY){
                            //Normalize
                            const w = 1/Math.sqrt(velX*velX + velY*velY);
                            velX *= w;
                            velY *= w;

                            this.move(this.localPlayer.pos, dT * velX * PLAYER_SPEED, -dT * velY * PLAYER_SPEED, PLAYER_RADIUS);

                            const angle = Math.atan2(velY, velX) + 1.5707963267948966;
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

        let i = this.actors.length;
        while(i--){
            this.actors[i].update(this, time, dT);
        }
    }

    /**
     * Updates vec3 position and ideal delta with best possible position. Assumes radius is smaller than tile size
     * @param {vec3} pos - position [x,y,z]
     * @param {number} dx - delta x
     * @param {number} dy - delta y (horizontal plane)
     * @param {number} r - collision radius
     */
    move(pos,dx,dy,r){
        //let a,b,c be scan points
        //Check Y and X axes separately
        let a = (pos[0] - r) >> 5,
            b = (pos[0] + r) >> 5,
            c = (pos[2] + dy + (dy > 0 ? r : -r)) >> 5

        let i = a + c * this.level.w
        if(this.level.tiles[i] !== 0 || (a !== b && this.level.tiles[i+1] !== 0))
            dy = 0;

        a = (pos[2] - r) >> 5
        b = (pos[2] + r) >> 5
        c = (pos[0] + dx + (dx > 0 ? r : -r)) >> 5

        i = c + a * this.level.w
        if(this.level.tiles[i] !== 0 || (a !== b && this.level.tiles[i+this.level.w] !== 0))
            dx = 0;

        pos[0] += dx
        pos[2] += dy
    }

    /**
     * Scans for a hit against the level grid against a circle at x,y with radius r
     * @param {number} x 
     * @param {number} y 
     * @param {number} r 
     */
    scanGrid(x,y,r){

    }

    cameraToPlayer(player){
        vec3.add(this.mainCamera.pos, player.pos, cameraOffset);
        vec3.copy(this.mainCamera.lookat, player.pos);
    }

    /**
     * Determines if there exists a clear line of sight between (sx,sy) and (tx,ty) with maximum distance d
     * @param {number} sx - start x
     * @param {number} sy - start y
     * @param {number} tx - target x
     * @param {number} ty - target y
     */
    lineOfSight(sx,sy,tx,ty){
        sx = sx >> 5
        sy = sy >> 5
        tx = tx >> 5
        ty = ty >> 5

        const dx = tx - sx, dy = ty - sy,
            steps = Math.max(Math.abs(dx), Math.abs(dy)),
            xInc = dx / steps,
            yInc = dy / steps,
            tiles = this.level.tiles,
            w = this.level.w

        let x = sx, y = sy, i = steps
        while(i--){
            if(tiles[Math.floor(x) + Math.floor(y) * w] !== 0)
                return false;

            x += xInc
            y += yInc
        }

        return true;
    }

    findPath(sx,sy,tx,ty){
  
    }
}