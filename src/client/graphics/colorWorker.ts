// // src/client/graphics/colorWorker.ts

// self.onmessage = (e) => {
//   const { imageData, colorA, colorB, colorC } = e.data;

//   const buffer = new Uint32Array(imageData.data.buffer);

//   const rgbToUint32 = (r: number, g: number, b: number, a = 255) =>
//     (a << 24) | (b << 16) | (g << 8) | r;

//   const gray180 = rgbToUint32(180, 180, 180);
//   const gray70 = rgbToUint32(70, 70, 70);
//   const gray130 = rgbToUint32(130, 130, 130);

//   const a32 = rgbToUint32(colorA.r, colorA.g, colorA.b);
//   const b32 = rgbToUint32(colorB.r, colorB.g, colorB.b);
//   const c32 = rgbToUint32(colorC.r, colorC.g, colorC.b);

//   for (let i = 0; i < buffer.length; i++) {
//     if (buffer[i] === gray180) buffer[i] = a32;
//     else if (buffer[i] === gray70) buffer[i] = b32;
//     else if (buffer[i] === gray130) buffer[i] = c32;
//   }

//   self.postMessage(imageData, [imageData.data.buffer]);
// };
