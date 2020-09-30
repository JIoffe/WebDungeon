import { vec3 } from "gl-matrix";

export class BaseActor{
    constructor(pos, angle, state){
        this.pos = pos || vec3.create();
        this.state = state || 0;
        this.angle = angle || 0;
    }

    update(scene, time, dT){

    }
}