/**
 * The drawing buffer's height in pixels, shared by every point-sprite shader: an orthographic camera gives no
 * perspective to scale a point by, so a mote's size in metres is turned into pixels with this.
 * `px = metres * projectionMatrix[1][1] * SCREEN_H.value / 2`.
 */
export const SCREEN_H = { value: 720 };
