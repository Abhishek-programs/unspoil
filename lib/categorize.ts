// Auto-categorization (priority order):
// 1. Keyword word match — keyword appears in title (description) or extra detail (merchant).
// 2. Sure-shot merchant — exact merchant name → mapped bucket.
// 3. Fallback — fallback bucket, mark as flagged.

function buildCorpus(description: string | null, merchant: string | null): string {
  return [description, merchant]
    .filter((t): t is string => !!t && !t.startsWith('__'))
    .join(' ')
    .toLowerCase()
}

export function categorize(opts: {
  description?: string | null
  merchant: string | null
  keywords: { keyword: string; bucketId: string }[]
  sureShotMerchants: { merchantName: string; bucketId: string }[]
  fallbackBucketId: string
}): { bucketId: string; isFlagged: boolean } {
  const { description = null, merchant, keywords, sureShotMerchants, fallbackBucketId } = opts

  const corpus = buildCorpus(description, merchant)

  if (corpus) {
    for (const mapping of keywords) {
      const kw = mapping.keyword.toLowerCase().trim()
      if (kw && corpus.includes(kw)) {
        return { bucketId: mapping.bucketId, isFlagged: false }
      }
    }
  }

  const sureShotKeys = [merchant, description]
    .map(t => t?.toLowerCase().trim())
    .filter((t): t is string => !!t)
  for (const key of sureShotKeys) {
    const sureShot = sureShotMerchants.find(
      m => m.merchantName.toLowerCase().trim() === key,
    )
    if (sureShot) {
      return { bucketId: sureShot.bucketId, isFlagged: false }
    }
  }

  return { bucketId: fallbackBucketId, isFlagged: true }
}
