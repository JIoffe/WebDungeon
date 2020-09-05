/**
 * Wraps a GL data or index buffer that able to be updated occasionally. Will grow to fit if necessary (TODO)
 */
const DEFAULT_POOL_ALLOCATION = 524288; // 1/2 megabyte

export class PooledBuffer{
    constructor(gl, target, size){
        this.gl = gl;
        this.target = target;

        if(!size){
            size = DEFAULT_POOL_ALLOCATION;
        }

        this.capacity = size;

        const buffer = gl.createBuffer();
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, size, gl.STATIC_DRAW);

        this.buffer = buffer;
        this.cursor = 0;
    }

    append(src){
        length = src.byteLength;
        if(this.cursor + length >= this.capacity){
            console.warn(`Pooled buffer capacity exceeded. Capacity: ${this.capacity} Cursor: ${this.cursor} Length: ${length}`);
            throw 'BUFFER OVERFLOW'; //TODO GROW
        }

        this.gl.bindBuffer(this.target, this.buffer);
        this.gl.bufferSubData(this.target, this.cursor, src);

        this.cursor += length;
    }
}