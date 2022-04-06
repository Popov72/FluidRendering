/**
 * From https://github.com/matthias-research/pages/blob/master/tenMinutePhysics/11-hashing.html
 */

export class Hash {
    private _spacing: number;
    private _tableSize: number;
    private _cellStart: Int32Array;
    private _cellEntries: Int32Array;
    private _queryIds: Int32Array;
    private _querySize: number;

    public get querySize() {
        return this._querySize;
    }

    public get queryIds() {
        return this._queryIds;
    }

    constructor(spacing: number, maxNumObjects: number) {
        this._spacing = spacing;
        this._tableSize = 2 * maxNumObjects;
        this._cellStart = new Int32Array(this._tableSize + 1);
        this._cellEntries = new Int32Array(maxNumObjects);
        this._queryIds = new Int32Array(maxNumObjects);
        this._querySize = 0;
    }

    public hashCoords(xi: number, yi: number, zi: number) {
        const h = (xi * 92837111) ^ (yi * 689287499) ^ (zi * 283923481); // fantasy function
        //const h = (xi * 73856093) ^ (yi * 19349663) ^ (zi * 83492791); // fantasy function
        return Math.abs(h) % this._tableSize;
    }

    public intCoord(coord: number) {
        return Math.floor(coord / this._spacing);
    }

    public hashPos(pos: number[] | Float32Array, nr: number) {
        return this.hashCoords(
            this.intCoord(pos[3 * nr]),
            this.intCoord(pos[3 * nr + 1]),
            this.intCoord(pos[3 * nr + 2])
        );
    }

    public create(pos: number[] | Float32Array) {
        const numObjects = Math.min(pos.length / 3, this._cellEntries.length);

        // determine cell sizes
        this._cellStart.fill(0);
        this._cellEntries.fill(0);

        for (let i = 0; i < numObjects; i++) {
            const h = this.hashPos(pos, i);
            this._cellStart[h]++;
        }

        // determine cells starts
        let start = 0;
        for (let i = 0; i < this._tableSize; i++) {
            start += this._cellStart[i];
            this._cellStart[i] = start;
        }
        this._cellStart[this._tableSize] = start; // guard

        // fill in objects ids
        for (let i = 0; i < numObjects; i++) {
            const h = this.hashPos(pos, i);
            this._cellStart[h]--;
            this._cellEntries[this._cellStart[h]] = i;
        }
    }

    public query(pos: number[] | Float32Array, nr: number, maxDist: number) {
        const x0 = this.intCoord(pos[3 * nr] - maxDist);
        const y0 = this.intCoord(pos[3 * nr + 1] - maxDist);
        const z0 = this.intCoord(pos[3 * nr + 2] - maxDist);

        const x1 = this.intCoord(pos[3 * nr] + maxDist);
        const y1 = this.intCoord(pos[3 * nr + 1] + maxDist);
        const z1 = this.intCoord(pos[3 * nr + 2] + maxDist);

        this._querySize = 0;

        for (let xi = x0; xi <= x1; xi++) {
            for (let yi = y0; yi <= y1; yi++) {
                for (let zi = z0; zi <= z1; zi++) {
                    const h = this.hashCoords(xi, yi, zi);
                    const start = this._cellStart[h];
                    const end = this._cellStart[h + 1];

                    for (let i = start; i < end; i++) {
                        this._queryIds[this._querySize] = this._cellEntries[i];
                        this._querySize++;
                    }
                }
            }
        }
    }
}
