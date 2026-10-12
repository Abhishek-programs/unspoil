export type Currency = {
  code: string
  name: string
  decimals: number
  /** Indian-style grouping: 1,50,000 */
  southAsian?: boolean
}

export const CURRENCIES: Currency[] = [
  { code: 'NPR', name: 'Nepalese rupee', decimals: 2, southAsian: true },
  { code: 'INR', name: 'Indian rupee', decimals: 2, southAsian: true },
  { code: 'PKR', name: 'Pakistani rupee', decimals: 2, southAsian: true },
  { code: 'BDT', name: 'Bangladeshi taka', decimals: 2, southAsian: true },
  { code: 'LKR', name: 'Sri Lankan rupee', decimals: 2, southAsian: true },
  { code: 'USD', name: 'US dollar', decimals: 2 },
  { code: 'EUR', name: 'Euro', decimals: 2 },
  { code: 'GBP', name: 'British pound', decimals: 2 },
  { code: 'AUD', name: 'Australian dollar', decimals: 2 },
  { code: 'CAD', name: 'Canadian dollar', decimals: 2 },
  { code: 'NZD', name: 'New Zealand dollar', decimals: 2 },
  { code: 'CHF', name: 'Swiss franc', decimals: 2 },
  { code: 'JPY', name: 'Japanese yen', decimals: 0 },
  { code: 'CNY', name: 'Chinese yuan', decimals: 2 },
  { code: 'HKD', name: 'Hong Kong dollar', decimals: 2 },
  { code: 'SGD', name: 'Singapore dollar', decimals: 2 },
  { code: 'KRW', name: 'South Korean won', decimals: 0 },
  { code: 'THB', name: 'Thai baht', decimals: 2 },
  { code: 'MYR', name: 'Malaysian ringgit', decimals: 2 },
  { code: 'IDR', name: 'Indonesian rupiah', decimals: 0 },
  { code: 'PHP', name: 'Philippine peso', decimals: 2 },
  { code: 'VND', name: 'Vietnamese dong', decimals: 0 },
  { code: 'AED', name: 'UAE dirham', decimals: 2 },
  { code: 'SAR', name: 'Saudi riyal', decimals: 2 },
  { code: 'QAR', name: 'Qatari riyal', decimals: 2 },
  { code: 'KWD', name: 'Kuwaiti dinar', decimals: 3 },
  { code: 'BHD', name: 'Bahraini dinar', decimals: 3 },
  { code: 'OMR', name: 'Omani rial', decimals: 3 },
  { code: 'ILS', name: 'Israeli shekel', decimals: 2 },
  { code: 'TRY', name: 'Turkish lira', decimals: 2 },
  { code: 'ZAR', name: 'South African rand', decimals: 2 },
  { code: 'NGN', name: 'Nigerian naira', decimals: 2 },
  { code: 'KES', name: 'Kenyan shilling', decimals: 2 },
  { code: 'EGP', name: 'Egyptian pound', decimals: 2 },
  { code: 'MAD', name: 'Moroccan dirham', decimals: 2 },
  { code: 'GHS', name: 'Ghanaian cedi', decimals: 2 },
  { code: 'TZS', name: 'Tanzanian shilling', decimals: 2 },
  { code: 'UGX', name: 'Ugandan shilling', decimals: 0 },
  { code: 'BRL', name: 'Brazilian real', decimals: 2 },
  { code: 'MXN', name: 'Mexican peso', decimals: 2 },
  { code: 'ARS', name: 'Argentine peso', decimals: 2 },
  { code: 'CLP', name: 'Chilean peso', decimals: 0 },
  { code: 'COP', name: 'Colombian peso', decimals: 2 },
  { code: 'PEN', name: 'Peruvian sol', decimals: 2 },
  { code: 'SEK', name: 'Swedish krona', decimals: 2 },
  { code: 'NOK', name: 'Norwegian krone', decimals: 2 },
  { code: 'DKK', name: 'Danish krone', decimals: 2 },
  { code: 'PLN', name: 'Polish zloty', decimals: 2 },
  { code: 'CZK', name: 'Czech koruna', decimals: 2 },
  { code: 'HUF', name: 'Hungarian forint', decimals: 0 },
  { code: 'RON', name: 'Romanian leu', decimals: 2 },
  { code: 'RUB', name: 'Russian ruble', decimals: 2 },
  { code: 'UAH', name: 'Ukrainian hryvnia', decimals: 2 },
  { code: 'TWD', name: 'New Taiwan dollar', decimals: 2 },
  { code: 'MMK', name: 'Myanmar kyat', decimals: 2 },
  { code: 'KHR', name: 'Cambodian riel', decimals: 2 },
  { code: 'LAK', name: 'Lao kip', decimals: 0 },
  { code: 'BTN', name: 'Bhutanese ngultrum', decimals: 2, southAsian: true },
  { code: 'MVR', name: 'Maldivian rufiyaa', decimals: 2 },
  { code: 'AFN', name: 'Afghan afghani', decimals: 2 },
]

const BY_CODE = new Map(CURRENCIES.map(c => [c.code, c]))

export function currencyByCode(code: string | null | undefined): Currency {
  return BY_CODE.get((code || 'NPR').toUpperCase()) ?? BY_CODE.get('NPR')!
}
