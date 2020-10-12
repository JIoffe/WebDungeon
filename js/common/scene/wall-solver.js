export class WallSolver{

    //Meshdata is expected to have all "walls" as SOUTH and "corners" and SOUTHWEST
    constructor(meshData){
        this.walls = [];
        this.walltorches = [];
        this.floors = [];
        this.corners = [];

        meshData.submeshes.forEach((m, i) => {
            if(m.name.indexOf('floor') >= 0){
                this.floors.push(i);
            }else if(m.name.indexOf('walltorch') >= 0){
                this.walltorches.push(i);
            }else if(m.name.indexOf('wall') >= 0){
                this.walls.push(i);
            }else if(m.name.indexOf('corner') >= 0){
                this.corners.push(i);
            }
        });
    }

    solve(w, h, tiles){
        //First pass, put walls and corners where they belong
        let actualTiles = new Int8Array(tiles.length << 1).fill(-1);
        for(let x = 0; x < w; ++x){
            for(let y = 0; y < h; ++y){
                let i = x + y * w;

                const tileCenter = !!tiles[i],
                    tileLeft = !!(x > 0 ? tiles[i - 1] : 0),
                    tileRight = !!(x < w - 1 ? tiles[i + 1] : 0),
                    tileUp = !!(y > 0 ? tiles[i - w] : 0),
                    tileDown = !!(y < h - 1 ? tiles[i + w] : 0);

                i = i << 1;
                if(tileCenter){
                    //Middle of room
                    actualTiles[i] = this.floors[0];
                    actualTiles[i+1] = 0;
                }else if(!tileLeft && !tileRight && tileUp && !tileDown){
                    //Wall facing N, below a floor tile
                    actualTiles[i] = this.walls[0];
                    actualTiles[i+1] = 2;
                }else if(!tileLeft && !tileRight && !tileUp && tileDown){
                    //Wall facing S, above a floor tile
                    actualTiles[i] = this.walls[Math.floor(Math.random() * this.walls.length)];
                    actualTiles[i+1] = 0;
                }else if(!tileLeft && tileRight && !tileUp && !tileDown){
                    //Wall facing E, to the left of a floor tile
                    actualTiles[i] = this.walls[0];
                    actualTiles[i+1] = 3;
                }else if(tileLeft && !tileRight && !tileUp && !tileDown){
                    //Wall facing W, to the right of a floor tile
                    actualTiles[i] = this.walls[0];
                    actualTiles[i+1] = 1;
                }else if(tileLeft && !tileRight && tileUp && !tileDown){
                    //Corner facing NW
                    actualTiles[i] = this.corners[0];
                    actualTiles[i+1] = 1;
                }else if(!tileLeft && tileRight && tileUp && !tileDown){
                    //Corner facing NE
                    actualTiles[i] = this.corners[0];
                    actualTiles[i+1] = 2;
                }else if(tileLeft && !tileRight && !tileUp && tileDown){
                    //Corner facing SW
                    actualTiles[i] = this.corners[0];
                    actualTiles[i+1] = 0;
                }else if(!tileLeft && tileRight && !tileUp && tileDown){
                    //Corner facing SE
                    actualTiles[i] = this.corners[0];
                    actualTiles[i+1] = 3;
                }
            }
        }

        return actualTiles;
    }
}