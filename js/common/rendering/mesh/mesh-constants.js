//INFO ON VERTEX FORMATS:
export const VERTEX_STRIDE_STATIC = 16

//LEVEL VERTEX DATA - 16 BYTES
//Interleaved: 3 * 4 bytes for POSITION (12)
//             2 * 2 bytes, normalized for TEX COORDS (4) => 16

export const VERTEX_STRIDE_ACTORS = 24;
export const VERTEX_WEIGHT_AFFECTORS = 4;

//INTERLEAVED: 3 * 4 bytes for POSITION (12)
//             Four Vertex Groups:
//             4 * (1 byte for vertex group index) => (16)
//             4 * (1 bytes for vertex group weight) => (20)
//             2 * 2 Bytes for TEXCOORDS (24)