export class LevelGeometry{
    constructor(){
        this.indexBuffer = null;
        this.vertexBuffer = null;
        this.indexCount = 0;
    }

    setData(gl){
        this.indexBuffer = this.indexBuffer || gl.createBuffer();
        this.vertexBuffer = this.vertexBuffer || gl.createBuffer();

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, dataBuffer, this.gl.STATIC_DRAW);
    }
}