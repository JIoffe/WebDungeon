//INFO ON VERTEX FORMATS:
//LEVEL VERTEX DATA - 20 Bytes
//Interleaved: 3 * 4 bytes for POSITION (12)
//             2 * 2 bytes, normalized for TEX COORDS (4) => 16
//             4 * 1 byte, signed byte for NORMAL (4) => 20 (3 bytes data, 1 byte padding)
//             4 * 1 byte, signed byte for TANGENT (4) => 24 (3 bytes data, 1 byte padding)

export const VERTEX_STRIDE_ACTORS = 24;
export const VERTEX_WEIGHT_AFFECTORS = 4;

//INTERLEAVED: 3 * 4 bytes for POSITION (12)
//             Four Vertex Groups:
//             4 * (1 byte for vertex group index) => (16)
//             4 * (1 bytes for vertex group weight) => (20)
//             2 * 2 Bytes for TEXCOORDS (24)