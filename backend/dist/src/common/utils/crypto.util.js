"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecureToken = generateSecureToken;
exports.slugify = slugify;
exports.timingSafeEqual = timingSafeEqual;
const crypto_1 = require("crypto");
function generateSecureToken(bytes = 32) {
    return (0, crypto_1.randomBytes)(bytes).toString('hex');
}
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
function timingSafeEqual(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length)
        return false;
    return bufA.equals(bufB);
}
//# sourceMappingURL=crypto.util.js.map