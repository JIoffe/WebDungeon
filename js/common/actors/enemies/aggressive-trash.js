import { ARM_CRABBY } from "../../constants/armatures";
import { lerp, sqDist2D } from "../../math";
import { Animations } from "../../rendering/animation";
import { PLAYER_RADIUS } from "../../scene/scene";
import { BaseActor } from "../base-actor";
/**
 * Wanders aimlessly until players draw near, then chases and attacks relentlessly.
 */
const trashTable = {
    crabby: [ARM_CRABBY]
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
                if(d >= ATTACK_DIST && d <= AGRO_DIST){
                    this.state = 1;
                }
                break;
            }
            case 1:
            {
                const target = scene.localPlayer;
                const d = sqDist2D(this.pos, target.pos);
                if(d <= ATTACK_DIST){
                    this.state = 0;
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

                //this.pos[0] += dX;
                //this.pos[2] += dY;
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
                case 0:
                default:
                    this.anim.set('Idle', 0.02);
                    break;
            }
            this.prevState = this.state;
        }

        //Loop or one shot animation as appropriate
        switch(this.state){
            default:
                this.anim.loop(dT);
                break;

        }
    }
}