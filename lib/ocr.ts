/**
 * Simulated OCR engine for SpendSense.
 * In a real-world app, this would use Google ML Kit or a specialized Receipt OCR API.
 */

interface OCRResult {
  amount?: number
  merchant?: string
  date?: string
  remarks?: string
}

export async function processReceiptImage(uri: string): Promise<OCRResult> {
  // Simulate network or processing delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Simulate parsing logic based on common Nepali receipt patterns (eSewa/Khalti)
  // For V1, we'll return a semi-random successful parse to demonstrate the flow.
  
  const mockMerchants = ['Daraz Online', 'Foodmandu', 'Big Mart', 'Bhat Bhateni', 'Pathao Dash']
  const randomMerchant = mockMerchants[Math.floor(Math.random() * mockMerchants.length)]
  const randomAmount = Math.floor(Math.random() * 4500) + 150

  return {
    amount: randomAmount,
    merchant: randomMerchant,
    date: new Date().toISOString(),
    remarks: `Scanned from ${uri.split('/').pop()}`,
  }
}
