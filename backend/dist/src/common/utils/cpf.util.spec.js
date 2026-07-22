"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cpf_util_1 = require("./cpf.util");
describe('CPF utilities', () => {
    it.each([
        ['529.982.247-25', '52998224725'],
        [' 529 982 247 25 ', '52998224725'],
        ['52998224725', '52998224725'],
    ])('normaliza %s', (input, expected) => {
        expect((0, cpf_util_1.normalizeCpf)(input)).toBe(expected);
    });
    it.each(['529.982.247-25', '111.444.777-35', '12345678909'])('aceita CPF com checksum válido: %s', (cpf) => expect((0, cpf_util_1.isValidCpf)(cpf)).toBe(true));
    it.each(['', '123', '111.111.111-11', '529.982.247-24', '00000000000'])('rejeita CPF inválido: %s', (cpf) => expect((0, cpf_util_1.isValidCpf)(cpf)).toBe(false));
    it('mascara o CPF sem expor os dígitos iniciais e verificadores', () => {
        expect((0, cpf_util_1.maskCpf)('529.982.247-25')).toBe('***.982.247-**');
        expect((0, cpf_util_1.maskCpf)('inválido')).toBe('***.***.***-**');
    });
});
//# sourceMappingURL=cpf.util.spec.js.map