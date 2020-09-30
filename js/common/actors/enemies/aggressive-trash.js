import { ARM_CRABBY } from "../../constants/armatures";
import { Animations } from "../../rendering/animation";
import { BaseActor } from "../base-actor";
/**
 * Wanders aimlessly until players draw near, then chases and attacks relentlessly.
 */
const trashTable = {
    crabby: [ARM_CRABBY]
};

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

        if(this.state !== this.prevState){
            switch(this.state){
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