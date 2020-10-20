import { vec3 } from "gl-matrix";
import { ARM_CRABBY, ARM_SPIDER } from "../../constants/armatures";
import { sqDist2D } from "../../math";
import { MessageBus } from "../../messaging/message-bus";
import { MessageType } from "../../messaging/message-type";
import { Animations } from "../../rendering/animation";
import { PLAYER_RADIUS } from "../../scene/scene";
import { BaseActor } from "../base-actor";
/**
 * Wanders aimlessly until players draw near, then chases and attacks relentlessly.
 */
const trashTable = {
    crabby: [ARM_CRABBY, 2, 8],
    spider: [ARM_SPIDER, 2, 16]
};

const AGRO_DIST = 2600;
const ATTACK_DIST = 100;

const VEC3_UP = new Float32Array([0,1,0]);

//STATES
// 0 - Idle / do nothing
// 1 - chase
export class AggressiveTrash extends BaseActor{
    constructor(type, pos, angle, state){
        super(pos, angle, state);
        this.type = type;

        const tableEntry = trashTable[type];
        this.anim = Animations.getInstance(tableEntry[0]);
        this.hp = tableEntry[1];
        this.maxHP = this.hp;

        this.r = tableEntry[2];
        this.r2 = tableEntry[2]*tableEntry[2];
    }

    update(scene, time, dT){
        const tableEntry = trashTable[this.type];

        if(!this.anim.animations){
            Animations.refreshInstance(this.anim, tableEntry[0]);
            return; //Can't see this, don't do anything
        }

        switch(this.state){
            case 0:
            {
                const target = scene.localPlayer;
                const d = sqDist2D(this.pos, target.pos);
                if(d <= AGRO_DIST){
                    this.state = d <= ATTACK_DIST ? 3 : 1
                }
                break;
            }
            case 1:
            {
                const target = scene.localPlayer;
                const d = sqDist2D(this.pos, target.pos);
                if(d <= ATTACK_DIST){
                    this.state = 0
                    break;
                }

                let dX = 0, dY = 0;
                //if(scene.lineOfSight(this.pos[0], this.pos[2], target.pos[0], target.pos[2])){
                    dX = target.pos[0] - this.pos[0];
                    dY = target.pos[2] - this.pos[2];
                //}
                
                //Turn into vector for movement and face direction
                this.angle = Math.atan2(-dY, dX) + 1.5707963267948966;
                const w = (0.02 * dT) / Math.sqrt(dX*dX + dY*dY);
                dX *= w;
                dY *= w;

                scene.move(this, dX, dY, PLAYER_RADIUS);
                break;
            }
            case 3:
            {
                if(!this.anim.isPlaying)
                    this.state = 0
                break;
            }
            default:
                break;
        }

        if(this.state !== this.prevState){
            switch(this.state){
                case 1:
                    this.anim.set('Walk', 0.06);
                    break;
                case 2:
                    this.anim.set('Death', 0.02);
                    break;
                case 3:
                    this.anim.set('Attack', 0.04);
                    break;
                case 0:
                default:
                    this.anim.set('Idle', 0.02);
                    break;
            }
            this.prevState = this.state;
        }

        //Loop or one shot animation as appropriate
        switch(this.state){
            case 2:
            case 3:
                this.anim.play(dT);
                break;
            default:
                this.anim.loop(dT);
                break;

        }
    }

    damage(amt, dx, dy){
        //Compute Blood splatter direction
        const bloodDir = vec3.fromValues(dx, 0.5, dy)
        vec3.normalize(bloodDir, bloodDir)

        MessageBus.post(MessageType.PARTICLESYSTEM_ADDED, {
            type: 'blood0',
            pos: this.pos,
            dir: bloodDir
        })

        this.hp -= amt;
        if(this.hp <= 0 ){
            this.hp = 0
            this.state = 2;
        }
    }
}