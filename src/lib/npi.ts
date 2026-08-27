const LUHN_PREFIX = '80840';

export function isValidNpi(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;

  const digits = `${LUHN_PREFIX}${value}`.split('').map(Number);
  let sum = 0;
  const parity = digits.length % 2;

  for (let index = 0; index < digits.length; index += 1) {
    let digit = digits[index];
    if (index % 2 === parity) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  return sum % 10 === 0;
}
