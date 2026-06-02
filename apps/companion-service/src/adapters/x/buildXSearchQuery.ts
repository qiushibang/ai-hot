/**
 * Build an X search query from a keyword and target account list.
 *
 * When targetAccounts is empty, returns the keyword as-is (existing behavior).
 * When targetAccounts is provided, wraps them in `from:user1 OR from:user2` syntax.
 * If a keyword is also provided, it's appended after the from-clause.
 */
export const buildXSearchQuery = (
  keyword: string,
  targetAccounts: string[]
): string => {
  const trimmedKeyword = keyword.trim()
  const accounts = targetAccounts.map((a) => a.trim()).filter(Boolean)

  if (accounts.length === 0) {
    return trimmedKeyword.length > 0 ? trimmedKeyword : 'AI'
  }

  const fromClause = accounts
    .map((account) => `from:${account}`)
    .join(' OR ')

  if (trimmedKeyword.length === 0) {
    return `(${fromClause})`
  }

  return `(${fromClause}) ${trimmedKeyword}`
}