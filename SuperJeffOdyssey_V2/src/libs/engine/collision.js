import { collision } from './../../globals.js';

export function supportHeightAtXZ(x, z, y, shapes, defaultHeight = 0) {
    let maxY = defaultHeight;

    shapes.forEach(wrapper => {
        const shape = wrapper.shape || wrapper;
        const h = collision.heightAtXZ(shape, x, z);

        if (h === null) return;

        if (h <= y && h > maxY) {
            maxY = h;
        }
    });

    return maxY;
}
