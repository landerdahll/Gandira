"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCpf = normalizeCpf;
exports.maskCpf = maskCpf;
exports.isValidCpf = isValidCpf;
const CPF_LENGTH = 11;
function normalizeCpf(value) {
    return value.replace(/\D/g, '');
}
function maskCpf(value) {
    const cpf = normalizeCpf(value);
    if (cpf.length !== CPF_LENGTH)
        return '***.***.***-**';
    return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}
function calculateCheckDigit(base, factor) {
    const sum = base
        .split('')
        .reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
}
function isValidCpf(value) {
    const cpf = normalizeCpf(value);
    if (cpf.length !== CPF_LENGTH || /^(\d)\1{10}$/.test(cpf))
        return false;
    const firstDigit = calculateCheckDigit(cpf.slice(0, 9), 10);
    const secondDigit = calculateCheckDigit(`${cpf.slice(0, 9)}${firstDigit}`, 11);
    return cpf === `${cpf.slice(0, 9)}${firstDigit}${secondDigit}`;
}
//# sourceMappingURL=cpf.util.js.map