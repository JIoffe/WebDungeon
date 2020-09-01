export class BufferWrapper{
    constructor(numBytes){
        this.buffer = new ArrayBuffer(numBytes);
        this.dv = new DataView(this.buffer);

        this.cursor = 0;
    }

    addFloat32(...val){
        for(let i = 0; i < val.length; ++i){
            this.dv.setFloat32(this.cursor, val[i], true);
            this.cursor += 4;
        }
    }

    
    addFloatAsUint16(...val){
        for(let i = 0; i < val.length; ++i){
            this.dv.setUint16(this.cursor, val[i] * 0xFFFF, true);
            this.cursor += 2;
        }
    }

    addFloatAsUint8(...val){
        for(let i = 0; i < val.length; ++i){
            this.dv.setUint8(this.cursor, val[i] * 0xFF);
            this.cursor += 1;
        }
    }

    addFloatAsInt8(...val){
        for(let i = 0; i < val.length; ++i){
            this.dv.setInt8(this.cursor, val[i] * 0x7F);
            this.cursor += 1;
        }
    }

    addUint16(...val){
        for(let i = 0; i < val.length; ++i){
            this.dv.setUint16(this.cursor, val[i], true);
            this.cursor += 2;
        }
    }

    addUint8(...val){
        for(let i = 0; i < val.length; ++i){
            this.dv.setUint8(this.cursor, val[i]);
            this.cursor += 1;
        }
    }
    addInt8(...val){
        for(let i = 0; i < val.length; ++i){
            this.dv.setInt8(this.cursor, val[i]);
            this.cursor += 1;
        }
    }
}