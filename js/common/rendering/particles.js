import { BufferWrapper } from "../util/array-buffer-wrapper";
import { VERTEX_STRIDE_PARTICLES } from "./mesh/mesh-constants";

export function makeParticleBuffer(gl, maxParticles){
    const bufferSize = maxParticles * VERTEX_STRIDE_PARTICLES * 4;

    let arrayIndex = 0;
    const indexArray = new Uint16Array(maxParticles * 6);
    const buffer = new BufferWrapper(bufferSize);

    for(let i = 0; i < maxParticles; ++i){
        buffer.addInt8(-1, 1)
        buffer.addUint16(i)

        buffer.addInt8(1, 1)
        buffer.addUint16(i)

        buffer.addInt8(-1, -1)
        buffer.addUint16(i)

        buffer.addInt8(1, -1)
        buffer.addUint16(i)

        const offset = i * 4;
        indexArray[arrayIndex++] = offset + 0
        indexArray[arrayIndex++] = offset + 1
        indexArray[arrayIndex++] = offset + 2
        indexArray[arrayIndex++] = offset + 2
        indexArray[arrayIndex++] = offset + 1
        indexArray[arrayIndex++] = offset + 3
    }

    const vbo = gl.createBuffer(),
        ibo = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, buffer.buffer, gl.STATIC_DRAW);

    return [ibo, vbo]
}

export const ParticleDefs = {
    blood0: {
        mat: 'blood0',
        gravity: 0.00002,
        minPower: 0.04,
        maxPower: 0.08,

        startSize: 4,
        endSize: 0,

        minLifetime: 200.0,
        maxLifetime: 400.0,

        emissionRate: 0, //One Shot 
        spread: 0.15,

        lifetime: 400
    }
}