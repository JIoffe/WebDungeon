import { vec3, quat, mat4 } from "gl-matrix";
import { DegToRad, VEC3_UP } from "./math";

const NEAR_CLIP = 0.1;
const FAR_CLIP = 1000;
const FOV = 60;

export class Camera{
    constructor(){
        this.pos = vec3.create();
        this.pos[2] = 60;
        this.pos[1] = 40;

        this.lookat = vec3.create();

        this._viewMatrix = mat4.create();
        this.projMatrix = mat4.create();

        this.near = NEAR_CLIP;
        this.far = FAR_CLIP;
        this.fov = FOV;
    }

    projectToView(w, h){
        const aspect = w / h;
        return mat4.perspective(this.projMatrix, this.fov * DegToRad, aspect, this.near, this.far);
    }

    
    get viewMatrix(){
        return mat4.lookAt(this._viewMatrix, this.pos, this.lookat, VEC3_UP);
    }
}