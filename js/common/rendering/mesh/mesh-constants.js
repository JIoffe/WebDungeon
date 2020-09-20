//INFO ON VERTEX FORMATS:
export const VERTEX_STRIDE_STATIC = 20

//LEVEL VERTEX DATA - 16 BYTES
//Interleaved: 3 * 4 bytes for POSITION (12)
//             2 * 2 bytes, normalized for TEX COORDS (4) => 16
//             3 * 1 byte for NORMAL (19)
//             1 byte PADDING (20)

export const VERTEX_STRIDE_ACTORS = 28;
export const VERTEX_WEIGHT_AFFECTORS = 4;

//INTERLEAVED: 3 * 4 bytes for POSITION (12)
//             Four Vertex Groups:
//             4 * (1 byte for vertex group index) => (16)
//             4 * (1 bytes for vertex group weight) => (20)
//             2 * 2 Bytes for TEXCOORDS (24)
//             3 * 1 byte for NORMAL (27)
//             1 byte PADDING (28)