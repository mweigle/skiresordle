import { createHash } from "crypto";

const resortName = "Silvretta Arena Ischgl/Samnaun";

const bytes = createHash("sha256")
    .update(resortName, "utf8")
    .digest();

const number = bytes.readUInt32BE(0);
console.log("number", number);

// ------ 

const hexString = (number >>> 0).toString(10).padStart(10, "0");

console.log("hex string", hexString);

// ------
const parsedNum = Number(hexString);
console.log("is id?", Number.isFinite(parsedNum));

console.log("parsed number", parsedNum);
console.assert(number === parsedNum);