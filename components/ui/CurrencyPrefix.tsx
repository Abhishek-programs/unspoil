import { StyleProp, Text, TextStyle } from 'react-native'
import { usePlaybookStore } from '@/store/playbook'

export function CurrencyPrefix({ style }: { style?: StyleProp<TextStyle> }) {
  const currency = usePlaybookStore(s => s.currency)
  return <Text style={style}>{currency || 'NPR'}</Text>
}
