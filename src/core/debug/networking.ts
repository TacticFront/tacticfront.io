// // src/core/debug/networking.ts

//       for (const [key, value] of Object.entries(gu.updates)) {
//         if (!Array.isArray(value) || value.length === 0) continue;
//         const typeName = GameUpdateType[Number(key)] || key;
//         const byteSize = new TextEncoder().encode(JSON.stringify(value)).length;

//         // Add byteStats to each PlayerUpdate for inspection
//         if (typeName === "Player") {
//           value.forEach((pu) => {
//             let keyBytes = 0;
//             let valueBytes = 0;
//             for (const [k, v] of Object.entries(pu)) {
//               keyBytes += new TextEncoder().encode(k).length;
//               valueBytes += new TextEncoder().encode(
//                 typeof v === "string" ? v : JSON.stringify(v)
//               ).length;
//             }
//             pu.byteStats = { keyBytes, valueBytes, totalBytes: keyBytes + valueBytes };
//           });
//         }

//         // The value array is still logged as a normal array of objects!
//         console.log(
//           `=== ${typeName} Updates (${value.length} items, ${byteSize} bytes) ===`,
//           value
//         );
//       }

//       // gu.updates[GameUpdateType.Player].forEach((pu: PlayerUpdate) => {
//       //   if(!pu.vars) return;
//       //   console.log(
//       //     `player update: ${pu.name} - `, pu.vars
//       //   );
//       // });
