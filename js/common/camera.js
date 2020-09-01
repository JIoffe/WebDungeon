import { vec3, quat, mat4 } from "gl-matrix";
import { DegToRad } from "./math";

const NEAR_CLIP = 0.1;
const FAR_CLIP = 100;
const FOV = 60;

export class Camera{
    constructor(pos, rot){
        this.pos = pos || vec3.create();
        this.rot = rot || quat.create();

        //For FPS style camera instead of tumbling around
        this.rotXEuler = 0;
        this.rotYEuler = 0;

        this._viewMatrix = mat4.create();
        this.projMatrix = mat4.create();

        this.near = NEAR_CLIP;
        this.far = FAR_CLIP;
        this.fov = FOV;
    }

    adjustToMouse(dX, dY){
        this.rotXEuler += dX;
        this.rotYEuler += dY;
        quat.fromEuler(this.rot, this.rotXEuler, this.rotYEuler, 0);
    }

    projectToView(w, h){
        const aspect = w / h;
        return mat4.perspective(this.projMatrix, this.fov * DegToRad, aspect, this.near, this.far);
    }

    
    get viewMatrix(){
        mat4.fromRotationTranslation(this._viewMatrix, this.rot, this.pos);
        return mat4.invert(this._viewMatrix, this._viewMatrix);
    }

    refreshViewMatrix(){
        
    }
// // Pitch must be in the range of [-90 ... 90] degrees and 
// // yaw must be in the range of [0 ... 360] degrees.
// // Pitch and yaw variables must be expressed in radians.
// mat4 FPSViewRH( vec3 eye, float pitch, float yaw )
// {
//     // I assume the values are already converted to radians.
//     float cosPitch = cos(pitch);
//     float sinPitch = sin(pitch);
//     float cosYaw = cos(yaw);
//     float sinYaw = sin(yaw);
 
//     vec3 xaxis = { cosYaw, 0, -sinYaw };
//     vec3 yaxis = { sinYaw * sinPitch, cosPitch, cosYaw * sinPitch };
//     vec3 zaxis = { sinYaw * cosPitch, -sinPitch, cosPitch * cosYaw };
 
//     // Create a 4x4 view matrix from the right, up, forward and eye position vectors
//     mat4 viewMatrix = {
//         vec4(       xaxis.x,            yaxis.x,            zaxis.x,      0 ),
//         vec4(       xaxis.y,            yaxis.y,            zaxis.y,      0 ),
//         vec4(       xaxis.z,            yaxis.z,            zaxis.z,      0 ),
//         vec4( -dot( xaxis, eye ), -dot( yaxis, eye ), -dot( zaxis, eye ), 1 )
//     };
     
//     return viewMatrix;
// }
    // update(){
    //     mat4.lookAt(this.matrix, this.pos, )
    // }
}