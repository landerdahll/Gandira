import { isValidCpf, maskCpf, normalizeCpf } from './cpf.util';

describe('CPF utilities', () => {
  it.each([
    ['529.982.247-25', '52998224725'],
    [' 529 982 247 25 ', '52998224725'],
    ['52998224725', '52998224725'],
  ])('normaliza %s', (input, expected) => {
    expect(normalizeCpf(input)).toBe(expected);
  });

  it.each(['529.982.247-25', '111.444.777-35', '12345678909'])(
    'aceita CPF com checksum válido: %s',
    (cpf) => expect(isValidCpf(cpf)).toBe(true),
  );

  it.each(['', '123', '111.111.111-11', '529.982.247-24', '00000000000'])(
    'rejeita CPF inválido: %s',
    (cpf) => expect(isValidCpf(cpf)).toBe(false),
  );

  it('mascara o CPF sem expor os dígitos iniciais e verificadores', () => {
    expect(maskCpf('529.982.247-25')).toBe('***.982.247-**');
    expect(maskCpf('inválido')).toBe('***.***.***-**');
  });
});
