import { fromRotationTranslation } from "gl-matrix/src/gl-matrix/mat4";

/**
 * Zips a list of data arrays into a single data buffer
 */
export function zip(...data){
    const descriptor = data[0];
    // descriptor = [
    //     # of primitives,
    //     # of data portions
    //     count of first,
    //     size of first per data element (in bytes)
    //     littleEndian,
    //     normalize?

    //     count of second,
    //     size of second per data element (in bytes)
    //     littleEndian,
    //     normalize?

    //     etc.
    // ]

    let byteSize = 0;


    for(let i = descriptor[0] - 1; i >= 0; --i){

    }
}