import { BaseActor } from "../base-actor";
/**
 * Wanders aimlessly until players draw near, then chases and attacks relentlessly.
 */
export class AggressiveTrash extends BaseActor{
    constructor(type, pos, angle, state){
        super(pos, angle, state);
        this.type = type;
    }

    update(scene, time, dT){

    }
}