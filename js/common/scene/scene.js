import { MessageBus } from "../messaging/message-bus";
import { MessageType } from "../messaging/message-type";
import { Animations } from "../rendering/animation";
import { Input } from "../input/input";
import { Camera } from "../camera";
import { vec3, quat } from "gl-matrix";
import { RadToDeg, DegToRad, sqDist2D, sqDist } from "../math";
import { PlayerState } from "./player-state";
import { ARM_PLAYER } from "../constants/armatures";
import { ActorFactory } from "../actors/actor-factory";

const PLAYER_SPEED = 0.04;
const PLAYER_SLERP_SPEED = 0.3;
export const PLAYER_RADIUS = 8;
export const ACTOR_SQ_RADIUS = PLAYER_RADIUS*PLAYER_RADIUS;

const SLASH_RADIUS = 16;
const SLASH_SQ_RADIUS = SLASH_RADIUS*SLASH_RADIUS;
const SLASH_FOV = 0.7;

const cameraOffset = vec3.fromValues(0, 100, 30);
const VEC3_UP = new Float32Array([0,1,0]);

export class Scene{
    constructor(){
        this.players = [];
        this.actors = [];
        this.pveAttacks = [];

        this.localPlayer = null;
        this.mainCamera = new Camera();
        this.time = 0;

        this.effects = [];

        MessageBus.subscribe(MessageType.PLAYER_ADDED, data => this.onPlayerAdded(data))
        MessageBus.subscribe(MessageType.ACTOR_ADDED, data => this.onActorAdded(data));
        MessageBus.subscribe(MessageType.PARTICLESYSTEM_ADDED, data => this.onParticleSystemAdded(data));
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

        player.lookX = 0
        player.lookY = 1

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

    onParticleSystemAdded(data){
        if(!data)
            return;

        data.startTime = this.time;
        this.effects.push(data);
    }

    update(time, dT){
        this.time = time;
        if(!!this.localPlayer){
            switch(this.localPlayer.state){
                case PlayerState.MATTACK:
                {
                    if(!this.localPlayer.anim.isPlaying){
                        this.localPlayer.state = PlayerState.IDLE;
                    }else{
                        if(!this.localPlayer.didAttack && this.localPlayer.anim.frame >= 10){
                            this.attackEnemiesCone(this.localPlayer.pos[0], this.localPlayer.pos[2], SLASH_SQ_RADIUS, this.lookX, this.lookY, SLASH_FOV, 1);
                            this.localPlayer.didAttack = true;
                        }
                    }
                    break;
                }

                case PlayerState.IDLE:
                case PlayerState.RUNNING:
                default: 
                {
                    if(Input.state[4]){
                        this.localPlayer.state = PlayerState.MATTACK;
                        this.localPlayer.didAttack = false;
                    }else{
                        let velX = Input.axisH,
                            velY = -Input.axisV;
            
                        if(!!velX || !!velY){
                            //Normalize
                            const w = 1/Math.sqrt(velX*velX + velY*velY);
                            velX *= w;
                            velY *= w;

                            this.lookX = velX
                            this.lookY = velY

                            this.move(this.localPlayer, dT * velX * PLAYER_SPEED, dT * velY * PLAYER_SPEED, PLAYER_RADIUS);

                            const angle = Math.atan2(-velY, velX) + 1.5707963267948966;
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
    move(actor,dx,dy,r){
        //Attempts to update position with desired delta, while responding to environment
        //let a,b,c be scan points
        //Check Y and X axes separately
        const pos = actor.pos

        let a = (pos[0] - r) >> 5,
            b = (pos[0] + r) >> 5,
            c = (pos[2] + dy + (dy > 0 ? r : -r)) >> 5

        let i = a + c * this.level.w
        if(this.level.tiles[i] !== 0 || (a !== b && this.level.tiles[i+1] !== 0)){
            dy = 0;
        }

        a = (pos[2] - r) >> 5
        b = (pos[2] + r) >> 5
        c = (pos[0] + dx + (dx > 0 ? r : -r)) >> 5

        i = c + a * this.level.w
        if(this.level.tiles[i] !== 0 || (a !== b && this.level.tiles[i+this.level.w] !== 0)){
            dx = 0;
        }

        pos[0] += dx
        pos[2] += dy

        //clip against actors
        i = this.actors.length;
        while(i--){
            //Ignore dead things and self
            const actor2 = this.actors[i]
            if(actor2.state == 2 || actor2 === actor)
                continue;
                
            const p2 = actor2.pos
            if(sqDist(pos[0], pos[2] + dy, p2[0], p2[2]) < ACTOR_SQ_RADIUS){
                dx = pos[0] - p2[0], dy = pos[2] - p2[2]
                const w = PLAYER_RADIUS/Math.sqrt(dx*dx+dy*dy)
                pos[0] = p2[0] + dx * w
                pos[2] = p2[2] + dy * w
                break;
            }         
        }
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

    attackEnemiesCone(x,y,sqr,dirX,dirY,fov,amt){
        let i = this.actors.length
        while(i--){
            const act = this.actors[i]
            
            let dx = act.pos[0] - x,
                dy = act.pos[2] - y,
                d = dx*dx+dy*dy;
            
            if(d <= ACTOR_SQ_RADIUS + sqr){
                const w = 1/Math.sqrt(d)
                dx *= w
                dy *= w

                const dot = dx*dirX+dy*dirY;
                if(dot >= fov){
                    act.damage(amt, dirX, dirY)
                }
            }
        }
    }
}