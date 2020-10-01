import { vec3 } from "gl-matrix";

export const VEC3_UP = new Float32Array([0,1,0]);
export const VEC3_DOWN = new Float32Array([0,-1,0]);
export const VEC3_FORWARD = new Float32Array([0,0,-1]);
export const VEC3_BACKWARD = new Float32Array([0,0,1]);
export const VEC3_LEFT = new Float32Array([-1,0,0]);
export const VEC3_RIGHT = new Float32Array([1,0,0]);
export const VEC3_ZERO = new Float32Array([0,0,0]);
export const VEC3_TEMP = vec3.create();

export const RadToDeg = 57.295779513082320876798154814105;    // 180 / Pi
export const DegToRad = 0.01745329251994329576923690768489;     //Pi / 180
export const HalfPi = Math.PI / 2;

export function moveRelativeZ(pos, rot, dZ){
    vec3.transformQuat(VEC3_TEMP, VEC3_FORWARD, rot);
    pos[0] += VEC3_TEMP[0] * dZ;
    pos[1] += VEC3_TEMP[1] * dZ;
    pos[2] += VEC3_TEMP[2] * dZ;
}

export function moveRelativeX(pos, rot, dX){
    vec3.transformQuat(VEC3_TEMP, VEC3_RIGHT, rot);
    pos[0] += VEC3_TEMP[0] * dX;
    pos[1] += VEC3_TEMP[1] * dX;
    pos[2] += VEC3_TEMP[2] * dX;
}

export function moveRelativeY(pos, rot, dY){
    vec3.transformQuat(VEC3_TEMP, VEC3_UP, rot);
    pos[0] += VEC3_TEMP[0] * dY;
    pos[1] += VEC3_TEMP[1] * dY;
    pos[2] += VEC3_TEMP[2] * dY;
}

export function lerp(a,b,s){
    return a + (b - a) * s;
}

/**
 * Returns the squared distance along the XZ plane between two vec3s
 * @param {vec3} a 
 * @param {vec3} b 
 */
export function sqDist2D(a,b){
    const dx = a[0]-b[0], dy = a[2]-b[2]
    return dx*dx + dy*dy;
}